import { describe, expect, it } from "vitest";
import { addInvoice, runAgent, SAMPLES } from "./agent";
import { DEFAULT_POLICIES, JURY_SOURCE, runJurySession, setTenant, store } from "./store";

const listener = { onCheck: () => {}, onText: () => {} };

describe("lote jurados repetible", () => {
  it("paga la válida y frena su duplicada en dos corridas sin perder otros datos", async () => {
    setTenant("t000");
    store.reset();
    const other = addInvoice({ ...SAMPLES.valida(), number: "JURY-VALID", source: "Archivo: factura-personal.pdf" });
    await runAgent(other.id, listener, { ai: false, delay: 0 });
    store.set((s) => ({ ...s, policies: { ...s.policies, autoPayLimit: 1 } }));
    const originalAudit = [...store.get().audit];
    for (let n = 0; n < 2; n++) {
      await runJurySession(async () => {
        expect(store.get().policies.autoPayLimit).toBe(DEFAULT_POLICIES.autoPayLimit);
        const valid = addInvoice({ ...SAMPLES.valida(), number: "JURY-VALID", source: JURY_SOURCE + "válida" });
        await runAgent(valid.id, listener, { ai: false, delay: 0 });
        expect(store.get().invoices.find((i) => i.id === valid.id)?.status).toBe("pagada");
        const duplicate = addInvoice({ ...SAMPLES.valida(), number: "JURY-VALID", source: JURY_SOURCE + "duplicada" });
        await runAgent(duplicate.id, listener, { ai: false, delay: 0 });
        expect(store.get().invoices.find((i) => i.id === duplicate.id)?.status).toBe("frenada");
      });
      expect(store.get().invoices).toHaveLength(3);
      expect(store.get().invoices.find((i) => i.id === other.id)?.status).toBe("pagada");
      expect(store.get().policies.autoPayLimit).toBe(1);
      for (const event of originalAudit) expect(store.get().audit).toContainEqual(event);
      expect(store.get().audit).toHaveLength(originalAudit.length + 6);
    }
  });

  it("restaura empresa y políticas al cambiar de pagador o fallar", async () => {
    setTenant("t001");
    store.reset();
    const before = store.get();
    await expect(runJurySession(async () => {
      setTenant("t002");
      addInvoice({ ...SAMPLES.valida(), source: JURY_SOURCE + "otra empresa" });
      throw new Error("extracción fallida");
    })).rejects.toThrow("extracción fallida");
    expect(store.get()).toEqual(before);
    setTenant("t002");
    expect(store.get().invoices.filter((i) => i.source.startsWith(JURY_SOURCE))).toHaveLength(1);
  });
});