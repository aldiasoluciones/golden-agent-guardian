import { invCOP, PAID } from "./rules";
import type { Invoice, Policies } from "./types";

export const pendingValidation = (invoices: Invoice[]) => invoices.filter((i) => i.status === "retenida");

export const TYPOLOGIES = [
  { label: "Pagadas", statuses: ["pagada", "aprobada"], color: "text-primary" },
  { label: "Frenadas / rechazadas", statuses: ["frenada", "rechazada"], color: "text-destructive" },
  { label: "Escaladas pendientes", statuses: ["retenida"], color: "text-warning" },
] as const;

export function reasonBreakdown(invoices: Invoice[]) {
  const groups = new Map<string, { label: string; count: number; percent: number }>();
  for (const inv of invoices) {
    const failed = inv.checks?.filter((c) => !c.passed) ?? [];
    const reasons = failed.length ? failed.map((c) => ({ id: c.id, label: c.label })) : [{ id: "all", label: inv.status === "pagada" ? "Todas las reglas cumplidas" : "Sin desglose de reglas" }];
    for (const reason of new Map(reasons.map((r) => [r.id, r])).values()) {
      const prev = groups.get(reason.id);
      const count = (prev?.count ?? 0) + 1;
      groups.set(reason.id, { label: reason.label, count, percent: count / invoices.length * 100 });
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

export function budgetSummary(invoices: Invoice[], policies: Policies, period: string) {
  const paid = invoices.filter((i) => PAID.includes(i.status) && (i.receipt?.at ?? i.createdAt).slice(0, 7) === period);
  const amount = paid.reduce((sum, i) => sum + invCOP(i, policies), 0);
  return { amount, available: Math.max(0, policies.periodLimit - amount), excess: Math.max(0, amount - policies.periodLimit), percent: policies.periodLimit > 0 ? amount / policies.periodLimit * 100 : 0 };
}
/** Paid amount (COP) and count grouped by Blinka rail and destination country. */
export function paidByRail(invoices: Invoice[], policies: Policies) {
  const out = new Map<string, { rail: string; country: string; count: number; cop: number }>();
  for (const i of invoices) {
    if (i.status !== "pagada" && i.status !== "aprobada") continue;
    const v = policies.vendors.find((x) => x.nit === i.nit);
    const country = v?.country ?? "CO";
    const rail = railOf(v?.country, v?.currency ?? i.currency, i.bankAccount, v?.payMethod)?.label ?? "Sin ruta";
    const k = `${rail}|${country}`;
    const row = out.get(k) ?? { rail, country, count: 0, cop: 0 };
    row.count++; row.cop += invCOP(i, policies);
    out.set(k, row);
  }
  return [...out.values()].sort((a, b) => b.cop - a.cop);
}
