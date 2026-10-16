import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Panel, StatusBadge } from "@/components/ui-bits";
import { runGoldenSet } from "@/lib/agent";
import { fmt, invCOP, money, spentByCategory } from "@/lib/rules";
import { store, useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blinka Agent by AL DIA — Agentes que pagan por la empresa" },
      { name: "description", content: "Producto de AL DIA: un agente que paga facturas dentro de las reglas, frena lo indebido y escala a una persona lo que se sale de ellas." },
      { property: "og:title", content: "Blinka Agent by AL DIA" },
      { property: "og:description", content: "Pagó, frenó o escaló: cada decisión del agente explicada y auditada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const STEPS = [
  { n: "01", t: "Define las reglas", d: "Límites por pago y por mes, beneficiarios permitidos, presupuestos, montos acordados.", to: "/politicas" },
  { n: "02", t: "Corre el set de facturas", d: "8 casos: normales y las 5 trampas del reto. Un clic cada uno o todos juntos.", to: "/bandeja" },
  { n: "03", t: "Revisa qué decidió y por qué", d: "Pagó, frenó o escaló. Cada decisión queda explicada en el registro.", to: "/auditoria" },
] as const;

function Dashboard() {
  const { invoices, audit, policies } = useAppState();
  const [prog, setProg] = useState<{ done: number; total: number; label: string } | null>(null);
  const running = !!prog && prog.done < prog.total;

  const by = (...s: string[]) => invoices.filter((i) => s.includes(i.status));
  const sum = (l: typeof invoices) => l.reduce((a, i) => a + invCOP(i, policies), 0);
  const paid = by("pagada"), frozen = by("frenada"), escalated = by("retenida", "aprobada", "rechazada"), waiting = by("retenida");
  const decided = [...paid, ...frozen, ...escalated];
  const autonomy = decided.length ? Math.round(((paid.length + frozen.length) / decided.length) * 100) : 0;
  // Security: any invoice paid without human approval while a rule failed would be a violation.
  const violations = invoices.filter((i) => i.status === "pagada" && (i.checks ?? []).some((c) => !c.passed)).length;
  const explained = decided.length ? Math.round((decided.filter((i) => i.decisionReason).length / decided.length) * 100) : 0;
  const spent = spentByCategory(invoices, policies);

  const runAll = async () => {
    await runGoldenSet((done, total, label) => setProg({ done, total, label }));
  };

  const cols = [
    { t: "Pagó", list: paid, cls: "text-primary", border: "border-primary" },
    { t: "Frenó", list: frozen, cls: "text-destructive", border: "border-destructive" },
    { t: "Escaló a una persona", list: escalated, cls: "text-warning", border: "border-warning" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">AL DIA · Reto Blinka</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Agentes que pagan por la empresa</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          El agente de AL DIA lee cada factura y decide: la paga si cumple tus reglas, la frena si es indebida o la escala a una persona cuando algo se sale de ellas. Siempre explica por qué.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {STEPS.map((s) => (
            <Link key={s.n} to={s.to} className="rounded-lg border border-border p-4 hover:border-primary">
              <span className="font-mono text-2xl font-bold text-primary">{s.n}</span>
              <p className="mt-1 font-semibold">{s.t}</p>
              <p className="text-xs text-muted-foreground">{s.d}</p>
            </Link>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={runAll} disabled={running} className="rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {running ? `Procesando ${prog!.done + 1}/${prog!.total}: ${prog!.label}…` : "▶ Correr el set completo del reto"}
          </button>
          <Link to="/bandeja" className="rounded-md border border-border px-5 py-2.5 font-semibold hover:bg-secondary">Ver al agente razonar en vivo</Link>
          {invoices.length > 0 && !running && (
            <button onClick={() => confirm("¿Reiniciar el demo?") && store.reset()} className="text-sm text-muted-foreground underline">Reiniciar</button>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <p className="text-xs text-muted-foreground">Autonomía</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-primary">{autonomy}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{paid.length + frozen.length} de {decided.length} facturas decididas sin intervención humana</p>
        </Panel>
        <Panel>
          <p className="text-xs text-muted-foreground">Seguridad</p>
          <p className={`mt-2 font-mono text-3xl font-semibold ${violations ? "text-destructive" : "text-primary"}`}>{violations}</p>
          <p className="mt-1 text-xs text-muted-foreground">pagos fuera de reglas sin aprobación humana{violations ? "" : " · verificado"}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-muted-foreground">Explicabilidad</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-primary">{explained}%</p>
          <p className="mt-1 text-xs text-muted-foreground">de las decisiones tienen su porqué registrado</p>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pagado por el agente", sum(paid), paid.length, "text-primary"],
          ["Pagado con aprobación humana", sum(by("aprobada")), by("aprobada").length, "text-foreground"],
          ["Retenido · espera aprobación", sum(waiting), waiting.length, "text-warning"],
          ["Frenado o rechazado", sum([...frozen, ...by("rechazada")]), frozen.length + by("rechazada").length, "text-destructive"],
        ].map(([l, v, n, c]) => (
          <Panel key={l as string}>
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className={`mt-2 font-mono text-xl font-semibold ${c}`}>{fmt(v as number)}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{n} factura(s)</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => (
          <Panel key={c.t} title={`${c.t} (${c.list.length})`}>
            {c.list.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
            <ul className="space-y-3">
              {c.list.map((i) => (
                <li key={i.id} className={`border-l-2 pl-3 text-sm ${c.border}`}>
                  <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{i.vendorName}</span><span className="font-mono text-xs">{money(i.amount, i.currency)}</span></div>
                  <div className="my-1"><StatusBadge s={i.status} /></div>
                  <p className="text-xs text-muted-foreground">{i.decisionReason}</p>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Ejecución de presupuesto (COP)">
          <div className="space-y-4">
            {Object.entries(policies.budgets).map(([cat, b]) => {
              const s = spent[cat] ?? 0;
              const pct = Math.min(100, (s / b) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm"><span>{cat}</span><span className="font-mono text-xs text-muted-foreground">{fmt(s)} / {fmt(b)}</span></div>
                  <div className="mt-1 h-2 rounded bg-muted"><div className={`h-2 rounded ${pct > 85 ? "bg-warning" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Auditoría en tiempo real">
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos aún. Corre el set completo para empezar.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-auto">
              {audit.slice(0, 12).map((e) => (
                <li key={e.id} className="border-l-2 border-border pl-3 text-sm">
                  <span className="font-mono text-[11px] text-muted-foreground">{new Date(e.at).toLocaleTimeString("es-CO")} · {e.type}</span>
                  <p>{e.message}</p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/auditoria" className="mt-3 inline-block text-sm text-primary">Ver registro completo →</Link>
        </Panel>
      </div>
    </div>
  );
}
