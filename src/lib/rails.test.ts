import { describe, expect, it } from "vitest";
import { accountFits, railFor } from "./rails";
import { decide, evaluateInvoice, invCOP } from "./rules";
import { DEFAULT_POLICIES } from "./store";
import type { Invoice } from "./types";

const P = DEFAULT_POLICIES;
const inv = (vid: string, patch: Partial<Invoice> = {}): Invoice => {
  const v = P.vendors.find((x) => x.id === vid)!;
  return { id: "x", number: "R-1", vendorName: v.name, nit: v.nit, bankAccount: v.bankAccount, amount: v.avgAmount, currency: v.currency, category: v.category, dueDate: "2026-12-01", description: "", source: "t", status: "pendiente", createdAt: new Date().toISOString(), payer: { status: "detectado", name: "AL DIA", how: "t" }, ...patch };
};

describe("rieles Blinka por país", () => {
  it.each([
    ["CO", "COP", "BRE-B"], ["BR", "BRL", "PIX"], ["MX", "MXN", "SPEI"], ["DE", "EUR", "SEPA"],
    ["AR", "ARS", "CBU"], ["CL", "CLP", "LOCAL-BANK"], ["PE", "USD", "USD-LOCAL"], ["JP", "USD", "SWIFT"], ["US", "USD", "ACH"],
  ] as const)("%s en %s sale por %s", (c, cur, rail) => {
    expect(railFor(c, cur)?.rail).toBe(rail);
  });
  it("ARS hacia Chile no tiene ruta", () => expect(railFor("CL", "ARS")).toBeNull());
  it("SPEI exige CLABE de 18 dígitos", () => {
    expect(accountFits("SPEI", "BBVA CLABE 012180001234567897")).toBe(true);
    expect(accountFits("SPEI", "BBVA cta 1234")).toBe(false);
  });
  it("proveedor de México con cuenta sin CLABE escala", () => {
    const i = inv("v12", { bankAccount: "BBVA cta 1234" });
    const p = { ...P, vendors: P.vendors.map((v) => (v.id === "v12" ? { ...v, bankAccount: "BBVA cta 1234" } : v)) };
    expect(decide(evaluateInvoice(i, p, [i]))).toBe("escalar");
  });
  it.each(["v9", "v11", "v12", "v13", "v14", "v15", "v16", "v19", "v23"])("proveedor %s válido se paga", (vid) => {
    const i = inv(vid);
    expect(decide(evaluateInvoice(i, P, [i]))).toBe("pagar");
  });
  it("convierte EUR a COP con la tasa demo", () => expect(invCOP(inv("v9", { amount: 100 }), P)).toBe(435_000));
});
