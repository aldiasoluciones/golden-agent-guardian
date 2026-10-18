import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, inputCls } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: "API REST para jurados — blinkagent by AL DIA" },
      { name: "description", content: "Envía una factura por curl o Postman y recibe en milisegundos si el agente la paga, la frena o la escala." },
      { property: "og:title", content: "API REST — blinkagent by AL DIA" },
      { property: "og:description", content: "Prueba el motor de decisiones en vivo: PAGAR, FRENAR o ESCALAR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApiDocs,
});

const payer = { name: "AL DIA Demo S.A.S" };
const base = { vendorName: "Papelería Andina S.A.S", vendorTaxId: "900123456-1", bankAccount: "Bancolombia 123-456789-01", currency: "COP", category: "Suministros", payer };

const PRESETS: Record<string, { label: string; body: object }> = {
  pagar: { label: "✅ Válida (PAGAR)", body: { number: "API-1001", ...base, amount: 1_650_000, description: "Resmas y útiles" } },
  desconocido: { label: "🛑 Proveedor desconocido (FRENAR)", body: { number: "API-2001", ...base, vendorName: "Fantasma Ltda", vendorTaxId: "999000111-2", bankAccount: "Nequi 300-0000000", amount: 900_000 } },
  duplicada: {
    label: "🛑 Duplicada (FRENAR)",
    body: { number: "API-1001", ...base, amount: 1_650_000, history: [{ number: "API-1001", vendorName: base.vendorName, vendorTaxId: base.vendorTaxId, bankAccount: base.bankAccount, amount: 1_650_000, currency: "COP", category: "Suministros" }] },
  },
  cuenta: { label: "⚠️ Cuenta bancaria cambiada (ESCALAR)", body: { number: "API-3001", ...base, bankAccount: "Nubank 9999-0001", amount: 1_700_000 } },
  limite: { label: "⚠️ Supera límite (ESCALAR)", body: { number: "API-4001", ...base, vendorName: "Servicios Cloud Nova", vendorTaxId: "901555222-3", bankAccount: "Davivienda 0045-778812", category: "Tecnología", amount: 8_900_000 } },
  sinPagador: { label: "🛑 Sin pagador (FRENAR)", body: { number: "API-5001", vendorName: base.vendorName, vendorTaxId: base.vendorTaxId, bankAccount: base.bankAccount, amount: 500_000, currency: "COP", category: "Suministros" } },
};

export function ApiDocs({ embedded = false }: { embedded?: boolean }) {
  const [origin, setOrigin] = useState("https://blinkagent.lovable.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/public/v1/decide`;
  const [body, setBody] = useState(JSON.stringify(PRESETS["pagar"]?.body, null, 2));
  const [res, setRes] = useState<{ status: number; ms: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<"curl" | "js" | "py">("curl");

  const send = async () => {
    setBusy(true);
    const t = performance.now();
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const j = await r.text();
      let pretty = j;
      try { pretty = JSON.stringify(JSON.parse(j), null, 2); } catch { /* keep raw */ }
      setRes({ status: r.status, ms: Math.round(performance.now() - t), text: pretty });
    } catch (e) {
      setRes({ status: 0, ms: 0, text: String(e) });
    }
    setBusy(false);
  };

  const compact = (() => { try { return JSON.stringify(JSON.parse(body)); } catch { return body; } })();
  const snippet =
    lang === "curl"
      ? `curl -X POST ${url} \\\n  -H "Content-Type: application/json" \\\n  -d '${compact}'`
      : lang === "js"
        ? `const r = await fetch("${url}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(${body}),\n});\nconsole.log(await r.json());`
        : `import requests\nr = requests.post("${url}", json=${body.replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\bnull\b/g, "None")})\nprint(r.json())`;
  const decision = res && (() => { try { return JSON.parse(res.text).decision as string; } catch { return null; } })();

  return (
    <div className="space-y-6">
      {!embedded && <div>
        <h1 className="text-2xl font-bold">API REST para jurados</h1>
        <p className="text-sm text-muted-foreground">
          Envía una factura en JSON y el motor de reglas responde PAGAR, FRENAR o ESCALAR con el porqué. Pagos simulados: no se mueve dinero.
        </p>
      </div>}

      <Panel title="Endpoint">
        <div className="space-y-2 text-sm">
          <code className="block break-all rounded bg-muted p-2 font-mono">POST {url}</code>
          <p className="text-muted-foreground">
            Campos: <b>number, vendorName, vendorTaxId, bankAccount, amount</b> (obligatorios), currency (COP|USD), category, dueDate, description,
            <b> payer</b> {"{ name, taxId, email }"} para que el agente detecte la empresa pagadora, o <b>tenantId</b> (t000–t099), y
            <b> history</b> (facturas previas, para detectar duplicados). Sin pagador → se frena.
          </p>
        </div>
      </Panel>

      <div className={embedded ? "grid gap-6" : "grid gap-6 lg:grid-cols-2"}>
        <Panel title="Probador en vivo">
          <div className="mb-3 flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([k, p]) => (
              <Button key={k} onClick={() => setBody(JSON.stringify(p.body, null, 2))} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                {p.label}
              </Button>
            ))}
          </div>
          <textarea aria-label="Factura JSON de entrada" value={body} onChange={(e) => setBody(e.target.value)} rows={16} className={`${inputCls} font-mono text-xs`} spellCheck={false} />
          <Button onClick={send} disabled={busy} className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {busy ? "Enviando…" : "Enviar al motor"}
          </Button>
        </Panel>

        <Panel title="Respuesta">
          {res ? (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded bg-muted px-2 py-0.5 font-mono">HTTP {res.status}</span>
                <span className="text-muted-foreground">{res.ms} ms ida y vuelta</span>
                {decision && (
                  <span className={`rounded px-2 py-0.5 font-bold ${decision === "PAGAR" ? "bg-primary text-primary-foreground" : decision === "FRENAR" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}`}>
                    {decision}
                  </span>
                )}
              </div>
              <pre className="max-h-[480px] overflow-auto rounded bg-muted p-3 text-xs">{res.text}</pre>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Elige un caso y pulsa «Enviar al motor».</p>
          )}
        </Panel>
      </div>

      <Panel title="Copiar y pegar">
        <div className="mb-2 flex gap-2">
          {(["curl", "js", "py"] as const).map((l) => (
            <Button key={l} onClick={() => setLang(l)} className={`rounded-md px-3 py-1 text-xs ${lang === l ? "bg-primary text-primary-foreground" : "border border-border"}`}>
              {l === "curl" ? "curl" : l === "js" ? "JavaScript" : "Python"}
            </Button>
          ))}
          <Button onClick={() => navigator.clipboard.writeText(snippet)} className="ml-auto rounded-md border border-border px-3 py-1 text-xs">Copiar</Button>
        </div>
        <pre className="overflow-auto rounded bg-muted p-3 text-xs">{snippet}</pre>
      </Panel>
    </div>
  );
}
