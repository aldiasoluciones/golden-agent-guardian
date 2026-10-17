import type { Check, Currency, Invoice, Policies } from "./types";

export const PAID: Invoice["status"][] = ["pagada", "aprobada"];
/** Checks whose failure freezes the invoice (never paid by the agent); any other failure escalates to a person. */
export const FREEZE_CHECKS = ["whitelist", "duplicate"];

export const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
export const money = (n: number, c: Currency = "COP") =>
  c === "USD"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n) + " USD"
    : fmt(n);

export const toCOP = (n: number, c: Currency | undefined, p: Pick<Policies, "usdRate">) => (c === "USD" ? n * p.usdRate : n);
export const invCOP = (i: Invoice, p: Pick<Policies, "usdRate">) => toCOP(i.amount, i.currency, p);

export function spentByCategory(invoices: Invoice[], p: Pick<Policies, "usdRate">) {
  const out: Record<string, number> = {};
  for (const i of invoices) if (PAID.includes(i.status)) out[i.category] = (out[i.category] ?? 0) + invCOP(i, p);
  return out;
}

const month = (iso: string) => iso.slice(0, 7);
const norm = (s: string) => s.replace(/[^0-9a-z]/gi, "").toLowerCase();

/** Format validation per tax id type (legal requirement to pay). */
export function taxIdMatches(type: string, id: string): boolean {
  const d = id.replace(/[^0-9]/g, "");
  switch (type) {
    case "NIT": return d.length >= 8 && d.length <= 10;
    case "EIN": return d.length === 9;
    case "CNPJ": return d.length === 14;
    case "RFC": return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(id.trim());
    default: return id.trim().length >= 4;
  }
}

export type Decision = "pagar" | "frenar" | "escalar";
export function decide(checks: Check[]): Decision {
  const failed = checks.filter((c) => !c.passed);
  if (failed.length === 0) return "pagar";
  return failed.some((c) => FREEZE_CHECKS.includes(c.id)) ? "frenar" : "escalar";
}

export function explain(checks: Check[]): string {
  const d = decide(checks);
  const failed = checks.filter((c) => !c.passed);
  if (d === "pagar") return `PAGÓ: cumplió las ${checks.length} reglas de la empresa.`;
  const why = failed.map((f) => `✗ No cumple «${f.label}» — ${f.detail}`).join(" | ");
  return d === "frenar"
    ? `FRENÓ: el agente nunca paga esto por su cuenta. ${why}`
    : `ESCALÓ a una persona: ${why}`;
}

