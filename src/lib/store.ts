import { useSyncExternalStore } from "react";
import type { AppState, AuditEvent, Invoice, Policies } from "./types";

export const DEFAULT_POLICIES: Policies = {
  autoPayLimit: 5_000_000,
  periodLimit: 40_000_000,
  usdRate: 4_000,
  agreedTolerance: 5,
  fxTolerance: 2,
  anomalyMultiplier: 2,
  requireBankMatch: true,
  blockDuplicates: true,
  requireLegalDoc: true,
  budgets: { Suministros: 10_000_000, Tecnología: 30_000_000, Logística: 15_000_000, Servicios: 3_000_000 },
  vendors: [
    { id: "v1", name: "Papelería Andina S.A.S", nit: "900123456-1", bankAccount: "Bancolombia 123-456789-01", category: "Suministros", currency: "COP", avgAmount: 1_700_000, country: "CO", taxIdType: "NIT", legalDoc: "RUT", payMethod: "local" },
    { id: "v2", name: "Servicios Cloud Nova", nit: "901555222-3", bankAccount: "Davivienda 0045-778812", category: "Tecnología", currency: "COP", avgAmount: 4_200_000, country: "CO", taxIdType: "NIT", legalDoc: "RUT", payMethod: "local" },
    { id: "v3", name: "TransLogix Colombia", nit: "830777111-9", bankAccount: "BBVA 0013-554433", category: "Logística", currency: "COP", avgAmount: 3_500_000, country: "CO", taxIdType: "NIT", legalDoc: "RUT", payMethod: "local" },
    { id: "v4", name: "Aseo Integral Bogotá", nit: "900888999-0", bankAccount: "Banco de Bogotá 221-99881", category: "Servicios", currency: "COP", avgAmount: 2_600_000, country: "CO", taxIdType: "NIT", legalDoc: "RUT", payMethod: "local" },
    { id: "v5", name: "DevStudio Remote LLC", nit: "EIN 88-1234567", bankAccount: "Chase 021000021-77441", category: "Tecnología", currency: "USD", avgAmount: 800, agreedAmount: 800, country: "US", taxIdType: "EIN", legalDoc: "W-9", payMethod: "ach" },
    { id: "v6", name: "Paulo Andrade Consultoria", nit: "CNPJ 12.345.678/0001-90", bankAccount: "Itaú SWIFT: ITAUBRSP · 0445-77881-2", category: "Tecnología", currency: "USD", avgAmount: 1_100, agreedAmount: 1_100, country: "BR", taxIdType: "CNPJ", legalDoc: "W-8BEN", payMethod: "swift" },
    { id: "v7", name: "BrightOps Agency Inc", nit: "EIN 47-2093815", bankAccount: "BofA routing 026009593 · 88901234", category: "Servicios", currency: "USD", avgAmount: 950, agreedAmount: 950, country: "US", taxIdType: "EIN", legalDoc: "W-9", payMethod: "ach", payoutCurrency: "COP" },
    { id: "v8", name: "MarketPro Digital S.A.S", nit: "901777333-5", bankAccount: "Bancolombia 555-112233-44", category: "Servicios", currency: "COP", avgAmount: 1_900_000, country: "CO", taxIdType: "NIT", legalDoc: "NINGUNO", payMethod: "local" },
  ],
};

const KEY = "aldia-blinka-agent-v4";
const initial = (): AppState => ({ policies: DEFAULT_POLICIES, invoices: [], audit: [] });
let state: AppState = initial();
let loaded = false;
let saveT: ReturnType<typeof setTimeout> | undefined;
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
    // Persist at most a few times per second so 300/min bursts stay fast.
    if (!saveT) saveT = setTimeout(() => { saveT = undefined; localStorage.setItem(KEY, JSON.stringify(state)); }, 250);
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
