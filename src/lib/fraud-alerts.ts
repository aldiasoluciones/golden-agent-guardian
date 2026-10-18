import type { AppState, Invoice } from "./types";
import { invCOP } from "./rules";

export const FRAUD_THRESHOLD = 3;
export const FRAUD_WINDOW_MS = 10 * 60_000;
const SIGNALS = ["duplicate", "whitelist", "bank"];

export type FraudIncident = {
  id: string;
  startedAt: string;
  triggeredAt: string;
  invoices: Invoice[];
  amountCOP: number;
};

/** Read-only scan: wait for all queued checks and retain historical evidence. */
export function fraudScan(state: AppState) {
  const events = state.audit.filter((e) => e.type === "alerta_fraude" && e.fraudIncident);
  const rows = new Map<string, Invoice>();
  for (const event of events) for (const invoice of event.fraudIncident?.invoices ?? []) rows.set(invoice.id, invoice);
  for (const invoice of state.invoices) {
    if (invoice.status !== "pendiente" && invoice.status !== "auditando" &&
      invoice.checks?.some((check) => !check.passed && SIGNALS.includes(check.id))) rows.set(invoice.id, invoice);
  }
  const invoices = [...rows.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const pending = state.invoices.filter((i) => i.status === "pendiente" || i.status === "auditando").length;
  const first = invoices[0];
  const last = invoices[invoices.length - 1];
  const incident: FraudIncident | undefined = events.length && first && last ? {
    id: "ESCANEO-CONSOLIDADO", startedAt: first.createdAt, triggeredAt: last.createdAt,
    invoices, amountCOP: invoices.reduce((sum, i) => sum + invCOP(i, state.policies), 0),
  } : undefined;
  return { pending, eventCount: events.length, incident };
}

/** Suspicions, not confirmed fraud. Input must contain only one tenant's invoices. */
export function fraudIncidents(invoices: Invoice[], policies: AppState["policies"]): FraudIncident[] {
  const seen = new Set<string>();
  const rows = invoices.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return i.status !== "pendiente" && i.status !== "auditando" &&
      Number.isFinite(Date.parse(i.createdAt)) &&
      i.checks?.some((c) => !c.passed && SIGNALS.includes(c.id));
  }).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  const result: FraudIncident[] = [];
  for (let start = 0; start < rows.length;) {
    const first = rows[start];
    if (!first) break;
    let end = start;
    while (end < rows.length) {
      const next = rows[end];
      if (!next || Date.parse(next.createdAt) - Date.parse(first.createdAt) > FRAUD_WINDOW_MS) break;
      end++;
    }
    const group = rows.slice(start, end);
    const trigger = group[FRAUD_THRESHOLD - 1];
    if (trigger) {
      result.push({ id: `FRAUD-${first.id}`, startedAt: first.createdAt, triggeredAt: trigger.createdAt,
        invoices: group, amountCOP: group.reduce((sum, i) => sum + invCOP(i, policies), 0) });
      start = end;
    } else start++;
  }
  return result;
}

/** Store a snapshot at detection; keep previous reports even after human resolution. */
export function recordFraudAlerts(state: AppState, detectedAt: string): AppState {
  let audit = state.audit;
  for (const incident of fraudIncidents(state.invoices, state.policies)) {
    const existing = audit.find((e) => e.id === incident.id);
    if (existing?.fraudIncident?.invoices.length === incident.invoices.length) continue;
    const first = incident.invoices[0];
    if (!first) continue;
    const event = { id: incident.id, at: existing?.at ?? detectedAt, type: "alerta_fraude" as const,
      invoiceId: first.id, amount: incident.amountCOP, fraudIncident: incident,
      message: `Alerta preventiva: ${incident.invoices.length} facturas sospechosas en 10 minutos. Posibles duplicados, beneficiarios no autorizados o cuentas distintas. Requiere investigación; no confirma fraude.` };
    audit = existing ? audit.map((e) => e.id === event.id ? event : e) : [event, ...audit];
  }
  return audit === state.audit ? state : { ...state, audit };
}

export async function fraudReportWorkbook(incident: FraudIncident, company: string, detectedAt: string) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "AL DIA · Powered by ALJ";
  const summary = wb.addWorksheet("Informe preventivo");
  summary.columns = [{ width: 30 }, { width: 100 }];
  [ ["Cliente", company], ["Alerta", incident.id], ["Detectada", detectedAt],
    ["Inicio de ventana", incident.startedAt], ["Umbral", "3 facturas sospechosas en 10 minutos"],
    ["Facturas", incident.invoices.length], ["Monto observado COP", incident.amountCOP],
    ["Alcance", "Indicios, no fraude confirmado. No predice intención ni bloquea al cliente. Pagos simulados; registro local del navegador."],
    ["Acción recomendada", "Revisar adjuntos y duplicados; confirmar proveedor y cuenta por un canal independiente antes de autorizar excepciones."]
  ].forEach((row) => summary.addRow(row));
  const sheet = wb.addWorksheet("Evidencias");
  sheet.columns = ["ID", "Número", "Recepción", "Canal", "Proveedor", "Identificación", "Cuenta solicitada", "Monto", "Moneda", "Estado", "Indicios", "Decisión"].map((header) => ({ header, width: 28 }));
  incident.invoices.forEach((i) => sheet.addRow([i.id, i.number, i.createdAt, i.channel ?? "manual", i.vendorName, i.nit, i.bankAccount, i.amount, i.currency, i.status,
    i.checks?.filter((c) => !c.passed && SIGNALS.includes(c.id)).map((c) => `${c.label}: ${c.detail}`).join(" | "), i.decisionReason ?? ""]));
  for (const ws of [summary, sheet]) ws.eachRow((row) => { row.alignment = { wrapText: true, vertical: "top" }; });
  return wb;
}