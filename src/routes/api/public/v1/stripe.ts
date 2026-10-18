import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyStripe } from "@/lib/provider-signatures";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature" };

const Event = z.object({
  id: z.string().max(80),
  type: z.string().max(60),
  data: z.object({ object: z.object({
    id: z.string().max(80),
    amount: z.number().nonnegative().max(1e14),
    currency: z.string().max(8),
    failure_message: z.string().max(300).nullish(),
    metadata: z.object({ invoice: z.string().max(80).optional(), receipt_sha256: z.string().max(64).optional(), vendor: z.string().max(200).optional() }).partial().default({}),
  }) }),
});

/** Stripe confirmation webhook: verifies Stripe-Signature and maps payout events to a QuickBooks BillPayment record. Moves no money. */
export const Route = createFileRoute("/api/public/v1/stripe")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => Response.json({ service: "blinkagent Stripe webhook", header: "Stripe-Signature: t=<unix>,v1=<HMAC-SHA256(t.cuerpo)>", sandboxSecret: "sandbox", events: ["payout.paid", "payout.failed", "transfer.created"], simulated: true }, { headers: CORS }),
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 100_000) return Response.json({ ok: false, error: "Cuerpo demasiado grande" }, { status: 413, headers: CORS });
        const secret = process.env["STRIPE_WEBHOOK_SECRET"] || "sandbox";
        if (!(await verifyStripe(secret, raw, request.headers.get("stripe-signature"))))
          return Response.json({ ok: false, error: "Firma de Stripe inválida, ausente o vencida (>5 min)" }, { status: 401, headers: CORS });
        let json: unknown;
        try { json = JSON.parse(raw); } catch { return Response.json({ ok: false, error: "JSON inválido" }, { status: 400, headers: CORS }); }
        const p = Event.safeParse(json);
        if (!p.success) return Response.json({ ok: false, error: "Evento inválido" }, { status: 422, headers: CORS });
        const { type, data: { object: o } } = p.data;
        const meta = o.metadata ?? {};
        if (type === "payout.paid" || type === "transfer.created")
          return Response.json({ received: true, event: type, status: "PAGADO", quickbooks: {
            object: "BillPayment", DocNumber: meta.invoice ?? o.id, TotalAmt: o.amount / 100, CurrencyRef: o.currency.toUpperCase(),
            PrivateNote: `Stripe ${o.id} · blinkagent SHA-256 ${(meta.receipt_sha256 ?? "").slice(0, 16)}`, PayType: "Check",
          } }, { headers: CORS });
        if (type === "payout.failed")
          return Response.json({ received: true, event: type, status: "REVISION_HUMANA", reason: `Pago fallido en Stripe: ${o.failure_message ?? "sin detalle"}. No se registra en QuickBooks; pasa a Validaciones.` }, { headers: CORS });
        return Response.json({ received: true, event: type, status: "IGNORADO" }, { headers: CORS });
      },
    },
  },
});
