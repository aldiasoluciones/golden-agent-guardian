import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DecideBody, decideApi } from "@/lib/api-decide";
import { verifyIntuit } from "@/lib/provider-signatures";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, intuit-signature" };

const IntuitNotification = z.object({
  eventNotifications: z.array(z.object({
    realmId: z.string().max(40),
    dataChangeEvent: z.object({ entities: z.array(z.object({ name: z.string().max(40), id: z.string().max(40), operation: z.string().max(20) })).max(50) }),
  })).max(20),
});

/** QuickBooks inbound webhook: verifies intuit-signature, then the deterministic engine decides each Bill. Stores nothing. */
export const Route = createFileRoute("/api/public/v1/quickbooks")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => Response.json({ service: "blinkagent QuickBooks webhook", header: "intuit-signature: base64(HMAC-SHA256(cuerpo, verifier token))", sandboxToken: "sandbox", simulated: true }, { headers: CORS }),
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 100_000) return Response.json({ ok: false, error: "Cuerpo demasiado grande" }, { status: 413, headers: CORS });
        const token = process.env["QUICKBOOKS_VERIFIER_TOKEN"] || "sandbox";
        if (!(await verifyIntuit(token, raw, request.headers.get("intuit-signature"))))
          return Response.json({ ok: false, error: "Firma de Intuit inválida o ausente" }, { status: 401, headers: CORS });
        let json: unknown;
        try { json = JSON.parse(raw); } catch { return Response.json({ ok: false, error: "JSON inválido" }, { status: 400, headers: CORS }); }
        const notif = IntuitNotification.safeParse(json);
        if (notif.success) {
          const bills = notif.data.eventNotifications.flatMap((n) => n.dataChangeEvent.entities.filter((e) => e.name === "Bill").map((e) => ({ realmId: n.realmId, ...e })));
          return Response.json({ received: true, source: "quickbooks", bills, next: "Consultar cada Bill en la API de QuickBooks y enviarlo con su detalle (campo bill) para decisión." }, { headers: CORS });
        }
        const bill = json && typeof json === "object" && "bill" in json ? (json as { bill: unknown }).bill : json;
        const parsed = DecideBody.safeParse(bill);
        if (!parsed.success) return Response.json({ ok: false, error: "Bill inválido", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 422, headers: CORS });
        const result = await decideApi(parsed.data);
        return Response.json({ received: true, source: "quickbooks", object: "Bill", ...result }, { headers: CORS });
      },
    },
  },
});
