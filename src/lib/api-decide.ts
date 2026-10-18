import { z } from "zod";
import { decide, evaluateInvoice, explain, invCOP } from "./rules";
import { DEFAULT_POLICIES } from "./store";
import { getTenant, matchTenant, policiesFor } from "./tenants";
import type { Invoice } from "./types";

const str = (max = 200) => z.string().trim().max(max);

const InvoiceIn = z.object({
  number: str(80).min(1),
  vendorName: str().min(1),
  vendorTaxId: str(60).min(1),
  bankAccount: str(120).min(1),
  amount: z.number().positive().max(1e12),
  currency: z.enum(["COP", "USD", "EUR", "BRL", "MXN", "ARS", "CLP", "PEN", "BOB", "CRC", "ZAR"]).default("COP"),
  category: str(60).default("Servicios"),
  dueDate: str(20).optional(),
  description: str(500).optional(),
});

export const DecideBody = InvoiceIn.extend({
  payer: z.object({ name: str().optional(), taxId: str(60).optional(), email: str(200).optional() }).optional(),
  tenantId: z.string().regex(/^t\d{3}$/).optional(),
  /** Previous invoices of the same company, to detect duplicates (the API is stateless). */
  history: z.array(InvoiceIn).max(200).optional(),
});
export type DecideInput = z.infer<typeof DecideBody>;

const toInv = (x: z.infer<typeof InvoiceIn>, id: string, status: Invoice["status"] = "pendiente"): Invoice => ({
  id, number: x.number, vendorName: x.vendorName, nit: x.vendorTaxId, bankAccount: x.bankAccount,
  amount: x.amount, currency: x.currency, category: x.category, dueDate: x.dueDate ?? "",
  description: x.description ?? "", source: "API REST", status, createdAt: new Date().toISOString(),
});

const LABEL = { pagar: "PAGAR", frenar: "FRENAR", escalar: "ESCALAR" } as const;

/** Stateless, deterministic decision: same input → same decision. The rule engine is the only authority. */
export async function decideApi(input: DecideInput) {
  const t0 = performance.now();
  const inv = toInv(input, "API-" + input.number);
  let tenantId = input.tenantId ?? "t000";
  if (input.payer) {
    const m = matchTenant(input.payer);
    if (m) { tenantId = m.tenant.id; inv.payer = { status: "detectado", name: m.tenant.name, how: m.how }; }
    else if (input.payer.name || input.payer.taxId || input.payer.email)
      inv.payer = { status: "desconocido", name: input.payer.name || input.payer.taxId || input.payer.email || "?", how: "sin coincidencia" };
    else inv.payer = { status: "sin-dato", name: "", how: "" };
  } else if (!input.tenantId) {
    inv.payer = { status: "sin-dato", name: "", how: "" };
  }
  const policies = policiesFor(tenantId, DEFAULT_POLICIES);
  const history = (input.history ?? []).map((h, i) => toInv(h, `H${i}`, "pagada"));
  const checks = evaluateInvoice(inv, policies, [...history, inv]);
  const d = decide(checks);
  const tenant = getTenant(tenantId);
  const ms = Math.round((performance.now() - t0) * 100) / 100;
  let receiptSha256: string | null = null;
  if (d === "pagar") {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ inv, tenantId, checks })));
    receiptSha256 = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return {
    ok: true,
    decision: LABEL[d],
    decisionReason: explain(checks),
    payer: inv.payer?.status === "desconocido" || inv.payer?.status === "sin-dato"
      ? { status: inv.payer.status, name: inv.payer.name || null }
      : { status: "detectado", id: tenant.id, name: tenant.name, matchedBy: inv.payer?.how ?? "tenantId" },
    amountCOP: Math.round(invCOP(inv, policies)),
    executionTimeMs: ms,
    receiptSha256,
    simulated: true,
    checks: checks.map(({ id, label, passed, detail }) => ({ id, label, passed, detail })),
  };
}
