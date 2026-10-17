import type { AppState, Invoice } from "./types";
import { invCOP } from "./rules";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const asDate = (value: string) => {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? value : date;
};

export async function reconciliationWorkbook(state: AppState, company: string, invoices: Invoice[] = state.invoices) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "AL DIA · Powered by ALJ";
  const ws = wb.addWorksheet("Conciliación", { views: [{ state: "frozen", ySplit: 1 }] });
  const headers = ["Empresa pagadora", "ID factura", "Número", "Fecha recibida", "Fecha de vencimiento", "Canal", "Remitente", "Proveedor", "NIT / Tax ID", "Cuenta destino", "Categoría", "Monto original", "Moneda", "Monto equivalente COP", "Estado", "Prioridad", "Cola", "Lote", "Tiempo decisión (ms)", "Comprobante", "Fecha de pago", "Hash SHA-256", "Autorización", "Aprobador", "Justificación humana", "Motivo de decisión", "Reglas incumplidas"];
  ws.columns = headers.map((header) => ({ header, width: header.includes("Motivo") || header.includes("Reglas") ? 60 : 24 }));
  for (const i of invoices) {
    const event = state.audit.find((e) => e.invoiceId === i.id && e.type === "rechazada");
    ws.addRow([company, i.id, i.number, asDate(i.createdAt), asDate(i.dueDate), i.channel ?? "manual", i.sender ?? "", i.vendorName, i.nit, i.bankAccount, i.category, i.amount, i.currency, invCOP(i, state.policies), i.status === "retenida" ? "escalada" : i.status, i.priority ?? "", i.queue ?? "", i.batchId ?? "", i.latencyMs ?? "", i.receipt?.id ?? "", i.receipt ? asDate(i.receipt.at) : "", i.receipt?.hash ?? "", i.receipt?.method ?? "", i.receipt?.approver ?? "", i.receipt?.justification ?? event?.message ?? "", i.decisionReason ?? "", (i.checks ?? []).filter((c) => !c.passed).map((c) => `${c.label}: ${c.detail}`).join(" | ")]);
  }
  ws.autoFilter = { from: "A1", to: "AA1" };
  ws.eachRow((row, n) => {
    row.font = { name: "Arial", size: 10, bold: n === 1 };
    row.alignment = { vertical: "top", wrapText: true };
    if (n === 1) row.height = 32;
  });
  for (const n of [4, 5, 21]) ws.getColumn(n).numFmt = "dd/mm/yyyy";
  for (const n of [12, 14]) ws.getColumn(n).numFmt = '#,##0.00;(#,##0.00);"-"';
  const audit = wb.addWorksheet("Auditoría");
  audit.columns = ["Empresa", "Fecha", "Tipo", "ID factura", "Monto COP", "Mensaje"].map((header) => ({ header, width: header === "Mensaje" ? 90 : 24 }));
  const ids = new Set(invoices.map((i) => i.id));
  state.audit.filter((e) => !e.invoiceId || ids.has(e.invoiceId)).forEach((e) => audit.addRow([company, asDate(e.at), e.type, e.invoiceId ?? "", e.amount ?? "", e.message]));
  audit.getColumn(2).numFmt = "dd/mm/yyyy hh:mm";
  audit.eachRow((row, n) => { row.font = { name: "Arial", size: 10, bold: n === 1 }; });
  return wb;
}

export async function exportReconciliation(state: AppState, company: string, invoices?: Invoice[]) {
  const wb = await reconciliationWorkbook(state, company, invoices);
  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "aldia-conciliacion.xlsx");
}