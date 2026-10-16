import { useSyncExternalStore } from "react";
import type { AppState, AuditEvent, Invoice, Policies } from "./types";

export const DEFAULT_POLICIES: Policies = {
  autoPayLimit: 5_000_000,
  anomalyMultiplier: 2,
  requireBankMatch: true,
  blockDuplicates: true,
  budgets: { Suministros: 10_000_000, Tecnología: 30_000_000, Logística: 15_000_000, Servicios: 8_000_000 },
  vendors: [
    { id: "v1", name: "Papelería Andina S.A.S", nit: "900123456-1", bankAccount: "Bancolombia 123-456789-01", category: "Suministros", avgAmount: 1_700_000 },
    { id: "v2", name: "Servicios Cloud Nova", nit: "901555222-3", bankAccount: "Davivienda 0045-778812", category: "Tecnología", avgAmount: 4_200_000 },
    { id: "v3", name: "TransLogix Colombia", nit: "830777111-9", bankAccount: "BBVA 0013-554433", category: "Logística", avgAmount: 2_900_000 },
    { id: "v4", name: "Aseo Integral Bogotá", nit: "900888999-0", bankAccount: "Banco de Bogotá 221-99881", category: "Servicios", avgAmount: 1_200_000 },
  ],
};

const KEY = "blinka-agent-v1";
const initial = (): AppState => ({ policies: DEFAULT_POLICIES, invoices: [], audit: [] });
let state: AppState = initial();
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...initial(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}

export const store = {
  get: () => (load(), state),
  set(fn: (s: AppState) => AppState) {
    load();
    state = fn(state);
    localStorage.setItem(KEY, JSON.stringify(state));
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        state = JSON.parse(e.newValue);
        f();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      subs.delete(f);
      window.removeEventListener("storage", onStorage);
    };
  },
  reset() {
    store.set(() => initial());
  },
};

const serverSnap = initial();
export function useAppState() {
  return useSyncExternalStore(store.subscribe, store.get, () => serverSnap);
}

export const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export function log(e: Omit<AuditEvent, "id" | "at">) {
  store.set((s) => ({ ...s, audit: [{ ...e, id: uid("EV"), at: new Date().toISOString() }, ...s.audit] }));
}

export function updateInvoice(id: string, patch: Partial<Invoice>) {
  store.set((s) => ({ ...s, invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
}
