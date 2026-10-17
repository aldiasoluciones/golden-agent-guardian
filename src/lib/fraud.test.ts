import { describe, it, expect } from "vitest";
import { buildAttack, detectShellCompany, simulateAttack } from "./fraud";
import { DEFAULT_POLICIES } from "./store";

describe("empresa fantasma", () => {
  const atk = buildAttack(DEFAULT_POLICIES);
  it("entidad de 3 días con ráfaga estructurada entra en cuarentena", () => {
    const r = detectShellCompany(atk, DEFAULT_POLICIES, 3, 120);
    expect(r.quarantine).toBe(true);
    expect(r.score).toBe(4);
  });
  it("cero pagos durante el ataque", () => {
    expect(simulateAttack(atk, DEFAULT_POLICIES, true).filter((x) => x.final === "pagar")).toHaveLength(0);
  });
  it("empresa antigua con ritmo normal no se pone en cuarentena", () => {
    expect(detectShellCompany(atk.slice(0, 2), DEFAULT_POLICIES, 400, 600).quarantine).toBe(false);
  });
});
