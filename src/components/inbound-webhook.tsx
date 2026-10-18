import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const base = { vendorName: "Papelería Andina S.A.S", vendorTaxId: "900123456-1", bankAccount: "Bancolombia 123-456789-01", currency: "COP", category: "Suministros", payer: { name: "AL DIA Demo S.A.S" } };
const CASES: Record<string, { label: string; invoice: object }> = {
  ok: { label: "QuickBooks: Bill válido", invoice: { number: "QB-BILL-1001", ...base, amount: 1_200_000 } },
  fake: { label: "Proveedor fuera de lista", invoice: { number: "WH-2001", ...base, vendorName: "Fantasma Ltda", vendorTaxId: "999000111-2", bankAccount: "Nequi 300-0000000", amount: 900_000 } },
  bank: { label: "Cuenta cambiada", invoice: { number: "WH-3001", ...base, bankAccount: "Nubank 9999-0001", amount: 1_700_000 } },
};

async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(s)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Entry = { at: string; label: string; status: number; decision: string; reason: string; ms: number; body: string };

export function InboundWebhook() {
  const [origin, setOrigin] = useState("https://blinkagent.lovable.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/public/v1/inbound`;
  const [secret, setSecret] = useState("sandbox");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Entry[]>([]);

  const fire = async (k: string, tamper = false) => {
    const c = CASES[k]!;
    setBusy(true);
    const body = JSON.stringify({ event: "invoice.created", invoice: c.invoice });
    const sig = await sign(tamper ? "clave-falsa" : secret, body);
    const t = performance.now();
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Blinkagent-Event": "invoice.created", "X-Blinkagent-Signature": `sha256=${sig}` }, body });
      const j = await r.json().catch(() => ({}));
      setLog((l) => [{ at: new Date().toLocaleTimeString(), label: tamper ? `${c.label} (firma falsa)` : c.label, status: r.status, decision: j.decision || "RECHAZADO", reason: j.reason || j.decisionReason || j.error || "", ms: Math.round(performance.now() - t), body: JSON.stringify(j, null, 2) }, ...l].slice(0, 20));
    } finally { setBusy(false); }
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">API de entrada · Webhook de facturas</h3>
      <p className="text-xs text-muted-foreground">Tu ERP, correo o WhatsApp envía cada factura nueva aquí. El motor responde PAGAR, FRENAR o ESCALAR al instante. Sin firma válida, se rechaza. No guarda datos ni mueve dinero.</p>
      <code className="block break-all rounded bg-muted p-2 font-mono text-xs">POST {url}</code>
      <input aria-label="Clave de firma de entrada" value={secret} onChange={(e) => setSecret(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
      <div className="flex flex-wrap gap-2">
        {Object.entries(CASES).map(([k, c]) => <Button key={k} size="sm" variant="outline" disabled={busy} onClick={() => fire(k)}>{c.label}</Button>)}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => fire("ok", true)}>🔓 Ataque: firma falsa</Button>
      </div>
      {log.length > 0 && <div className="space-y-1">
        <p className="text-xs font-semibold">Webhooks recibidos</p>
        {log.map((d, i) => <details key={i} className="rounded border border-border p-2 text-xs">
          <summary className="cursor-pointer font-mono">{d.at} · HTTP {d.status} · {d.decision} · {d.ms} ms · {d.label}</summary>
          {d.reason && <p className="mt-1 text-muted-foreground">{d.reason}</p>}
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px]">{d.body}</pre>
        </details>)}
      </div>}
      <p className="font-mono text-[11px] text-muted-foreground">Cabecera requerida: X-Blinkagent-Signature: sha256=HMAC-SHA256(cuerpo, clave). Clave sandbox: «sandbox».</p>
    </section>
  );
}
