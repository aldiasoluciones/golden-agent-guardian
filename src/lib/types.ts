export type Vendor = {
  id: string;
  name: string;
  nit: string;
  bankAccount: string;
  category: string;
  avgAmount: number;
};

export type Policies = {
  autoPayLimit: number;
  anomalyMultiplier: number;
  requireBankMatch: boolean;
  blockDuplicates: boolean;
  budgets: Record<string, number>;
  vendors: Vendor[];
};

export type InvoiceStatus =
  | "pendiente"
  | "auditando"
  | "pagada"
  | "retenida"
  | "aprobada"
  | "rechazada";

export type Check = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type Receipt = {
  id: string;
  at: string;
  hash: string;
  method: "auto" | "humano";
  approver?: string;
  justification?: string;
};

export type Invoice = {
  id: string;
  number: string;
  vendorName: string;
  nit: string;
  bankAccount: string;
  amount: number;
  category: string;
  dueDate: string;
  description: string;
  source: string;
  status: InvoiceStatus;
  createdAt: string;
  checks?: Check[];
  aiReasoning?: string;
  receipt?: Receipt;
};

export type AuditEvent = {
  id: string;
  at: string;
  type: "recibida" | "auditoria" | "pago_auto" | "retenida" | "aprobada" | "rechazada" | "politica";
  message: string;
  invoiceId?: string;
  amount?: number;
};

export type AppState = { policies: Policies; invoices: Invoice[]; audit: AuditEvent[] };
