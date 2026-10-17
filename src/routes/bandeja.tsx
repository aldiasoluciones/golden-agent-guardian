import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Panel, StatusBadge, inputCls } from "@/components/ui-bits";
import { Receipt } from "@/components/receipt";
import { SAMPLES, SAMPLE_META, addInvoice, humanDecision, runAgent, type SampleKey } from "@/lib/agent";
import { extractInvoice } from "@/lib/extract.functions";
import { money } from "@/lib/rules";
import { useAppState } from "@/lib/store";
import type { Check } from "@/lib/types";

export const Route = createFileRoute("/bandeja")({
  head: () => ({
    meta: [
      { title: "Bandeja de facturas — Blinka Agent by AL DIA" },
      { name: "description", content: "Sube facturas o corre los casos trampa del reto y mira al agente de AL DIA pagar, frenar o escalar." },
      { property: "og:title", content: "Bandeja de facturas — Blinka Agent by AL DIA" },
      { property: "og:description", content: "Auditoría en vivo con razonamiento, verificación de reglas y aprobación humana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inbox,
});

const EXPECT_CLS = { pagar: "border-primary/50", frenar: "border-destructive/50", escalar: "border-warning/60" } as const;
const EXPECT_TXT = { pagar: "→ paga", frenar: "→ frena", escalar: "→ escala" } as const;

function Inbox() {
  const { invoices } = useAppState();
  const [sel, setSel] = useState<string | null>(null);
  const [live, setLive] = useState<{ id: string; checks: Check[]; reasoning: string; text: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [upErr, setUpErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const extract = useServerFn(extractInvoice);

  const start = async (id: string) => {
    setSel(id);
    setBusy(true);
    setLive({ id, checks: [], reasoning: "", text: "" });
    await runAgent(id, {
      onCheck: (c) => setLive((l) => l && { ...l, checks: [...l.checks, c] }),
      onText: (k, d) =>
        setLive((l) => l && (k === "r" ? { ...l, reasoning: l.reasoning + d } : k === "o" ? { ...l, text: l.text + d } : { ...l, error: d })),
    });
    setBusy(false);
  };

  const quick = (k: SampleKey) => start(addInvoice(SAMPLES[k]()).id);

  const onFile = async (f: File) => {
    setUpErr("");
    if (f.size > 4_500_000) return setUpErr("El archivo supera 4.5 MB.");
    setUploading(true);
    try {
      const isText = /\.(txt|csv|json|xml|md|eml)$/i.test(f.name) || f.type.startsWith("text/");
      const payload = isText
        ? { fileName: f.name, mime: f.type, text: await f.text() }
        : { fileName: f.name, mime: f.type, dataUrl: await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(f); }) };
      const res = await extract({ data: payload });
      if (!res.ok) return setUpErr(`No se pudo leer la factura: ${res.error}`);
      const x = res.invoice as { number?: string; vendorName?: string; nit?: string; bankAccount?: string; amount?: number; currency?: string; category?: string; dueDate?: string; description?: string };
      const inv = addInvoice({
        number: String(x.number || "S/N"), vendorName: String(x.vendorName || "Desconocido"), nit: String(x.nit || ""),
        bankAccount: String(x.bankAccount || ""), amount: Number(x.amount) || 0, currency: x.currency === "USD" ? "USD" : "COP",
        category: String(x.category || "Otro"), dueDate: String(x.dueDate || ""), description: String(x.description || ""), source: `Archivo: ${f.name}`,
      });
      await start(inv.id);
    } catch (e) {
      setUpErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const cur = invoices.find((i) => i.id === sel);
  const isLive = live && live.id === sel;
  const checks = isLive ? live.checks : cur?.checks ?? [];
  const text = isLive ? live.text : cur?.aiReasoning ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <Panel title="Set del reto · un clic por caso">
          <div className="grid gap-2">
            {SAMPLE_META.map((m) => (
              <button key={m.key} disabled={busy} onClick={() => quick(m.key)}
                className={`rounded-md border-l-4 border border-border px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50 ${EXPECT_CLS[m.expect]}`}>
                <span className="flex justify-between gap-2 font-semibold">{m.label}<span className="font-mono text-[11px] font-normal text-muted-foreground">{EXPECT_TXT[m.expect]}</span></span>
                <span className="block text-xs text-muted-foreground">{m.hint}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Subir factura">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-md border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:border-primary"
          >
            {uploading ? "La IA está leyendo la factura…" : "Arrastra o haz clic · PDF, imagen, correo o chat (texto)"}
          </div>
          <input ref={fileRef} type="file" hidden accept=".pdf,image/*,.txt,.csv,.json,.xml,.eml" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          {upErr && <p className="mt-2 text-sm text-destructive">{upErr}</p>}
          <div className="mt-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold">Facturas PDF de prueba para adjuntar:</p>
            <ul className="space-y-1">
              {[
                ["FACTURE_PA-9410_ORIGINALE.pdf", "Francés · válida"],
                ["FACTURE_PA-9410_DUPLICATA.pdf", "Francés · duplicada"],
                ["RECHNUNG_BER-2026-884.pdf", "Alemán · fuera de lista blanca"],
                ["FATURA_PA-BR-7714.pdf", "Portugués · cuenta falsa"],
                ["INVOICE_TL-5590.pdf", "Inglés · supera el límite"],
              ].map(([f, l]) => (
                <li key={f}><a href={`/downloads/${f}`} download={f} className="text-primary underline">{l}</a></li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel title={`Cuentas por pagar (${invoices.length})`}>
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">Vacía. Usa una prueba rápida.</p>}
          <ul className="space-y-2">
            {invoices.map((i) => (
              <li key={i.id}>
                <button onClick={() => setSel(i.id)} className={`w-full rounded-md border p-3 text-left text-sm ${sel === i.id ? "border-primary bg-secondary" : "border-border hover:bg-secondary"}`}>
                  <div className="flex justify-between gap-2"><span className="truncate">{i.vendorName}</span><span className="font-mono">{money(i.amount, i.currency)}</span></div>
                  <div className="mt-1 flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">{i.number}</span><StatusBadge s={i.status} /></div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="space-y-4">
        {!cur ? (
          <Panel><p className="py-16 text-center text-muted-foreground">Selecciona o crea una factura para ver al agente trabajar.</p></Panel>
        ) : (
          <>
            <Panel title="Factura">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold">{cur.vendorName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{cur.nit} · {cur.number} · vence {cur.dueDate} · {cur.category}</p>
                  <p className="mt-2 text-sm">{cur.description}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">Pagar a: {cur.bankAccount}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-semibold">{money(cur.amount, cur.currency)}</p>
                  <StatusBadge s={cur.status} />
                </div>
              </div>
              {cur.decisionReason && cur.status !== "auditando" && (
                <p className="mt-4 rounded-md bg-secondary p-3 text-sm"><b>Decisión registrada:</b> {cur.decisionReason}</p>
              )}
              {(cur.status === "pendiente" || cur.status === "frenada") && (
                <button onClick={() => start(cur.id)} disabled={busy} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Auditar con el agente</button>
              )}
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Verificación de reglas">
                {checks.length === 0 && <p className="text-sm text-muted-foreground">{busy ? "Evaluando…" : "Sin evaluar."}</p>}
                <ul className="space-y-2">
                  {checks.map((c) => (
                    <li key={c.id} className={`rounded-md border p-3 text-sm ${c.passed ? "border-primary/30" : "border-destructive/50 bg-destructive/10"}`}>
                      <p className="font-semibold"><span className={c.passed ? "text-primary" : "text-destructive"}>{c.passed ? "✓" : "✗"}</span> {c.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Razonamiento del agente">
                {isLive && live.reasoning && <p className="mb-3 whitespace-pre-wrap border-l-2 border-border pl-3 text-xs italic text-muted-foreground">{live.reasoning}</p>}
                {text ? <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{text}{isLive && busy && <span className="animate-pulse">▍</span>}</p>
                  : <p className="text-sm text-muted-foreground">{busy && isLive ? "Pensando…" : "—"}</p>}
                {isLive && live.error && <p className="mt-2 text-xs text-destructive">IA no disponible: {live.error}. El motor de reglas decidió igualmente.</p>}
              </Panel>
            </div>

            {cur.status === "retenida" && <Hitl id={cur.id} failed={(cur.checks ?? []).filter((c) => !c.passed)} />}
            {cur.receipt && <Receipt inv={cur} />}
            {cur.status === "rechazada" && <Panel><p className="text-destructive">✗ Pago rechazado. No se movió dinero.</p></Panel>}
            {cur.status === "frenada" && (
              <Panel><p className="text-destructive">⛔ El agente frenó esta factura. Un cobro duplicado o un beneficiario no permitido nunca se paga, ni siquiera con una excepción. Si el beneficiario es legítimo, agrégalo en Políticas y vuelve a auditar.</p></Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Hitl({ id, failed }: { id: string; failed: Check[] }) {
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [err, setErr] = useState("");
  const act = (ok: boolean) => {
    if (!name.trim() || why.trim().length < 5) return setErr("Escribe tu nombre y una justificación (mín. 5 caracteres).");
    humanDecision(id, ok, name.trim(), why.trim());
  };
  return (
    <section className="rounded-lg border-2 border-warning bg-warning/10 p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-warning">⏸ El agente se detuvo · se requiere tu aprobación</p>
      <p className="mt-2 text-sm">Esta factura viola {failed.length} regla(s) de la empresa. No se movió dinero.</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {failed.map((f) => <li key={f.id}><b>{f.label}:</b> {f.detail}</li>)}
      </ul>
      <div className="mt-4 grid gap-2 sm:grid-cols-[200px_1fr]">
        <input className={inputCls} placeholder="Tu nombre (aprobador)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder="Justificación (ej. verifiqué la cuenta por teléfono con el proveedor)" value={why} onChange={(e) => setWhy(e.target.value)} />
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => act(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Aprobar excepción y pagar</button>
        <button onClick={() => act(false)} className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">Rechazar pago</button>
      </div>
    </section>
  );
}
