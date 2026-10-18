import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Order = z.object({
  idempotency_key: z.string().max(64),
  invoice: z.string().max(80),
  payee: z.string().max(200),
  account: z.string().max(120),
  amount: z.number(),
  currency: z.string().max(8),
  rail: z.string().max(10),
  approval: z.string().max(40),
  reason: z.string().max(1000),
});

const Input = z.object({
  url: z.string().url().max(500),
  secret: z.string().max(200),
  orders: z.array(Order).min(1).max(50),
});

function blocked(host: string) {
  return /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$)/i.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host.endsWith(".internal");
}

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sends simulated dispersal orders to a user-supplied test webhook; never moves money. */
export const sendDispersalWebhook = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const u = new URL(data.url);
    if (u.protocol !== "https:" || blocked(u.hostname)) return { ok: false, status: 0, ms: 0, error: "Solo se permiten URLs https públicas", signature: "", body: "" };
    const body = JSON.stringify({ event: "dispersal.initiated", simulated: true, sent_at: new Date().toISOString(), orders: data.orders });
    const signature = await hmac(data.secret || "sandbox", body);
    const t0 = Date.now();
    try {
      const res = await fetch(u.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Blinkagent-Event": "dispersal.initiated",
          "X-Blinkagent-Signature": `sha256=${signature}`,
          "X-Idempotency-Key": data.orders.map((o) => o.idempotency_key).join(",").slice(0, 200),
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      return { ok: res.ok, status: res.status, ms: Date.now() - t0, error: "", signature, body };
    } catch (e) {
      return { ok: false, status: 0, ms: Date.now() - t0, error: e instanceof Error ? e.message : "Error de red", signature, body };
    }
  });

/** Creates a temporary public test receiver on webhook.site for live demos. */
export const createTestWebhook = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const res = await fetch("https://webhook.site/token", { method: "POST", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, url: "", viewUrl: "", error: `webhook.site respondió ${res.status}` };
    const { uuid } = (await res.json()) as { uuid?: string };
    if (!uuid) return { ok: false, url: "", viewUrl: "", error: "Respuesta inválida" };
    return { ok: true, url: `https://webhook.site/${uuid}`, viewUrl: `https://webhook.site/#!/view/${uuid}`, error: "" };
  } catch {
    return { ok: false, url: "", viewUrl: "", error: "No se pudo crear el webhook. Abre webhook.site y pega tu URL." };
  }
});
