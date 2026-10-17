export type Currency = "COP" | "USD";

export type Country = "CO" | "US" | "BR" | "MX" | "OTRO";
/** Tax document type per country: NIT (CO), EIN (US), CNPJ (BR), RFC (MX). */
export type TaxIdType = "NIT" | "EIN" | "CNPJ" | "RFC" | "OTRO";
/** Legal doc on file: RUT (CO), W-9 (US entity), W-8BEN/W-8BEN-E (foreign payee of a US company). */
export type LegalDoc = "RUT" | "W-9" | "W-8BEN" | "W-8BEN-E" | "NINGUNO";
/** Payment rail: local transfer, international wire (SWIFT), or US ACH. */
export type PayMethod = "local" | "swift" | "ach";

export type Vendor = {
  id: string;
  name: string;
  nit: string;
  bankAccount: string;
  category: string;
  currency: Currency;
  /** Historical average, in the vendor's currency. */
  avgAmount: number;
  /** Contracted amount per invoice, in the vendor's currency (optional). */
  agreedAmount?: number | undefined;
  country?: Country;
  taxIdType?: TaxIdType;
  legalDoc?: LegalDoc;
  payMethod?: PayMethod;
  /** Currency the vendor prefers to be paid in (defaults to the vendor's currency). */
  payoutCurrency?: Currency | undefined;
};

export type Policies = {
  autoPayLimit: number;
  periodLimit: number;
  usdRate: number;
  agreedTolerance: number;
  /** Max FX deviation (%) vs the configured rate when the invoice currency differs from the vendor's payout currency. */
  fxTolerance: number;
  anomalyMultiplier: number;
  requireBankMatch: boolean;
  blockDuplicates: boolean;
  /** Require a legal tax document (RUT/W-9/W-8) on file before paying. */
  requireLegalDoc: boolean;
  budgets: Record<string, number>;
  vendors: Vendor[];
};

export type InvoiceStatus = "pendiente" | "auditando" | "pagada" | "retenida" | "frenada" | "aprobada" | "rechazada";

export type Check = { id: string; label: string; passed: boolean; detail: string };

export type Receipt = {
  id: string;
  at: string;
  hash: string;
  method: "auto" | "humano";
  approver?: string | undefined;
  justification?: string | undefined;
};

export type Invoice = {
  id: string;
  number: string;
  vendorName: string;
  nit: string;
  bankAccount: string;
  amount: number;
  currency: Currency;
  category: string;
  dueDate: string;
  description: string;
  source: string;
  status: InvoiceStatus;
  createdAt: string;
  checks?: Check[];
  aiReasoning?: string;
  decisionReason?: string;
  receipt?: Receipt;
  channel?: Channel;
  sender?: string;
  priority?: "alta" | "normal";
  queue?: "activa" | "lote";
  batchId?: string | undefined;
  latencyMs?: number;
};

export type Channel = "whatsapp" | "correo" | "manual";

export type AuditEvent = {
  id: string;
  at: string;
  type: "recibida" | "auditoria" | "pago_auto" | "retenida" | "frenada" | "aprobada" | "rechazada" | "politica";
  message: string;
  invoiceId?: string;
  amount?: number;
};

export type AppState = { policies: Policies; invoices: Invoice[]; audit: AuditEvent[] };
