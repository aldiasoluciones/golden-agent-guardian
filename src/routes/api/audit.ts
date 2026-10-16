import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  invoice: z.record(z.any()),
  checks: z.array(z.object({ label: z.string(), passed: z.boolean(), detail: z.string() })),
  policies: z.record(z.any()),
});

const SYSTEM = `Eres "Blinka Agent", un agente de cuentas por pagar que paga facturas en nombre de una empresa colombiana.
Un motor de reglas determinista ya evaluó la factura; sus resultados son la autoridad y NO puedes contradecirlos.
Tu trabajo: auditar en voz alta, en español, de forma breve y concreta.
Formato (texto plano, sin markdown pesado):
1) "Lectura de la factura:" una línea con proveedor, monto y concepto.
2) "Verificaciones:" una viñeta "- " por regla con ✓ o ✗ y por qué importa.
3) "Señales de riesgo:" observaciones adicionales (fraude por cambio de cuenta, fraccionamiento, urgencia sospechosa) o "ninguna".
4) "Decisión:" si todas las reglas pasan, "EJECUTAR PAGO AUTÓNOMO". Si alguna falla, "DETENER Y SOLICITAR APROBACIÓN HUMANA" y explica exactamente qué falló y qué debería revisar la persona.
Máximo 160 palabras.`;

export const Route = createFileRoute("/api/audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
        const { streamResponses, AigError } = await import("@/lib/aig.server");
        const enc = new TextEncoder();
        const send = (c: ReadableStreamDefaultController, o: unknown) => c.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        let gen: ReturnType<typeof streamResponses>;
        let first: IteratorResult<{ type: string; delta?: string; error?: { message?: string } }>;
        try {
          gen = streamResponses(
            {
              reasoning: { effort: "low", summary: "auto" },
              include: ["reasoning.encrypted_content"],
              input: [
                { role: "system", content: SYSTEM },
                { role: "user", content: JSON.stringify(parsed.data) },
              ],
            },
            request.signal,
          );
          first = await gen.next();
        } catch (e) {
          const status = e instanceof AigError ? e.status : 500;
          const msg =
            status === 402 ? "Sin créditos de IA disponibles." : status === 429 ? "Límite de solicitudes de IA, intenta en unos segundos." : (e as Error).message;
          return Response.json({ error: msg }, { status });
        }
        const stream = new ReadableStream({
          async start(c) {
            try {
              let r = first;
              while (!r.done) {
                const ev = r.value;
                if (ev.type === "response.output_text.delta" && ev.delta) send(c, { t: "o", d: ev.delta });
                else if (ev.type === "response.reasoning_summary_text.delta" && ev.delta) send(c, { t: "r", d: ev.delta });
                else if (ev.type === "response.failed" || ev.type === "error") send(c, { t: "e", d: ev.error?.message ?? "Error del modelo" });
                r = await gen.next();
              }
            } catch (e) {
              send(c, { t: "e", d: (e as Error).message });
            }
            c.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache, no-transform" } });
      },
    },
  },
});
