import type { Check, Invoice, Policies } from "./types";

export const PAID: Invoice["status"][] = ["pagada", "aprobada"];

export const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export function spentByCategory(invoices: Invoice[]) {
  const out: Record<string, number> = {};
  for (const i of invoices) if (PAID.includes(i.status)) out[i.category] = (out[i.category] ?? 0) + i.amount;
  return out;
}

const norm = (s: string) => s.replace(/[^0-9a-z]/gi, "").toLowerCase();

/** Deterministic rule engine — the single authority on whether the agent may pay. */
export function evaluateInvoice(inv: Invoice, p: Policies, all: Invoice[]): Check[] {
  const vendor = p.vendors.find((v) => norm(v.nit) === norm(inv.nit));
  const checks: Check[] = [];

  checks.push({
    id: "whitelist",
    label: "Proveedor en lista blanca",
    passed: !!vendor,
    detail: vendor
      ? `${vendor.name} (NIT ${vendor.nit}) está autorizado.`
      : `El NIT ${inv.nit || "(vacío)"} no está en la lista blanca de proveedores.`,
  });

  if (p.requireBankMatch) {
    const ok = !!vendor && norm(vendor.bankAccount) === norm(inv.bankAccount);
    checks.push({
      id: "bank",
      label: "Cuenta bancaria coincide con la registrada",
      passed: ok,
      detail: !vendor
        ? "No hay cuenta registrada para comparar (proveedor desconocido)."
        : ok
          ? `Cuenta ${inv.bankAccount} coincide con el registro.`
          : `La factura pide pagar a ${inv.bankAccount}, pero la cuenta registrada es ${vendor.bankAccount}. Posible fraude por cambio de cuenta.`,
    });
  }

  checks.push({
    id: "limit",
    label: "Monto dentro del límite de auto-pago",
    passed: inv.amount > 0 && inv.amount <= p.autoPayLimit,
    detail:
      inv.amount <= 0
        ? "El monto debe ser mayor a cero."
        : inv.amount <= p.autoPayLimit
          ? `${fmt(inv.amount)} ≤ límite ${fmt(p.autoPayLimit)}.`
          : `${fmt(inv.amount)} excede el límite de auto-pago de ${fmt(p.autoPayLimit)} por ${fmt(inv.amount - p.autoPayLimit)}.`,
  });

  const budget = p.budgets[inv.category];
  const spent = spentByCategory(all.filter((i) => i.id !== inv.id))[inv.category] ?? 0;
  checks.push({
    id: "budget",
    label: `Presupuesto disponible (${inv.category || "sin categoría"})`,
    passed: budget !== undefined && spent + inv.amount <= budget,
    detail:
      budget === undefined
        ? `La categoría "${inv.category}" no tiene presupuesto asignado.`
        : spent + inv.amount <= budget
          ? `Quedan ${fmt(budget - spent)}; tras el pago quedarían ${fmt(budget - spent - inv.amount)}.`
          : `Ejecutado ${fmt(spent)} de ${fmt(budget)}. Este pago sobregira el presupuesto por ${fmt(spent + inv.amount - budget)}.`,
  });

  if (vendor) {
    const max = vendor.avgAmount * p.anomalyMultiplier;
    checks.push({
      id: "anomaly",
      label: "Monto consistente con el histórico del proveedor",
      passed: inv.amount <= max,
      detail:
        inv.amount <= max
          ? `Promedio histórico ${fmt(vendor.avgAmount)}; dentro de ${p.anomalyMultiplier}×.`
          : `Es ${(inv.amount / vendor.avgAmount).toFixed(1)}× el promedio histórico (${fmt(vendor.avgAmount)}). Umbral: ${p.anomalyMultiplier}×.`,
    });
  }

  if (p.blockDuplicates) {
    const dup = all.find(
      (i) => i.id !== inv.id && PAID.includes(i.status) && norm(i.nit) === norm(inv.nit) && norm(i.number) === norm(inv.number),
    );
    checks.push({
      id: "duplicate",
      label: "Factura no duplicada",
      passed: !dup,
      detail: dup ? `La factura ${inv.number} de este proveedor ya fue pagada.` : "No se encontró un pago previo con este número.",
    });
  }

  return checks;
}