/** Deterministic rule engine — the single authority on whether the agent may pay. */
export function evaluateInvoice(inv: Invoice, p: Policies, all: Invoice[]): Check[] {
  const vendor = p.vendors.find((v) => norm(v.nit) === norm(inv.nit));
  const cop = invCOP(inv, p);
  const shown = money(inv.amount, inv.currency) + (inv.currency === "USD" ? ` (≈ ${fmt(cop)})` : "");
  const checks: Check[] = [];

  checks.push({
    id: "whitelist",
    label: "Beneficiario en lista permitida",
    passed: !!vendor,
    detail: vendor ? `${vendor.name} (${vendor.nit}) está autorizado.` : `${inv.nit || "(sin identificación)"} no está en la lista de beneficiarios permitidos.`,
  });

  if (p.blockDuplicates) {
    const dup = all.find((i) => i.id !== inv.id && PAID.includes(i.status) && norm(i.nit) === norm(inv.nit) && norm(i.number) === norm(inv.number));
    checks.push({
      id: "duplicate",
      label: "Cobro no duplicado",
      passed: !dup,
      detail: dup ? `La factura ${inv.number} de este beneficiario ya se pagó el ${dup.createdAt.slice(0, 10)}.` : "No hay un pago previo con este número.",
    });
  }

  if (p.requireBankMatch) {
    const ok = !!vendor && norm(vendor.bankAccount) === norm(inv.bankAccount);
    checks.push({
      id: "bank",
      label: "Cuenta bancaria coincide con la registrada",
      passed: ok,
      detail: !vendor ? "No hay cuenta registrada para comparar." : ok ? `Cuenta ${inv.bankAccount} coincide.` : `Pide pagar a ${inv.bankAccount}, pero la registrada es ${vendor.bankAccount}.`,
    });
  }

  if (vendor) {
    // Legal/tax identity: the tax id on the invoice must match the type registered for the vendor's country.
    const taxType = vendor.taxIdType ?? "OTRO";
    const idOk = taxIdMatches(taxType, inv.nit);
    checks.push({
      id: "taxId",
      label: `Identificación fiscal válida (${taxType} · ${vendor.country ?? "?"})`,
      passed: idOk,
      detail: idOk
        ? `${taxType} ${inv.nit} tiene el formato correcto para ${vendor.country}.`
        : `«${inv.nit || "(vacío)"}» no es un ${taxType} válido (${vendor.country}). Requisito legal para pagar.`,
    });

    if (p.requireLegalDoc) {
      const doc = vendor.legalDoc ?? "NINGUNO";
      const need = vendor.country === "US" ? "W-9" : vendor.country === "CO" ? "RUT" : "W-8BEN/W-8BEN-E";
      const ok = doc !== "NINGUNO";
      checks.push({
        id: "legalDoc",
        label: "Documento legal en archivo",
        passed: ok,
        detail: ok
          ? `${doc} registrado y vigente.`
          : `Falta el documento legal exigido (${need}). Sin él, el pago no cumple los requisitos fiscales.`,
      });
    }

    // International rail: cross-border payments need a valid SWIFT/ACH account reference.
    const intl = vendor.country !== undefined && vendor.country !== "CO";
    if (intl) {
      const rail = vendor.payMethod ?? "local";
      const acct = inv.bankAccount.toUpperCase();
      const ok =
        rail === "swift"
          ? /SWIFT[: ]?[A-Z0-9]{8,11}/.test(acct) || /[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?/.test(acct)
          : rail === "ach"
            ? /\b\d{9}\b/.test(acct)
            : false;
      checks.push({
        id: "intlRail",
        label: `Riel internacional válido (${rail.toUpperCase()})`,
        passed: ok,
        detail: ok
          ? `Cuenta ${rail.toUpperCase()} verificada para transferencia internacional.`
          : `Pago internacional a ${vendor.country} exige ${rail === "swift" ? "código SWIFT/BIC" : rail === "ach" ? "routing ACH de 9 dígitos" : "un riel internacional"} en la cuenta; «${inv.bankAccount}» no lo tiene.`,
      });
    }
  }

  if (vendor) {
    // Payout currency preference: the vendor chooses to be paid in their own currency or the payer's.
    const payout = vendor.payoutCurrency ?? vendor.currency;
    const invCur = inv.currency ?? "COP";
    if (invCur === payout) {
      checks.push({
        id: "fx",
        label: `Moneda de pago según preferencia (${payout})`,
        passed: true,
        detail: `El proveedor prefiere cobrar en ${payout} y la factura viene en ${invCur}: no hay conversión.`,
      });
    } else {
      // Invoice in another currency: the conversion must use the configured rate within tolerance.
      const converted = invCur === "COP" ? inv.amount / p.usdRate : inv.amount * p.usdRate;
      const ref = vendor.agreedAmount ?? vendor.avgAmount;
      const diff = ref > 0 ? Math.abs(converted - ref) / ref : 1;
      const ok = diff <= p.fxTolerance / 100;
      checks.push({
        id: "fx",
        label: `Conversión a ${payout} con tasa oficial`,
        passed: ok,
        detail: ok
          ? `El proveedor cobra en ${payout}; ${money(inv.amount, invCur)} ≈ ${money(converted, payout)} a TRM ${fmt(p.usdRate)} (desvío ${(diff * 100).toFixed(1)}% ≤ ${p.fxTolerance}%).`
          : `El proveedor cobra en ${payout}; ${money(inv.amount, invCur)} ≈ ${money(converted, payout)} a TRM ${fmt(p.usdRate)}, pero lo acordado es ${money(ref, payout)}: desvío ${(diff * 100).toFixed(1)}% (tolerancia ${p.fxTolerance}%). Posible tasa alterada.`,
      });
    }
  }

  if (vendor?.agreedAmount) {
    const agreed = vendor.agreedAmount;
    // Compare in the vendor's currency; if the invoice comes in another currency, convert at the configured rate.
    const same = (inv.currency ?? "COP") === vendor.currency;
    const invInVendorCur = same ? inv.amount : inv.currency === "COP" ? inv.amount / p.usdRate : inv.amount * p.usdRate;
    const diff = Math.abs(invInVendorCur - agreed) / agreed;
    const ok = diff <= p.agreedTolerance / 100;
    checks.push({
      id: "agreed",
      label: "Monto cuadra con lo acordado",
      passed: ok,
      detail: ok
        ? `Acordado ${money(agreed, vendor.currency)}; diferencia ${(diff * 100).toFixed(1)}% (tolerancia ${p.agreedTolerance}%)${same ? "" : `, convertido a TRM ${fmt(p.usdRate)}`}.`
        : `Acordado ${money(agreed, vendor.currency)}, facturado ${money(inv.amount, inv.currency)}${same ? "" : ` (≈ ${money(invInVendorCur, vendor.currency)})`}: ${(diff * 100).toFixed(1)}% de diferencia (tolerancia ${p.agreedTolerance}%).`,
    });
  }

  checks.push({
    id: "limit",
    label: "Monto dentro del límite por pago",
    passed: cop > 0 && cop <= p.autoPayLimit,
    detail: cop <= 0 ? "El monto debe ser mayor a cero." : cop <= p.autoPayLimit ? `${shown} ≤ límite ${fmt(p.autoPayLimit)}.` : `${shown} supera el límite por pago de ${fmt(p.autoPayLimit)}: requiere aprobación humana.`,
  });

  const m = month(inv.createdAt || new Date().toISOString());
  const periodSpent = all.filter((i) => i.id !== inv.id && PAID.includes(i.status) && month(i.receipt?.at ?? i.createdAt) === m).reduce((a, i) => a + invCOP(i, p), 0);
  checks.push({
    id: "period",
    label: `Límite del período (${m})`,
    passed: periodSpent + cop <= p.periodLimit,
    detail: periodSpent + cop <= p.periodLimit ? `Pagado este mes ${fmt(periodSpent)}; tras este pago ${fmt(periodSpent + cop)} de ${fmt(p.periodLimit)}.` : `Pagado este mes ${fmt(periodSpent)}; este pago supera el límite mensual de ${fmt(p.periodLimit)}.`,
  });

  const budget = p.budgets[inv.category];
  const spent = spentByCategory(all.filter((i) => i.id !== inv.id), p)[inv.category] ?? 0;
  checks.push({
    id: "budget",
    label: `Presupuesto disponible (${inv.category || "sin categoría"})`,
    passed: budget !== undefined && spent + cop <= budget,
    detail: budget === undefined ? `La categoría "${inv.category}" no tiene presupuesto.` : spent + cop <= budget ? `Quedan ${fmt(budget - spent)}; tras el pago ${fmt(budget - spent - cop)}.` : `Disponible ${fmt(Math.max(0, budget - spent))} de ${fmt(budget)}; faltan ${fmt(spent + cop - budget)}.`,
  });

  if (vendor) {
    const avg = toCOP(vendor.avgAmount, vendor.currency, p);
    checks.push({
      id: "anomaly",
      label: "Monto consistente con el histórico",
      passed: cop <= avg * p.anomalyMultiplier,
      detail: cop <= avg * p.anomalyMultiplier ? `Promedio ${money(vendor.avgAmount, vendor.currency)}; dentro de ${p.anomalyMultiplier}×.` : `Es ${(cop / avg).toFixed(1)}× el promedio (${money(vendor.avgAmount, vendor.currency)}). Umbral ${p.anomalyMultiplier}×.`,
    });
  }

  return checks;
}

/** Default number of escalated invoices a finance team reviews at once. */
export const TEAM_CAPACITY = 10;

/**
 * Escalation routing by workload: high-risk escalations always reach the active queue;
 * the rest go to the active queue only while it has room, otherwise into a per-vendor batch.
 */
export function routeEscalation(checks: Check[], cop: number, p: Pick<Policies, "autoPayLimit">, activeOpen: number, capacity = TEAM_CAPACITY) {
  const failed = checks.filter((c) => !c.passed).map((c) => c.id);
  const alta = cop > p.autoPayLimit * 2 || failed.includes("bank") || failed.length >= 3;
  const priority: "alta" | "normal" = alta ? "alta" : "normal";
  const queue: "activa" | "lote" = alta || activeOpen < capacity ? "activa" : "lote";
  return { priority, queue };
}
