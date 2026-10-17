import { createFileRoute } from "@tanstack/react-router";
import { DecideBody, decideApi } from "@/lib/api-decide";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/v1/decide")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () =>
        Response.json(
          { service: "blinkagent by AL DIA", usage: "POST JSON a esta URL. Documentación en /api-docs", simulated: true },
          { headers: CORS },
        ),
      POST: async ({ request }) => {
        const raw = await request.json().catch(() => null);
        const parsed = DecideBody.safeParse(raw);
        if (!parsed.success)
          return Response.json(
            { ok: false, error: "Solicitud inválida", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
            { status: 400, headers: CORS },
          );
        return Response.json(await decideApi(parsed.data), { headers: CORS });
      },
    },
  },
});
