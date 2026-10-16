import { describe, expect, it } from "vitest";
import { decide, evaluateInvoice } from "./rules";
import { DEFAULT_POLICIES } from "./store";
import type { Invoice } from "./types";

const base: Invoice = {
  id: "a", number: "F-1", vendorName: "Papelería Andina S.A.S", nit: "900123456-1",
  bankAccount: "Bancolombia 123-456789-01", amount: 1_850_000, currency: "COP", category: "Suministros",
  dueDate: "2026-10-30", description: "", source: "test", status: "pendiente", createdAt: "2026-10-16T00:00:00Z",
};
const dev: Invoice = { ...base, id: "d", vendorName: "DevStudio", nit: "EIN 88-1234567", bankAccount: "Chase 021000021-77441", amount: 800, currency: "USD", category: "Tecnología" };
const run = (i: Invoice, all: Invoice[] = []) => evaluateInvoice(i, DEFAULT_POLICIES, all);
const failed = (i: Invoice, all: Invoice[] = []) => run(i, all).filter((c) => !c.passed).map((c) => c.id);

describe("reglas de pago", () => {
  it("factura normal se paga", () => expect(decide(run(base))).toBe("pagar"));
  it("contratista USD dentro de lo acordado se paga", () => expect(decide(run(dev))).toBe("pagar"));
  it("cobro duplicado se frena", () => {
    const c = run({ ...base, id: "b" }, [{ ...base, status: "pagada" }]);
    expect(failed({ ...base, id: "b" }, [{ ...base, status: "pagada" }])).toContain("duplicate");
    expect(decide(c)).toBe("frenar");
  });
  it("beneficiario fuera de la lista se frena", () => expect(decide(run({ ...base, nit: "111" }))).toBe("frenar"));
  it("monto que no cuadra con lo acordado (+5%) escala", () => {
    expect(failed({ ...dev, amount: 1_150 })).toEqual(["agreed"]);
    expect(decide(run({ ...dev, amount: 1_150 }))).toBe("escalar");
  });
  it("monto sobre 5.000.000 COP escala", () => expect(failed({ ...base, amount: 5_000_001 })).toContain("limit"));
  it("USD se convierte a COP para el límite (1.300 USD × 4.000 > 5M)", () =>
    expect(failed({ ...dev, amount: 1_300, nit: "900123456-1", bankAccount: base.bankAccount, category: "Tecnología" })).toContain("limit"));
  it("presupuesto insuficiente escala", () =>
    expect(failed({ ...base, vendorName: "Aseo", nit: "900888999-0", bankAccount: "Banco de Bogotá 221-99881", amount: 3_200_000, category: "Servicios" })).toEqual(["budget"]));
  it("límite mensual de 40.000.000 escala", () => {
    const paid = Array.from({ length: 9 }, (_, k) => ({ ...base, id: `p${k}`, number: `P${k}`, amount: 4_500_000, category: "Tecnología", status: "pagada" as const }));
    expect(failed({ ...base, id: "z" }, paid)).toContain("period");
  });
  it("cambio de cuenta bancaria escala", () => expect(decide(run({ ...base, bankAccount: "Nequi 300" }))).toBe("escalar"));
  it("el agente nunca paga si alguna regla falla", () => {
    for (const i of [{ ...base, nit: "1" }, { ...base, amount: 9e9 }, { ...base, bankAccount: "x" }]) expect(decide(run(i))).not.toBe("pagar");
  });
});
