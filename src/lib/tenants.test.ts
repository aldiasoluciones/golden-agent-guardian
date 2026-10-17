import { describe, expect, it } from "vitest";
import { getTenants, matchTenant, tenantEmail, tenantTaxId } from "./tenants";

describe("detección del pagador", () => {
  const t = getTenants()[42]!;
  it("identifica por identificación fiscal", () => expect(matchTenant({ taxId: tenantTaxId(t) })?.tenant.id).toBe(t.id));
  it("identifica por correo", () => expect(matchTenant({ email: tenantEmail(t) })?.tenant.id).toBe(t.id));
  it("identifica AL DIA por nombre", () => expect(matchTenant({ name: "AL DIA Demo S.A.S" })?.tenant.id).toBe("t000"));
  it("empresa ajena no coincide", () => expect(matchTenant({ name: "Empresa Fantasma Global", taxId: "123" })).toBeNull());
});
