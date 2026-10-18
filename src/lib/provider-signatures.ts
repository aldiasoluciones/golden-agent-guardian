/** Pure signature helpers matching the official QuickBooks (Intuit) and Stripe webhook schemes. Web Crypto only (Worker-safe). */
async function hmacBytes(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}
const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Intuit: intuit-signature = base64(HMAC-SHA256(body, verifierToken)). */
export const signIntuit = async (token: string, body: string) => b64(await hmacBytes(token, body));
export async function verifyIntuit(token: string, body: string, header: string | null) {
  return !!header && safeEqual(header, await signIntuit(token, body));
}

export const STRIPE_TOLERANCE_S = 300;
/** Stripe: Stripe-Signature = t=<unix>,v1=hex(HMAC-SHA256(`${t}.${body}`, secret)). */
export async function signStripe(secret: string, body: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${hex(await hmacBytes(secret, `${t}.${body}`))}`;
}
export async function verifyStripe(secret: string, body: string, header: string | null, now = Math.floor(Date.now() / 1000)) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(now - t) > STRIPE_TOLERANCE_S || !parts.v1) return false;
  return safeEqual(parts.v1, hex(await hmacBytes(secret, `${t}.${body}`)));
}
