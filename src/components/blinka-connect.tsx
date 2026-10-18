import { useState } from "react";
import { dispersalOrders } from "@/lib/blinka-connect";
import { createTestWebhook, sendDispersalWebhook } from "@/lib/webhook.functions";
import { useAppState } from "@/lib/store";
import { Button } from "@/components/ui/button";

type Delivery = { at: string; invoices: string; rail: string; status: number; ms: number; ok: boolean; error: string; body: string };

export function BlinkaConnect() {
  const { invoices, policies } = useAppState();
  const [env, setEnv] = useState<"sandbox" | "produccion">("sandbox");
  const [result, setResult] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [sending, setSending] = useState(false);
  const [view, setView] = useState("");
  const [making, setMaking] = useState(false);
  const gen = async () => {
    setMaking(true);
    try { const r = await createTestWebhook(); if (r.ok) { setUrl(r.url); setView(r.viewUrl); setResult("Webhook de prueba listo. Ábrelo en otra pestaña y pulsa Enviar."); } else setResult(r.error); }
    finally { setMaking(false); }
  };
  const [log, setLog] = useState<Delivery[]>([]);
  const orders = dispersalOrders(invoices, policies);
  const test = () =>
    setResult(env === "produccion"
      ? "Producción bloqueada: requiere credenciales y contrato con Blinka."
      : `200 OK (simulado) · Transfer ID: blk_tx_${Math.random().toString(36).slice(2, 10)} · ${orders.length} órdenes listas`);
  const download = () => {
    const u = URL.createObjectURL(new Blob([JSON.stringify({ env, orders }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = u; a.download = "orden-dispersion-blinka.json"; a.click(); URL.revokeObjectURL(u);
  };
  const send = async () => {
    if (env === "produccion") return setResult("Producción bloqueada: el webhook solo envía a entornos de prueba.");
    if (!orders.length) return setResult("No hay facturas aprobadas para enviar. Corre el lote Jurados en Demo.");
    setSending(true);
    const batch = orders.slice(-10);
    try {
      const r = await sendDispersalWebhook({ data: { url: url.trim(), secret: secret.trim(), orders: batch } });
      setLog((l) => [{ at: new Date().toLocaleTimeString(), invoices: batch.map((o) => o.invoice).join(", "), rail: [...new Set(batch.map((o) => o.rail))].join("/"), ...r }, ...l].slice(0, 20));
      setResult(r.ok ? `Entregado · HTTP ${r.status} · ${r.ms} ms` : `Falló · ${r.status || ""} ${r.error}`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "URL inválida");
    } finally { setSending(false); }
  };
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">API de salida · Blinka → Stripe → QuickBooks</h3>
      <p className="font-mono text-[11px] text-primary">QuickBooks (cuenta por pagar) → blinkagent (reglas) → Blinka/Stripe (pago) → QuickBooks (BillPayment conciliado)</p>
      <p className="text-xs text-muted-foreground">Solo las facturas aprobadas por las reglas o por una persona generan orden (Stripe, ACH, Bre-B, Pix, SPEI, USDC) y su registro de pago para QuickBooks. Las frenadas o en revisión nunca salen. Simulado: no mueve dinero.</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select aria-label="Entorno" value={env} onChange={(e) => setEnv(e.target.value as typeof env)} className="rounded-md border border-border bg-background px-2 py-1">
          <option value="sandbox">Sandbox Blinka</option>
          <option value="produccion">Producción</option>
        </select>
        <Button size="sm" variant="outline" onClick={test}>Probar conexión</Button>
        <Button size="sm" variant="outline" onClick={download}>Descargar orden ({orders.length})</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input aria-label="URL del webhook" placeholder="https://webhook.site/…" value={url} onChange={(e) => setUrl(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm" />
        <input aria-label="Clave de firma" type="password" placeholder="Clave de firma (HMAC)" value={secret} onChange={(e) => setSecret(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={gen} disabled={making}>{making ? "Generando…" : "⚡ Generar webhook de prueba"}</Button>
        {view && <a href={view} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Ver entregas en webhook.site ↗</a>}
      </div>
      <Button size="sm" onClick={send} disabled={sending || !url}>{sending ? "Enviando…" : "Enviar webhook en vivo"}</Button>
      {result && <p className="font-mono text-xs">{result}</p>}
      {log.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold">Registro de entregas</p>
          {log.map((d, i) => (
            <details key={i} className="rounded border border-border p-2 text-xs">
              <summary className="cursor-pointer font-mono">{d.at} · {d.ok ? "✓" : "✗"} HTTP {d.status || "—"} · {d.ms} ms · {d.rail}</summary>
              <p className="mt-1 break-all text-muted-foreground">{d.invoices}{d.error && ` · ${d.error}`}</p>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px]">{d.body}</pre>
            </details>
          ))}
        </div>
      )}
      <p className="font-mono text-[11px] text-muted-foreground">Cabeceras: X-Blinkagent-Signature (HMAC SHA-256), X-Idempotency-Key, X-Blinkagent-Event. Producción pendiente de contrato con Blinka.</p>
    </section>
  );
}
