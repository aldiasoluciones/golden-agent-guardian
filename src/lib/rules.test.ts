import { describe, expect, it } from "vitest";
import { evaluateInvoice } from "./rules";
import { DEFAULT_POLICIES } from "./store";
import type { Invoice } from "./types";

const base: Invoice = {
  id: "a", number: "F-1", vendorName: "Papelería Andina S.A.S", nit: "900123456-1",
  bankAccount: "Bancolombia 123-456789-01", amount: 1_850_000, category: "Suministros",
  dueDate: "2026-10-30", description: "", source: "test", status: "pendiente", createdAt: "",
};
const failed = (i: Invoice, all: Invoice[] = []) =>
  evaluateInvoice(i, DEFAULT_POLICIES, all).filter((c) => !c.passed).map((c) => c.id);

describe("reglas de pago", () => {
  it("factura válida pasa todas las reglas", () => expect(failed(base)).toEqual([]));
  it("monto sobre 5.000.000 excede el auto-pago", () =>
    expect(failed({ ...base, amount: 5_000_001 })).toContain("limit"));
  it("cambio de cuenta bancaria se bloquea", () =>
    expect(failed({ ...base, bankAccount: "Nequi 300-000" })).toEqual(["bank"]));
  it("proveedor fuera de lista blanca se bloquea", () =>
    expect(failed({ ...base, nit: "111" })).toContain("whitelist"));
  it("más de 2x el promedio es anomalía", () =>
    expect(failed({ ...base, amount: 3_500_000 })).toEqual(["anomaly"]));
  it("factura duplicada ya pagada se bloquea", () =>
    expect(failed({ ...base, id: "b" }, [{ ...base, status: "pagada" }])).toContain("duplicate"));
});
