import { decide, evaluateInvoice, explain, invCOP, money } from "./rules";
import { log, store, uid, updateInvoice } from "./store";
import type { Check, Invoice, Receipt } from "./types";

export type AgentListener = {
  onCheck: (c: Check) => void;
  onText: (kind: "r" | "o" | "e", d: string) => void;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sha(obj: unknown) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(obj)));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeReceipt(inv: Invoice, method: Receipt["method"], approver?: string, justification?: string): Promise<Receipt> {
  const at = new Date().toISOString();
  const id = uid("ALDIA-DSB");
  const hash = await sha({ issuer: "AL DIA", id, at, inv: inv.id, amount: inv.amount, currency: inv.currency, account: inv.bankAccount, method, approver });
  return { id, at, hash, method, approver, justification };
}

type NewInvoice = Omit<Invoice, "id" | "status" | "createdAt">;

export function addInvoice(data: NewInvoice): Invoice {
  const inv: Invoice = { ...data, currency: data.currency ?? "COP", id: uid("INV"), status: "pendiente", createdAt: new Date().toISOString() };
  store.set((s) => ({ ...s, invoices: [inv, ...s.invoices] }));
  log({ type: "recibida", message: `Factura ${inv.number} de ${inv.vendorName} por ${money(inv.amount, inv.currency)} recibida (${inv.source}).`, invoiceId: inv.id, amount: invCOP(inv, store.get().policies) });
  return inv;
}

async function streamAI(inv: Invoice, checks: Check[], l: AgentListener) {
  const s = store.get();
  let text = "";
  try {
    const res = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice: { ...inv, checks: undefined, status: undefined },
        checks,
        policies: { autoPayLimit: s.policies.autoPayLimit, periodLimit: s.policies.periodLimit, usdRate: s.policies.usdRate, anomalyMultiplier: s.policies.anomalyMultiplier, decision: decide(checks) },
      }),
    });
    if (!res.ok || !res.body) {
      const j = await res.json().catch(() => ({}));
      l.onText("e", j.error ?? `Error ${res.status}`);
      return text;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line) continue;
        const m = JSON.parse(line) as { t: "r" | "o" | "e"; d: string };
        if (m.t === "o") text += m.d;
        l.onText(m.t, m.d);
      }
    }
  } catch (e) {
    l.onText("e", (e as Error).message);
  }
  return text;
}

export async function runAgent(id: string, l: AgentListener, opts: { ai?: boolean; delay?: number } = {}) {
  const { ai = true, delay = 550 } = opts;
  const s = store.get();
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv) return;
  updateInvoice(id, { status: "auditando", checks: [], aiReasoning: "" });
  log({ type: "auditoria", message: `Agente AL DIA inició auditoría de ${inv.number}.`, invoiceId: id });
  const checks = evaluateInvoice(inv, s.policies, s.invoices);
  const aiP = ai ? streamAI(inv, checks, l) : Promise.resolve("");

  const shown: Check[] = [];
  for (const c of checks) {
    await sleep(delay);
    shown.push(c);
    l.onCheck(c);
    updateInvoice(id, { checks: [...shown] });
  }
  const text = await aiP;

  // The deterministic engine decides; the AI text is only explanation.
  const decision = decide(checks);
  const decisionReason = explain(checks);
  const amt = invCOP(inv, s.policies);
  if (decision === "pagar") {
    const receipt = await makeReceipt(inv, "auto");
    updateInvoice(id, { status: "pagada", receipt, aiReasoning: text, decisionReason });
    log({ type: "pago_auto", message: `${decisionReason} Pago de ${money(inv.amount, inv.currency)} a ${inv.vendorName}. Comprobante ${receipt.id}.`, invoiceId: id, amount: amt });
  } else if (decision === "frenar") {
    updateInvoice(id, { status: "frenada", aiReasoning: text, decisionReason });
    log({ type: "frenada", message: `${inv.number} · ${decisionReason}`, invoiceId: id, amount: amt });
  } else {
    updateInvoice(id, { status: "retenida", aiReasoning: text, decisionReason });
    log({ type: "retenida", message: `${inv.number} · ${decisionReason}`, invoiceId: id, amount: amt });
  }
}

export async function humanDecision(id: string, approve: boolean, approver: string, justification: string) {
  const s = store.get();
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv || inv.status !== "retenida") return;
  const amt = invCOP(inv, s.policies);
  if (approve) {
    const receipt = await makeReceipt(inv, "humano", approver, justification);
    updateInvoice(id, { status: "aprobada", receipt });
    log({ type: "aprobada", message: `${approver} aprobó la excepción y se pagó ${money(inv.amount, inv.currency)} a ${inv.vendorName}: "${justification}". Comprobante ${receipt.id}.`, invoiceId: id, amount: amt });
  } else {
    updateInvoice(id, { status: "rechazada" });
    log({ type: "rechazada", message: `${approver} rechazó la factura ${inv.number}: "${justification}".`, invoiceId: id, amount: amt });
  }
}

const today = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const rnd = (p: string) => `${p}-${Math.floor(1000 + Math.random() * 9000)}`;

export type SampleKey = "valida" | "validaUsd" | "duplicado" | "nuevo" | "noCuadra" | "limite" | "presupuesto" | "cuenta";

