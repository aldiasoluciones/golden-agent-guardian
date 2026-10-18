import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { signIntuit, signStripe } from "@/lib/provider-signatures";

type Entry = { at: string; label: string; status: number; summary: string; body: string };
const bill = { vendorName: "Papelería Andina S.A.S", vendorTaxId: "900123456-1", bankAccount: "Bancolombia 123-456789-01", currency: "COP", category: "Suministros", payer: { name: "AL DIA Demo S.A.S" } };

function useLog() {
  const [origin, setOrigin] = useState("https://blinkagent.lovable.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const [log, setLog] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const post = async (label: string, path: string, body: string, headers: Record<string, string>) => {
    setBusy(true);
    try {
      const r = await fetch(origin + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
      const j = await r.json().catch(() => ({}));
      const summary = j.decision ? `${j.decision} · ${j.reason ?? j.decisionReason ?? ""}` : j.status ? `${j.status}${j.reason ? ` · ${j.reason}` : ""}` : j.error ?? "";
      setLog((l) => [{ at: new Date().toLocaleTimeString(), label, status: r.status, summary, body: JSON.stringify(j, null, 2) }, ...l].slice(0, 20));
    } finally { setBusy(false); }
  };
  return { origin, log, busy, post };
}

function Log({ log }: { log: Entry[] }) {
  return log.length ? <div className="space-y-1">{log.map((d, i) => <details key={i} className="rounded border border-border p-2 text-xs">
    <summary className="cursor-pointer font-mono">{d.at} · HTTP {d.status} · {d.label}</summary>
    <p className="mt-1 text-muted-foreground">{d.summary}</p>
    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px]">{d.body}</pre>
  </details>)}</div> : null;
}

export function QuickBooksWebhook() {
  const { origin, log, busy, post } = useLog();
  const send = async (label: string, b: object, tamper = false) => {
    const body = JSON.stringify({ bill: b });
    post(label, "/api/public/v1/quickbooks", body, { "intuit-signature": await signIntuit(tamper ? "clave-falsa" : "sandbox", body) });
  };
  return <section className="space-y-3 rounded-lg border border-border bg-card p-4">
    <h3 className="font-semibold">Webhook QuickBooks · Cuentas por pagar (Bill)</h3>
    <p className="text-xs text-muted-foreground">QuickBooks avisa cada Bill nuevo con la firma oficial de Intuit. El motor decide PAGAR, FRENAR o ESCALAR. Firma falsa: rechazo 401.</p>
    <code className="block break-all rounded bg-muted p-2 font-mono text-xs">POST {origin}/api/public/v1/quickbooks</code>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => send("Bill válido", { number: "QB-BILL-2001", ...bill, amount: 1_200_000 })}>QuickBooks: Bill válido</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => send("Proveedor fuera de lista", { number: "QB-BILL-2002", ...bill, vendorName: "Fantasma Ltda", vendorTaxId: "999000111-2", bankAccount: "Nequi 300-0000000", amount: 900_000 })}>QuickBooks: proveedor fuera de lista</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => send("Firma falsa", { number: "QB-BILL-2003", ...bill, amount: 1_200_000 }, true)}>🔓 Firma falsa</Button>
    </div>
    <Log log={log} />
    <p className="font-mono text-[11px] text-muted-foreground">Cabecera: intuit-signature = base64(HMAC-SHA256(cuerpo, verifier token)). Token sandbox: «sandbox».</p>
  </section>;
}

export function StripeWebhook() {
  const { origin, log, busy, post } = useLog();
  const send = async (label: string, type: string, failure?: string) => {
    const body = JSON.stringify({ id: `evt_${Date.now()}`, type, data: { object: { id: `po_${Math.random().toString(36).slice(2, 10)}`, amount: 120_000_000, currency: "cop", failure_message: failure ?? null, metadata: { invoice: "QB-BILL-2001", vendor: "Papelería Andina S.A.S", receipt_sha256: "demo".padEnd(64, "0") } } } });
    post(label, "/api/public/v1/stripe", body, { "Stripe-Signature": await signStripe("sandbox", body) });
  };
  return <section className="space-y-3 rounded-lg border border-border bg-card p-4">
    <h3 className="font-semibold">Webhook Stripe · Confirmación de pago → QuickBooks</h3>
    <p className="text-xs text-muted-foreground">Stripe confirma el pago con su firma oficial. Si se pagó, se genera el registro BillPayment para QuickBooks; si falló, pasa a revisión humana. Simulado: no mueve dinero.</p>
    <code className="block break-all rounded bg-muted p-2 font-mono text-xs">POST {origin}/api/public/v1/stripe</code>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => send("payout.paid", "payout.paid")}>Stripe: payout pagado</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => send("payout.failed", "payout.failed", "Cuenta destino cerrada")}>Stripe: payout fallido</Button>
    </div>
    <Log log={log} />
    <p className="font-mono text-[11px] text-muted-foreground">Cabecera: Stripe-Signature: t=…,v1=HMAC-SHA256(t.cuerpo). Tolerancia 5 min. Secreto sandbox: «sandbox».</p>
  </section>;
}
