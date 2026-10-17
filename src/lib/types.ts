export type Currency = "COP" | "USD";

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
};

export type Policies = {
  autoPayLimit: number;
  periodLimit: number;
  usdRate: number;
  agreedTolerance: number;
  anomalyMultiplier: number;
  requireBankMatch: boolean;
  blockDuplicates: boolean;
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
