import { createFileRoute } from "@tanstack/react-router";
import { DecideBody, decideApi } from "@/lib/api-decide";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Blinkagent-Signature, X-Blinkagent-Event",
};

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Inbound invoice webhook: verifies HMAC signature, then runs the deterministic engine. Stores nothing. */
export const Route = createFileRoute("/api/public/v1/inbound")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () =>
        Response.json({ service: "blinkagent inbound webhook", usage: "POST con X-Blinkagent-Signature: sha256=<HMAC del cuerpo>. Clave sandbox: 'sandbox'.", simulated: true }, { headers: CORS }),
      POST: async ({ request }) => {
        const t0 = Date.now();
        const raw = await request.text();
        if (raw.length > 100_000) return Response.json({ ok: false, error: "Cuerpo demasiado grande" }, { status: 413, headers: CORS });
        const secret = process.env.INBOUND_WEBHOOK_SECRET || "sandbox";
        const given = (request.headers.get("x-blinkagent-signature") || "").replace(/^sha256=/, "");
        if (!given || !safeEqual(given, await hmac(secret, raw)))
          return Response.json({ ok: false, error: "Firma inválida o ausente" }, { status: 401, headers: CORS });
        let json: unknown;
        try { json = JSON.parse(raw); } catch { return Response.json({ ok: false, error: "JSON inválido" }, { status: 400, headers: CORS }); }
        const payload = json && typeof json === "object" && "invoice" in json ? (json as { invoice: unknown }).invoice : json;
        const parsed = DecideBody.safeParse(payload);
        if (!parsed.success)
          return Response.json({ ok: false, error: "Factura inválida", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 422, headers: CORS });
        const result = await decideApi(parsed.data);
        return Response.json({ received: true, event: request.headers.get("x-blinkagent-event") || "invoice.created", ms: Date.now() - t0, ...result }, { headers: CORS });
      },
    },
  },
});
