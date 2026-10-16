import { evaluateInvoice, fmt } from "./rules";
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
  const id = uid("DSB");
  const hash = await sha({ id, at, inv: inv.id, amount: inv.amount, account: inv.bankAccount, method, approver });
  return { id, at, hash, method, approver, justification };
}

export function addInvoice(data: Omit<Invoice, "id" | "status" | "createdAt">): Invoice {
  const inv: Invoice = { ...data, id: uid("INV"), status: "pendiente", createdAt: new Date().toISOString() };
  store.set((s) => ({ ...s, invoices: [inv, ...s.invoices] }));
  log({ type: "recibida", message: `Factura ${inv.number} de ${inv.vendorName} recibida (${inv.source}).`, invoiceId: inv.id, amount: inv.amount });
  return inv;
}

export async function runAgent(id: string, l: AgentListener) {
  const s = store.get();
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv) return;
  updateInvoice(id, { status: "auditando", checks: [], aiReasoning: "" });
  log({ type: "auditoria", message: `Agente inició auditoría de ${inv.number}.`, invoiceId: id });
  const checks = evaluateInvoice(inv, s.policies, s.invoices);

  let text = "";
  const ai = (async () => {
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice: { ...inv, checks: undefined, status: undefined },
          checks,
          policies: { autoPayLimit: s.policies.autoPayLimit, anomalyMultiplier: s.policies.anomalyMultiplier },
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        l.onText("e", j.error ?? `Error ${res.status}`);
        return;
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
  })();

  const shown: Check[] = [];
  for (const c of checks) {
    await sleep(550);
    shown.push(c);
    l.onCheck(c);
    updateInvoice(id, { checks: [...shown] });
  }
  await ai;

  const failed = checks.filter((c) => !c.passed);
  if (failed.length === 0) {
    const receipt = await makeReceipt(inv, "auto");
    updateInvoice(id, { status: "pagada", receipt, aiReasoning: text });
    log({ type: "pago_auto", message: `Pago autónomo de ${fmt(inv.amount)} a ${inv.vendorName}. Comprobante ${receipt.id}.`, invoiceId: id, amount: inv.amount });
  } else {
    updateInvoice(id, { status: "retenida", aiReasoning: text });
    log({ type: "retenida", message: `Pago retenido: ${failed.map((f) => f.label).join("; ")}. Se solicitó aprobación humana.`, invoiceId: id, amount: inv.amount });
  }
}

export async function humanDecision(id: string, approve: boolean, approver: string, justification: string) {
  const inv = store.get().invoices.find((i) => i.id === id);
  if (!inv) return;
  if (approve) {
    const receipt = await makeReceipt(inv, "humano", approver, justification);
    updateInvoice(id, { status: "aprobada", receipt });
    log({ type: "aprobada", message: `${approver} aprobó excepción y pagó ${fmt(inv.amount)} a ${inv.vendorName}: "${justification}". Comprobante ${receipt.id}.`, invoiceId: id, amount: inv.amount });
  } else {
    updateInvoice(id, { status: "rechazada" });
    log({ type: "rechazada", message: `${approver} rechazó la factura ${inv.number}: "${justification}".`, invoiceId: id, amount: inv.amount });
  }
}

const today = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

export const SAMPLES = {
  valida: () => ({
    number: `PA-${Math.floor(1000 + Math.random() * 9000)}`,
    vendorName: "Papelería Andina S.A.S",
    nit: "900123456-1",
    bankAccount: "Bancolombia 123-456789-01",
    amount: 1_850_000,
    category: "Suministros",
    dueDate: today(10),
    description: "Resmas de papel, tóner y útiles de oficina — octubre",
    source: "Prueba rápida: dentro de reglas",
  }),
  anomala: () => ({
    number: `CN-${Math.floor(1000 + Math.random() * 9000)}`,
    vendorName: "Servicios Cloud Nova",
    nit: "901555222-3",
    bankAccount: "Nequi 3105559911",
    amount: 18_500_000,
    category: "Tecnología",
    dueDate: today(1),
    description: "URGENTE: renovación anual de licencias. Favor pagar a nuestra NUEVA cuenta hoy.",
    source: "Prueba rápida: anómala",
  }),
  desconocido: () => ({
    number: `X-${Math.floor(100 + Math.random() * 900)}`,
    vendorName: "Consultores Globales Ltda",
    nit: "800000111-2",
    bankAccount: "Bancolombia 987-000111-22",
    amount: 2_400_000,
    category: "Servicios",
    dueDate: today(5),
    description: "Asesoría estratégica (proveedor nuevo)",
    source: "Prueba rápida: proveedor desconocido",
  }),
};
