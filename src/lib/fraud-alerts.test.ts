import { describe, expect, it } from "vitest";
import { fraudIncidents, fraudReportWorkbook, recordFraudAlerts } from "./fraud-alerts";
import { DEFAULT_POLICIES } from "./store";
import type { AppState, Invoice } from "./types";

const invoice = (n: number, minutes = n, check = "bank"): Invoice => ({
  id: `INV-${n}`, number: `F-${n}`, vendorName: "Proveedor sintético", nit: "900123456-1", bankAccount: "Cuenta distinta",
  amount: 100, currency: "USD", category: "Tecnología", dueDate: "2026-10-31", description: "Prueba", source: "Prueba",
  status: "retenida", createdAt: new Date(Date.UTC(2026, 9, 18, 0, minutes)).toISOString(),
  checks: [{ id: check, label: "Indicio", passed: false, detail: "Requiere investigación" }],
});
const state = (invoices: Invoice[]): AppState => ({ invoices, policies: DEFAULT_POLICIES, audit: [] });

describe("alerta preventiva por cliente", () => {
  it("se activa exactamente con tres facturas, no con dos", () => {
    expect(fraudIncidents([invoice(1), invoice(2)], DEFAULT_POLICIES)).toHaveLength(0);
    expect(fraudIncidents([invoice(1), invoice(2), invoice(3)], DEFAULT_POLICIES)).toHaveLength(1);
  });
  it("incluye el límite de diez minutos y excluye once", () => {
    expect(fraudIncidents([invoice(1, 0), invoice(2, 5), invoice(3, 10)], DEFAULT_POLICIES)).toHaveLength(1);
    expect(fraudIncidents([invoice(1, 0), invoice(2, 5), invoice(3, 11)], DEFAULT_POLICIES)).toHaveLength(0);
  });
  it("encuentra una ventana posterior sin exigir que empiece en la primera factura", () => {
    expect(fraudIncidents([invoice(1, 0), invoice(2, 9), invoice(3, 11), invoice(4, 12)], DEFAULT_POLICIES)[0]?.invoices.map((i) => i.id)).toEqual(["INV-2", "INV-3", "INV-4"]);
  });
  it("combina duplicado, whitelist y cuenta entre canales", () => {
    const rows = [invoice(1, 1, "duplicate"), { ...invoice(2, 2, "whitelist"), channel: "correo" as const }, { ...invoice(3), channel: "whatsapp" as const }];
    expect(fraudIncidents(rows, DEFAULT_POLICIES)[0]?.amountCOP).toBe(1_200_000);
  });
  it("no clasifica exceso de límite o falta de presupuesto como fraude", () => {
    expect(fraudIncidents([invoice(1, 1, "limit"), invoice(2, 2, "budget"), invoice(3, 3, "legalDoc")], DEFAULT_POLICIES)).toHaveLength(0);
  });
  it("no cuenta dos veces la misma factura ni auditorías incompletas", () => {
    const one = invoice(1);
    expect(fraudIncidents([one, one, invoice(2), { ...invoice(3), status: "auditando" }], DEFAULT_POLICIES)).toHaveLength(0);
  });
  it("no suma facturas de estados de clientes distintos", () => {
    expect(recordFraudAlerts(state([invoice(1), invoice(2)]), "2026-10-18").audit).toHaveLength(0);
    expect(recordFraudAlerts(state([invoice(3)]), "2026-10-18").audit).toHaveLength(0);
  });
  it("genera un solo evento, amplía evidencias y conserva el informe tras resolución", () => {
    const first = recordFraudAlerts(state([invoice(1), invoice(2), invoice(3)]), "2026-10-18T00:04:00Z");
    expect(recordFraudAlerts(first, "2026-10-18T00:05:00Z")).toBe(first);
    const next = recordFraudAlerts({ ...first, invoices: [...first.invoices, invoice(4)] }, "2026-10-18T00:05:00Z");
    expect(next.audit).toHaveLength(1);
    expect(next.audit[0]?.fraudIncident?.invoices).toHaveLength(4);
    const resolved = recordFraudAlerts({ ...next, invoices: next.invoices.map((i) => ({ ...i, status: "rechazada" })) }, "2026-10-18T00:06:00Z");
    expect(resolved.audit[0]?.at).toBe("2026-10-18T00:04:00Z");
    expect(resolved.audit[0]?.fraudIncident?.invoices[0]?.status).toBe("retenida");
  });
  it("el informe contiene únicamente las evidencias del incidente", async () => {
    const incident = fraudIncidents([invoice(1), invoice(2), invoice(3)], DEFAULT_POLICIES)[0];
    if (!incident) throw new Error("Falta incidente");
    const wb = await fraudReportWorkbook(incident, "Cliente A", "2026-10-18T00:04:00Z");
    expect(wb.getWorksheet("Evidencias")?.rowCount).toBe(4);
    expect(wb.getWorksheet("Evidencias")?.getCell("A2").value).toBe("INV-1");
    expect(wb.getWorksheet("Informe preventivo")?.getCell("B1").value).toBe("Cliente A");
    expect(wb.getWorksheet("Informe preventivo")?.getCell("B7").value).toBe(1_200_000);
  });
});