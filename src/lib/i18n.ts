import { useSyncExternalStore } from "react";

export type Lang = "es" | "en";

const KEY = "aldia-lang";
let lang: Lang = "es";
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const v = window.localStorage.getItem(KEY);
  if (v === "en" || v === "es") lang = v;
}

export function setLang(l: Lang) {
  lang = l;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, l);
    document.documentElement.lang = l;
  }
  subs.forEach((f) => f());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => (load(), lang),
    () => "es" as const,
  );
}

const T = {
  es: {
    nav_treasury: "Tesorería",
    nav_inbox: "Bandeja de facturas",
    nav_channels: "WhatsApp y Correo",
    nav_policies: "Políticas",
    nav_audit: "Registro de auditoría",
    tagline: "Reto Blinka · pagos simulados",
    footer: "Producto de AL DIA · Powered by ALJ · Datos ficticios, ningún pago real",
    hero_kicker: "AL DIA · Reto Blinka",
    hero_title: "Agentes que pagan por la empresa",
    hero_sub:
      "El agente de AL DIA lee cada factura —en cualquier idioma— y decide: la paga si cumple tus reglas, la frena si es indebida o la escala a una persona cuando algo se sale de ellas. Siempre explica por qué.",
    step1_t: "Define las reglas",
    step1_d: "Límites por pago y por mes, beneficiarios permitidos, documentos legales (RUT, W-9, W-8), presupuestos, montos acordados.",
    step2_t: "Corre el set de facturas",
    step2_d: "Casos normales y las trampas del reto, en COP y USD, por WhatsApp, correo o archivo. Un clic cada uno o todos juntos.",
    step3_t: "Revisa qué decidió y por qué",
    step3_d: "Pagó, frenó o escaló. Cada decisión queda explicada y verificable en el registro.",
    run_set: "▶ Correr el set completo del reto",
    running: "Procesando",
    see_live: "Ver al agente razonar en vivo",
    reset: "Reiniciar",
    autonomy: "Autonomía",
    security: "Seguridad",
    explainability: "Explicabilidad",
  },
  en: {
    nav_treasury: "Treasury",
    nav_inbox: "Invoice inbox",
    nav_channels: "WhatsApp & Email",
    nav_policies: "Policies",
    nav_audit: "Audit log",
    tagline: "Blinka Challenge · simulated payments",
    footer: "An AL DIA product · Powered by ALJ · Fictional data, no real payments",
    hero_kicker: "AL DIA · Blinka Challenge",
    hero_title: "Agents that pay for the company",
    hero_sub:
      "The AL DIA agent reads every invoice —in any language— and decides: it pays it if it meets your rules, freezes it if it's improper, or escalates it to a person when something falls outside them. It always explains why.",
    step1_t: "Set the rules",
    step1_d: "Per-payment and monthly limits, allowed payees, legal documents (RUT, W-9, W-8), budgets, agreed amounts.",
    step2_t: "Run the invoice set",
    step2_d: "Normal cases and the challenge traps, in COP and USD, via WhatsApp, email or file. One click each or all at once.",
    step3_t: "Review what it decided and why",
    step3_d: "Paid, frozen or escalated. Every decision is explained and verifiable in the log.",
    run_set: "▶ Run the full challenge set",
    running: "Processing",
    see_live: "Watch the agent reason live",
    reset: "Reset",
    autonomy: "Autonomy",
    security: "Security",
    explainability: "Explainability",
  },
} as const;

export type TKey = keyof (typeof T)["es"];

export function t(l: Lang, k: TKey): string {
  return T[l][k];
}
