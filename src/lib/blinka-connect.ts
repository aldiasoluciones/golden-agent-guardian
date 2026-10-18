import type { Invoice, Policies } from "./types";

export type Rail = "ACH" | "WIRE" | "BRE-B" | "PIX" | "SPEI" | "USDC";

/** Pick the payment rail from vendor data; simulated order only, never moves money. */
export function railFor(inv: Invoice, p: Policies): Rail {
  const v = p.vendors.find((x) => x.nit === inv.nit);
  if (/0x[0-9a-f]{6,}/i.test(inv.bankAccount)) return "USDC";
  if (v?.payMethod === "ach") return "ACH";
  if (v?.country === "BR") return "PIX";
  if (v?.country === "MX") return "SPEI";
  if (v?.payMethod === "swift") return "WIRE";
  return "BRE-B";
}

/** Only rule-approved invoices become dispersal orders. */
export function dispersalOrders(invoices: Invoice[], p: Policies) {
  return invoices
    .filter((i) => (i.status === "pagada" || i.status === "aprobada") && i.receipt)
    .map((i) => ({
      idempotency_key: i.receipt!.hash.slice(0, 32),
      invoice: i.number,
      payee: i.vendorName,
      account: i.bankAccount,
      amount: i.amount,
      currency: i.currency,
      rail: railFor(i, p),
      approval: i.receipt!.method,
      reason: i.decisionReason ?? "",
    }));
}
