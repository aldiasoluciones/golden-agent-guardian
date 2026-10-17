import type { Policies } from "./types";

export type Tenant = {
  id: string;
  name: string;
  country: "CO" | "US" | "BR" | "MX" | "CL" | "PE";
  industry: string;
  profile: "Conservador" | "Balanceado" | "Ágil";
};

const FLAGS: Record<Tenant["country"], string> = { CO: "🇨🇴", US: "🇺🇸", BR: "🇧🇷", MX: "🇲🇽", CL: "🇨🇱", PE: "🇵🇪" };
export const flag = (c: Tenant["country"]) => FLAGS[c];

const PREFIX = ["Andes", "Nova", "Cóndor", "Pacífico", "Caribe", "Sierra", "Atlas", "Vértice", "Lumen", "Orbe", "Quantum", "Río", "Delta", "Boreal", "Faro", "Alba", "Cumbre", "Tierra", "Brisa", "Kappa"];
const SUFFIX: [string, string][] = [
  ["Tech", "SaaS"], ["Commerce", "E-commerce"], ["Logistics", "Logística"], ["Studio", "Agencia creativa"], ["Pay", "Fintech"],
];
const COUNTRIES: Tenant["country"][] = ["CO", "US", "BR", "MX", "CL", "PE"];
const LEGAL: Record<Tenant["country"], string> = { CO: "S.A.S", US: "Inc", BR: "Ltda", MX: "S.A. de C.V.", CL: "SpA", PE: "S.A.C." };

/** Small deterministic PRNG so every visitor sees the same 100 companies (no Math.random at module scope). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

let cache: Tenant[] | null = null;
export function getTenants(): Tenant[] {
  if (cache) return cache;
  const list: Tenant[] = [{ id: "t000", name: "AL DIA Demo S.A.S", country: "CO", industry: "Demo del reto", profile: "Balanceado" }];
  for (let i = 1; i < 100; i++) {
    const r = rng(i * 7919);
    const [suf, industry] = SUFFIX[i % SUFFIX.length]!;
    const country = COUNTRIES[Math.floor(r() * COUNTRIES.length)]!;
    const profile = (["Conservador", "Balanceado", "Ágil"] as const)[Math.floor(r() * 3)]!;
    list.push({ id: `t${String(i).padStart(3, "0")}`, name: `${PREFIX[i % PREFIX.length]!} ${suf} ${LEGAL[country]}`, country, industry, profile });
  }
  return (cache = list);
}

export const getTenant = (id: string) => getTenants().find((t) => t.id === id) ?? getTenants()[0]!;

const round = (n: number, step: number) => Math.round(n / step) * step;

/** Each company gets its own policies derived deterministically from its id and risk profile. */
export function policiesFor(id: string, base: Policies): Policies {
  if (id === "t000") return base;
  const t = getTenant(id);
  const r = rng(Number(id.slice(1)) * 104729);
  const k = t.profile === "Conservador" ? 0.4 : t.profile === "Ágil" ? 2.2 : 1;
  const autoPayLimit = round(base.autoPayLimit * k * (0.6 + r() * 0.8), 100_000);
  const budgets = Object.fromEntries(
    Object.entries(base.budgets).map(([c, v]) => [c, round(v * (0.5 + r() * 2) * (k > 1 ? 1.5 : 1), 500_000)]),
  );
  // Drop 0–2 vendors from the whitelist (never the core local supplier v1).
  const drops = new Set<string>();
  const n = Math.floor(r() * 3);
  for (let j = 0; j < n; j++) drops.add(`v${2 + Math.floor(r() * 7)}`);
  return {
    ...base,
    autoPayLimit,
    periodLimit: round(autoPayLimit * (5 + r() * 10), 1_000_000),
    usdRate: round(3_850 + r() * 300, 10),
    agreedTolerance: Math.round((t.profile === "Conservador" ? 2 : 3) + r() * 6),
    fxTolerance: Math.round((1 + r() * 4) * 10) / 10,
    anomalyMultiplier: Math.round(((t.profile === "Ágil" ? 2.5 : 1.5) + r() * 1.5) * 10) / 10,
    requireBankMatch: true,
    blockDuplicates: true,
    requireLegalDoc: t.profile !== "Ágil" || r() > 0.5,
    budgets,
    vendors: base.vendors.filter((v) => !drops.has(v.id)),
  };
}
