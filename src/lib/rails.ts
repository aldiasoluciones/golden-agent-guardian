import type { Country, Currency, PayMethod } from "./types";

/** Demo rates to COP (editable via policies.fxToCOP). USD uses policies.usdRate. Not live market data. */
export const FX_COP: Record<Currency, number> = {
  COP: 1, USD: 4_000, EUR: 4_350, BRL: 730, MXN: 215, ARS: 4.2, CLP: 4.3, PEN: 1_070, BOB: 580, CRC: 7.9, ZAR: 220,
};
export const CURRENCIES = Object.keys(FX_COP) as Currency[];

export type Rail = "BRE-B" | "SEPA" | "PIX" | "SPEI" | "CBU" | "LOCAL-BANK" | "ACH" | "WIRE" | "SWIFT" | "USD-LOCAL" | "USDC" | "STRIPE";
export type RailInfo = { rail: Rail; scope: "local" | "usd-local" | "usd-intl" | "crypto"; label: string };

const EU: Country[] = ["DE", "FR", "ES", "IT", "NL", "PT"];
const LOCAL_CCY: Partial<Record<Country, Currency>> = { CO: "COP", BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", PE: "PEN", BO: "BOB", CR: "CRC", ZA: "ZAR" };
const USD_LOCAL: Country[] = ["PE", "PA", "CN", "HK"];

/** Blinka public corridors (demo): local currency rails, local USD routes, US ACH/Wire, SWIFT otherwise. */
export function railFor(country: Country | undefined, currency: Currency, account = "", payMethod?: PayMethod): RailInfo | null {
  if (/0x[0-9a-f]{6,}/i.test(account)) return { rail: "USDC", scope: "crypto", label: "USDC (wallet en lista blanca)" };
  if (/^acct_/i.test(account)) return { rail: "STRIPE", scope: "usd-intl", label: "Stripe Connect" };
  const c = country ?? "CO";
  if (currency === "EUR") return EU.includes(c) ? { rail: "SEPA", scope: "local", label: "SEPA (EUR)" } : null;
  if (currency !== "USD") {
    if (LOCAL_CCY[c] !== currency) return null;
    const rail: Rail = c === "CO" ? "BRE-B" : c === "BR" ? "PIX" : c === "MX" ? "SPEI" : c === "AR" ? "CBU" : "LOCAL-BANK";
    const names: Partial<Record<Rail, string>> = { "BRE-B": "Bre-B (COP)", PIX: "Pix · TED (BRL)", SPEI: "SPEI (MXN)", CBU: "CBU / CVU / Alias (ARS)" };
    return { rail, scope: "local", label: names[rail] ?? `Transferencia local (${currency})` };
  }
  if (c === "US") return payMethod === "swift" ? { rail: "WIRE", scope: "usd-intl", label: "Wire (USD)" } : { rail: "ACH", scope: "usd-intl", label: "ACH (USD)" };
  if (USD_LOCAL.includes(c)) return { rail: "USD-LOCAL", scope: "usd-local", label: `Ruta local USD (${c})` };
  return { rail: "SWIFT", scope: "usd-intl", label: "SWIFT (USD)" };
}

/** Demo format check of the destination account for each rail. */
export function accountFits(rail: Rail, account: string): boolean {
  const a = account.toUpperCase();
  const d = account.replace(/\D/g, "");
  switch (rail) {
    case "SEPA": return /\b[A-Z]{2}\d{2}[A-Z0-9 ]{11,30}/.test(a.replace(/IBAN[: ]*/, ""));
    case "PIX": return /PIX|TED/.test(a);
    case "SPEI": return /CLABE/.test(a) && /\d{18}/.test(account.replace(/\s/g, ""));
    case "CBU": return /\d{22}/.test(account.replace(/\s/g, "")) || /ALIAS[: ]+[A-Z0-9.]{6,20}/.test(a);
    case "ACH": return /\b\d{9}\b/.test(a);
    case "WIRE": case "SWIFT": case "USD-LOCAL": return /SWIFT[: ]?[A-Z0-9]{8,11}/.test(a) || /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b/.test(a);
    case "LOCAL-BANK": return d.length >= 6;
    default: return true;
  }
}

export const RAIL_HINT: Record<Rail, string> = {
  "BRE-B": "cuenta o llave Bre-B", SEPA: "IBAN europeo", PIX: "llave Pix o datos TED", SPEI: "CLABE de 18 dígitos",
  CBU: "CBU/CVU de 22 dígitos o alias", "LOCAL-BANK": "número de cuenta local", ACH: "routing ACH de 9 dígitos",
  WIRE: "código SWIFT/BIC", SWIFT: "código SWIFT/BIC", "USD-LOCAL": "código SWIFT/BIC del banco local", USDC: "wallet", STRIPE: "cuenta Stripe",
};
