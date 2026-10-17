import { useSyncExternalStore } from "react";
import { policiesFor } from "./tenants";
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

const BASE = "aldia-blinka-agent-v4";
const TENANT_KEY = "aldia-tenant";
let tenantId = "t000";
const keyFor = (id: string) => (id === "t000" ? BASE : `${BASE}:${id}`);
const initial = (id = tenantId): AppState => ({ policies: policiesFor(id, DEFAULT_POLICIES), invoices: [], audit: [] });
let state: AppState = initial();
let loaded = false;
let saveT: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();
const tenantSubs = new Set<() => void>();
export const JURY_SOURCE = "Lote jurados: ";
let jurySession: Map<string, { original: AppState; result: AppState }> | undefined;

function enterJuryTenant(id: string) {
  const saved = jurySession?.get(id);
  if (saved) { state = saved.result; return; }
  readTenant(id);
  const original = state;
  state = initial(id);
  jurySession?.set(id, { original, result: state });
}

/** Evaluate against a clean fixture, then replace only this suite's tagged records. */
export async function runJurySession(run: () => Promise<void>) {
  load();
  if (jurySession) throw new Error("El lote jurados ya está en ejecución.");
  flush();
  const startingTenant = tenantId;
  const session = new Map<string, { original: AppState; result: AppState }>();
  jurySession = session;
  enterJuryTenant(tenantId);
  try { await run(); }
  finally {
    const active = session.get(tenantId);
    if (active) active.result = state;
    jurySession = undefined;
    for (const [id, { original, result }] of session) {
      const removed = new Set(original.invoices.filter((i) => i.source.startsWith(JURY_SOURCE)).map((i) => i.id));
      const merged: AppState = {
        policies: original.policies,
        invoices: [...result.invoices, ...original.invoices.filter((i) => !removed.has(i.id))],
        audit: [...result.audit, ...original.audit.filter((e) => !e.invoiceId || !removed.has(e.invoiceId))],
      };
      localStorage.setItem(keyFor(id), JSON.stringify(merged));
    }
    tenantId = startingTenant;
    localStorage.setItem(TENANT_KEY, tenantId);
    readTenant(tenantId);
    subs.forEach((f) => f());
    tenantSubs.forEach((f) => f());
  }
}

function readTenant(id: string) {
  try {
    const raw = localStorage.getItem(keyFor(id));
    state = raw ? { ...initial(id), ...JSON.parse(raw) } : initial(id);
  } catch {
    state = initial(id);
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  tenantId = localStorage.getItem(TENANT_KEY) || "t000";
  readTenant(tenantId);
}

function flush() {
  if (saveT) clearTimeout(saveT);
  saveT = undefined;
  if (jurySession) return;
  localStorage.setItem(keyFor(tenantId), JSON.stringify(state));
}

export const store = {
  get: () => (load(), state),
  set(fn: (s: AppState) => AppState) {
    load();
    state = fn(state);
    // Persist at most a few times per second so 300/min bursts stay fast.
    if (!jurySession && !saveT) saveT = setTimeout(flush, 250);
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyFor(tenantId) && e.newValue) {
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

/** Switch the active client company: each one keeps its own policies, invoices and audit log. */
export function setTenant(id: string) {
  load();
  if (id === tenantId) return;
  const active = jurySession?.get(tenantId);
  if (active) active.result = state;
  flush();
  tenantId = id;
  if (jurySession) enterJuryTenant(id);
  else { localStorage.setItem(TENANT_KEY, id); readTenant(id); }
  subs.forEach((f) => f());
  tenantSubs.forEach((f) => f());
}
export const currentTenant = () => (load(), tenantId);
export function useTenantId() {
  return useSyncExternalStore(
    (f) => (tenantSubs.add(f), () => tenantSubs.delete(f)),
    () => (load(), tenantId),
    () => "t000",
  );
}

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
