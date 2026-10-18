import { describe, expect, it } from "vitest";
import { signIntuit, signStripe, verifyIntuit, verifyStripe } from "./provider-signatures";
import { decideApi } from "./api-decide";

const body = JSON.stringify({ hello: "world" });

describe("firmas de proveedores", () => {
  it("QuickBooks acepta la firma correcta", async () => {
    expect(await verifyIntuit("sandbox", body, await signIntuit("sandbox", body))).toBe(true);
  });
  it("QuickBooks rechaza firma falsa", async () => {
    expect(await verifyIntuit("sandbox", body, await signIntuit("clave-falsa", body))).toBe(false);
  });
  it("Stripe acepta firma vigente", async () => {
    expect(await verifyStripe("sandbox", body, await signStripe("sandbox", body))).toBe(true);
  });
  it("Stripe rechaza firma con más de 5 minutos", async () => {
    const old = Math.floor(Date.now() / 1000) - 301;
    expect(await verifyStripe("sandbox", body, await signStripe("sandbox", body, old))).toBe(false);
  });
  it("Bill de proveedor fuera de lista se frena", async () => {
    const r = await decideApi({ number: "QB-1", vendorName: "Fantasma Ltda", vendorTaxId: "999000111-2", bankAccount: "Nequi 300", amount: 900_000, currency: "COP", category: "Suministros", tenantId: "t000" });
    expect(r.decision).toBe("FRENAR");
  });
});
