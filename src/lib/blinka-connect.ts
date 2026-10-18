import type { Invoice, Policies } from "./types";
import { railFor as corridor, type Rail } from "./rails";

export type { Rail };

/** Pick the Blinka rail from the vendor's country and payout currency; simulated order only, never moves money. */
export function railFor(inv: Invoice, p: Policies): Rail {
  const v = p.vendors.find((x) => x.nit === inv.nit);
  return corridor(v?.country, v?.payoutCurrency ?? v?.currency ?? inv.currency, inv.bankAccount, v?.payMethod)?.rail ?? "SWIFT";
}

/** Only rule-approved invoices become dispersal orders; each carries the QuickBooks bill-payment sync back. */
export function dispersalOrders(invoices: Invoice[], p: Policies) {
  return invoices
    .filter((i) => (i.status === "pagada" || i.status === "aprobada") && i.receipt)
    .map((i) => {
      const v = p.vendors.find((x) => x.nit === i.nit);
      return {
        idempotency_key: i.receipt!.hash.slice(0, 32),
        invoice: i.number,
        payee: i.vendorName,
        account: i.bankAccount,
        amount: i.amount,
        currency: i.currency,
        country: v?.country ?? "CO",
        rail: railFor(i, p),
        approval: i.receipt!.method,
        reason: i.decisionReason ?? "",
        quickbooks_sync: { object: "BillPayment", doc_number: i.number, memo: `blinkagent SHA-256 ${i.receipt!.hash.slice(0, 16)}` },
      };
    });
}
