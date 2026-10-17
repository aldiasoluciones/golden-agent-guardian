import { BackToValidations } from "@/components/back-link";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel, StatusBadge, inputCls } from "@/components/ui-bits";
import { Receipt } from "@/components/receipt";
import { humanDecision, runAgent } from "@/lib/agent";
import { fmt, invCOP, money } from "@/lib/rules";
import { budgetSummary, pendingValidation } from "@/lib/treasury";
import { useAppState } from "@/lib/store";
import type { Check, Invoice } from "@/lib/types";

export const Route = createFileRoute("/bandeja")({
  head: () => ({
    meta: [
      { title: "Bandeja de facturas — blinkagent by AL DIA" },
      { name: "description", content: "Sube facturas o corre los casos trampa del reto y mira al agente de AL DIA pagar, frenar o escalar." },
      { property: "og:title", content: "Bandeja de facturas — blinkagent by AL DIA" },
      { property: "og:description", content: "Auditoría en vivo con razonamiento, verificación de reglas y aprobación humana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <><BackToValidations /><Inbox /></>,
});


export function Inbox() {
  const { invoices, policies } = useAppState();
  const budget = budgetSummary(invoices, policies, new Date().toISOString().slice(0, 7));
  const frozen = invoices.filter((i) => i.status === "frenada" || i.status === "rechazada");
  const protectedCOP = frozen.reduce((s, i) => s + invCOP(i, policies), 0);
  const outside = invoices.filter((i) => i.status === "pagada" && i.checks?.some((c) => !c.passed)).length;
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


  const cur = invoices.find((i) => i.id === sel);
  const isLive = live && live.id === sel;
  const checks = isLive ? live.checks : cur?.checks ?? [];
  const text = isLive ? live.text : cur?.aiReasoning ?? "";

  return (
    <div className="space-y-6">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Pendientes de tu firma" value={String(pendingValidation(invoices).length)} cls="text-warning" />
      <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Pagado vs. presupuesto</p><p className="mt-1 font-mono text-lg">{budget.percent.toFixed(0)}%</p><progress aria-label="Presupuesto utilizado" max={100} value={Math.min(100, budget.percent)} className="mt-2 h-1.5 w-full" /><p className="mt-1 truncate text-[11px] text-muted-foreground">{fmt(budget.amount)} de {fmt(policies.periodLimit)}</p></div>
      <Kpi label="Capital protegido" value={fmt(protectedCOP)} sub={`${frozen.length} frenadas`} cls="text-destructive" />
      <Kpi label="Pagos fuera de reglas" value={String(outside)} sub="Verificado por el motor" cls={outside ? "text-destructive" : "text-primary"} />
    </section>
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <Panel title={`Cuentas por pagar (${invoices.length})`}>
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">Vacía. Envía facturas desde Demo.</p>}
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
                  {cur.payer && (
                    <p className={`mt-2 inline-block rounded border px-2 py-1 text-xs ${cur.payer.status !== "detectado" ? "border-destructive text-destructive" : "border-primary/50 text-primary"}`}>
                      🏢 Pagador: {cur.payer.name} · {cur.payer.status === "detectado" ? `auto-detectado ${cur.payer.how}` : cur.payer.how}
                    </p>
                  )}
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
              <Panel><p className="text-destructive">⛔ El agente frenó esta factura. Un cobro duplicado, un beneficiario no permitido o una factura sin empresa pagadora válida nunca se paga, ni siquiera con una excepción. Si el beneficiario es legítimo, agrégalo en Políticas y vuelve a auditar.</p></Panel>
            )}
          </>
        )}
      </div>
    </div>
    </div>
  );
}

function Kpi({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls: string }) {
  return <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 truncate font-mono text-2xl ${cls}`}>{value}</p>{sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}</div>;
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
