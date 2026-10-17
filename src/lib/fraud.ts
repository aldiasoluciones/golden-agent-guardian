import type { Invoice, Policies } from "./types";
import { evaluateInvoice, decide, invCOP } from "./rules";

/** Shell-company (bust-out) signals. Pure and deterministic: no AI involved. */
export type Signal = { id: "new-entity" | "smurfing" | "velocity" | "mule-account"; label: string; hit: boolean; detail: string };

export const QUARANTINE_DAYS = 30;

export function detectShellCompany(invs: Invoice[], p: Policies, entityAgeDays: number, windowMinutes: number): { signals: Signal[]; score: number; quarantine: boolean } {
  const n = invs.length;
  const near = invs.filter((i) => { const c = invCOP(i, p); return c <= p.autoPayLimit && c >= p.autoPayLimit * 0.9; }).length;
  const perHour = windowMinutes > 0 ? (n / windowMinutes) * 60 : n;
  const accounts = new Map<string, Set<string>>();
  invs.forEach((i) => { const s = accounts.get(i.bankAccount) ?? new Set(); s.add(i.nit); accounts.set(i.bankAccount, s); });
  const shared = Math.max(0, ...[...accounts.values()].map((s) => s.size));
  const signals: Signal[] = [
    { id: "new-entity", label: "Entidad recién creada", hit: entityAgeDays < QUARANTINE_DAYS, detail: `Constituida hace ${entityAgeDays} días (umbral ${QUARANTINE_DAYS}).` },
    { id: "smurfing", label: "Montos rozando el límite autónomo", hit: n > 0 && near / n >= 0.6, detail: `${near} de ${n} facturas entre el 90% y el 100% del límite.` },
    { id: "velocity", label: "Velocidad anómala", hit: perHour >= 20, detail: `${Math.round(perHour)} facturas/hora (umbral 20 para entidades nuevas).` },
    { id: "mule-account", label: "Cuenta mula compartida", hit: shared >= 3, detail: `Una misma cuenta recibe pagos de ${shared} "proveedores" distintos.` },
  ];
  const score = signals.filter((s) => s.hit).length;
  return { signals, score, quarantine: score >= 2 };
}

/** Runs each invoice through the rule engine; quarantine forces a freeze on top of it. */
export function simulateAttack(invs: Invoice[], p: Policies, quarantine: boolean) {
  return invs.map((inv) => {
    const checks = evaluateInvoice(inv, p, invs);
    const engine = decide(checks);
    return { inv, engine, final: quarantine ? ("frenar" as const) : engine };
  });
}

export function buildAttack(p: Policies, count = 40): Invoice[] {
  const limit = p.autoPayLimit;
  return Array.from({ length: count }, (_, k) => ({
    id: `ATK-${k}`, number: `FX-${9000 + k}`, vendorName: `Servicios Globales ${k % 5 + 1} SAS`,
    nit: `90199900${k % 5}-${k % 9}`, bankAccount: k % 4 === 0 ? `CO-ALT-${k}` : "CO-MULA-777001",
    amount: Math.round(limit * (0.9 + ((k * 7) % 10) / 100)), currency: "COP" as const, category: "Servicios",
    dueDate: "2026-10-20", description: "Consultoría", source: "Simulación empresa fantasma", status: "pendiente" as const,
    createdAt: new Date(Date.now() + k * 60000).toISOString(),
  }));
}
