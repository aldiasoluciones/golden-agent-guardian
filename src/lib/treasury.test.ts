import { describe, expect, it } from "vitest";
import { budgetSummary, pendingValidation, reasonBreakdown } from "./treasury";
import { reconciliationWorkbook } from "./reconciliation";
import { DEFAULT_POLICIES } from "./store";
import type { Invoice } from "./types";

const invoice = (status: Invoice["status"], patch: Partial<Invoice> = {}): Invoice => ({ id: status, number: "INV-1", vendorName: "Proveedor ficticio", nit: "900123456-1", bankAccount: "123", amount: 800, currency: "USD", category: "Tecnología", dueDate: "2026-10-31", description: "Prueba", source: "manual", createdAt: "2026-10-17T00:00:00Z", status, ...patch });

describe("tesorería del pagador", () => {
  it("solo mantiene validaciones pendientes, no pagadas ni rechazadas", () => {
    expect(pendingValidation([invoice("retenida"), invoice("aprobada"), invoice("rechazada"), invoice("frenada"), invoice("pagada")]).map((i) => i.status)).toEqual(["retenida"]);
  });
  it("suma pagos autónomos y humanos en COP del mes elegido", () => {
    const result = budgetSummary([invoice("pagada"), invoice("aprobada", { currency: "COP", amount: 1_800_000 }), invoice("retenida"), invoice("pagada", { createdAt: "2026-09-01" })], DEFAULT_POLICIES, "2026-10");
    expect(result.amount).toBe(5_000_000);
    expect(result.available).toBe(35_000_000);
    expect(result.percent).toBe(12.5);
  });
  it("subdivide causas sin contar una regla dos veces en la misma factura", () => {
    const c = { id: "bank", label: "Cuenta distinta", passed: false, detail: "No coincide" };
    expect(reasonBreakdown([invoice("rechazada", { checks: [c, c] }), invoice("rechazada", { checks: [{ ...c, id: "limit", label: "Límite" }] })])).toEqual([{ label: "Cuenta distinta", count: 1, percent: 50 }, { label: "Límite", count: 1, percent: 50 }]);
  });
  it("incluye vencimiento como fecha real y monto numérico en Excel", async () => {
    const wb = await reconciliationWorkbook({ policies: DEFAULT_POLICIES, invoices: [invoice("pagada")], audit: [] }, "Empresa ficticia");
    const sheet = wb.getWorksheet("Conciliación");
    expect(sheet?.getCell("E2").value).toEqual(new Date("2026-10-31T12:00:00Z"));
    expect(sheet?.getCell("N2").value).toBe(3_200_000);
    expect(sheet?.getCell("A2").value).toBe("Empresa ficticia");
  });
});