export const SAMPLE_META: { key: SampleKey; label: string; hint: string; expect: "pagar" | "frenar" | "escalar" }[] = [
  { key: "valida", label: "Factura normal (COP)", hint: "Papelería · $1.850.000", expect: "pagar" },
  { key: "validaUsd", label: "Contratista en USD", hint: "DevStudio · 800 USD acordados", expect: "pagar" },
  { key: "duplicado", label: "Cobro duplicado", hint: "Misma factura ya pagada", expect: "frenar" },
  { key: "nuevo", label: "Beneficiario nuevo", hint: "No está en la lista permitida", expect: "frenar" },
  { key: "noCuadra", label: "No cuadra con lo acordado", hint: "Acordado 800 USD · cobra 1.150", expect: "escalar" },
  { key: "limite", label: "Supera el límite", hint: "$6.200.000 · requiere humano", expect: "escalar" },
  { key: "presupuesto", label: "Presupuesto insuficiente", hint: "Servicios sin saldo", expect: "escalar" },
  { key: "cuenta", label: "Cambio de cuenta bancaria", hint: "URGENTE · cuenta nueva", expect: "escalar" },
];

export const SAMPLES: Record<SampleKey, () => NewInvoice> = {
  valida: () => ({ number: rnd("PA"), vendorName: "Papelería Andina S.A.S", nit: "900123456-1", bankAccount: "Bancolombia 123-456789-01", amount: 1_850_000, currency: "COP", category: "Suministros", dueDate: today(10), description: "Resmas de papel, tóner y útiles de oficina", source: "Set del reto: normal" }),
  validaUsd: () => ({ number: rnd("DS"), vendorName: "DevStudio Remote LLC", nit: "EIN 88-1234567", bankAccount: "Chase 021000021-77441", amount: 800, currency: "USD", category: "Tecnología", dueDate: today(7), description: "Desarrollo frontend — retainer mensual (contratista EE. UU.)", source: "Set del reto: normal USD" }),
  duplicado: () => {
    const s = store.get();
    let prev = s.invoices.find((i) => i.status === "pagada" || i.status === "aprobada");
    if (!prev) {
      // Seed one historical paid invoice so the duplicate trap is real.
      const h = addInvoice({ ...SAMPLES.valida(), source: "Histórico: pagada el mes pasado" });
      updateInvoice(h.id, { status: "pagada", decisionReason: "Histórico importado." });
      prev = { ...h, status: "pagada" };
    }
    const { id: _i, status: _s, createdAt: _c, checks: _k, receipt: _r, aiReasoning: _a, decisionReason: _d, ...rest } = prev;
    return { ...rest, source: "Set del reto: cobro duplicado (reenviado por correo)" };
  },
  nuevo: () => ({ number: rnd("X"), vendorName: "Consultores Globales Ltda", nit: "800000111-2", bankAccount: "Bancolombia 987-000111-22", amount: 2_400_000, currency: "COP", category: "Servicios", dueDate: today(5), description: "Asesoría estratégica (beneficiario nuevo)", source: "Set del reto: beneficiario nuevo" }),
  noCuadra: () => ({ number: rnd("DS"), vendorName: "DevStudio Remote LLC", nit: "EIN 88-1234567", bankAccount: "Chase 021000021-77441", amount: 1_150, currency: "USD", category: "Tecnología", dueDate: today(7), description: "Retainer mensual + horas extra no pactadas", source: "Set del reto: no cuadra con lo acordado" }),
  limite: () => ({ number: rnd("TL"), vendorName: "TransLogix Colombia", nit: "830777111-9", bankAccount: "BBVA 0013-554433", amount: 6_200_000, currency: "COP", category: "Logística", dueDate: today(3), description: "Fletes nacionales — temporada alta", source: "Set del reto: supera el límite" }),
  presupuesto: () => ({ number: rnd("AI"), vendorName: "Aseo Integral Bogotá", nit: "900888999-0", bankAccount: "Banco de Bogotá 221-99881", amount: 3_200_000, currency: "COP", category: "Servicios", dueDate: today(4), description: "Aseo y desinfección de oficinas — mes completo", source: "Set del reto: presupuesto insuficiente" }),
  cuenta: () => ({ number: rnd("CN"), vendorName: "Servicios Cloud Nova", nit: "901555222-3", bankAccount: "Nequi 3105559911", amount: 4_100_000, currency: "COP", category: "Tecnología", dueDate: today(1), description: "URGENTE: renovación de licencias. Favor pagar HOY a nuestra NUEVA cuenta.", source: "Set del reto: cambio de cuenta (chat)" }),
};

/** Golden Path: runs the full challenge set in order without AI streaming, for a fast reliable demo. */
export async function runGoldenSet(onProgress: (done: number, total: number, label: string) => void) {
  const total = SAMPLE_META.length;
  for (let i = 0; i < total; i++) {
    const m = SAMPLE_META[i]!;
    onProgress(i, total, m.label);
    const inv = addInvoice(SAMPLES[m.key]());
    await runAgent(inv.id, { onCheck: () => {}, onText: () => {} }, { ai: false, delay: 120 });
  }
  onProgress(total, total, "Listo");
}
