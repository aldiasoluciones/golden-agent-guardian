import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState, useTenantId } from "@/lib/store";
import { getTenants } from "@/lib/tenants";
import { fmt } from "@/lib/rules";
import { budgetSummary, reasonBreakdown, TYPOLOGIES } from "@/lib/treasury";
import { exportReconciliation } from "@/lib/reconciliation";
import type { Invoice } from "@/lib/types";

export const Route = createFileRoute("/analitica")({
  head: () => ({ meta: [
    { title: "Analítica y presupuesto — AL DIA · Blinka Agent" },
    { name: "description", content: "Distribución de decisiones, motivos y pagos frente al presupuesto de cada empresa." },
    { property: "og:title", content: "Analítica y presupuesto — AL DIA · Blinka Agent" },
    { property: "og:description", content: "Porcentajes de pagos, frenos y escaladas, con desglose de causas y presupuesto mensual." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Analytics,
});

function Analytics() {
  const state = useAppState();
  const id = useTenantId();
  const company = getTenants().find((t) => t.id === id)?.name ?? id;
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { invoices, policies } = state;
  const budget = budgetSummary(invoices, policies, period);
  const decided = invoices.filter((i) => !["pendiente", "auditando"].includes(i.status));
  const paid = decided.filter((i) => ["pagada", "aprobada"].includes(i.status));
  const rejected = decided.filter((i) => ["frenada", "rechazada"].includes(i.status));
  const escalated = decided.filter((i) => i.status === "retenida");
  const pct = (n: number) => decided.length ? (n / decided.length * 100).toFixed(1) : "0.0";
  const exportExcel = async () => {
    setBusy(true); setError("");
    try { await exportReconciliation(state, company); }
    catch { setError("No se pudo descargar el Excel. Intenta nuevamente."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-mono text-primary">AL DIA · {company}</p><h1 className="text-3xl font-bold">Analítica de decisiones</h1></div><Button variant="outline" disabled={busy} onClick={exportExcel}><Download />{busy ? "Generando Excel…" : "Conciliación Excel"}</Button></header>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <section className="border-y border-border py-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Pagado vs. presupuesto mensual · COP</h2><input aria-label="Mes del presupuesto" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">{[["Pagado", budget.amount], ["Presupuesto", policies.periodLimit], ["Disponible", budget.available]].map(([label, amount]) => <div key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-mono text-2xl">{fmt(Number(amount))}</p></div>)}</div>
      <progress aria-label="Presupuesto utilizado" value={Math.min(100, budget.percent)} max={100} className="mt-5 h-2 w-full" /><p className="mt-2 text-sm text-muted-foreground">{budget.percent.toFixed(1)}% utilizado · pagos del agente y aprobaciones humanas</p>
      {budget.excess > 0 && <p className="mt-2 text-sm text-warning">Exceso autorizado: {fmt(budget.excess)}</p>}
    </section>
    <section><h2 className="text-lg font-semibold">Casos por tipología</h2><p className="mt-1 text-xs text-muted-foreground">{decided.length} decisiones · {invoices.length - decided.length} facturas aún sin decisión · historial de la empresa</p><div className="mt-5 grid gap-5 sm:grid-cols-3">{TYPOLOGIES.map((type) => {
      const n = decided.filter((i) => (type.statuses as readonly string[]).includes(i.status)).length;
      return <div key={type.label} className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{type.label}</p><p className={`mt-2 font-mono text-3xl ${type.color}`}>{pct(n)}%</p><p className="mt-2 text-xs text-muted-foreground">{n} casos</p><progress aria-label={type.label} className="mt-3 h-1 w-full" max={100} value={Number(pct(n))} /></div>;
    })}</div></section>
    <div className="grid gap-8 lg:grid-cols-3"><Reasons title="Pagadas / validadas" invoices={paid} /><Reasons title="Frenadas / rechazadas" invoices={rejected} /><Reasons title="Escaladas pendientes" invoices={escalated} /></div>
    <div className="flex flex-wrap gap-6 border-t border-border pt-5 text-sm text-muted-foreground"><span>Autonomía: {pct(decided.filter((i) => ["pagada", "frenada"].includes(i.status)).length)}%</span><span>Pagos automáticos fuera de reglas: {invoices.filter((i) => i.status === "pagada" && i.checks?.some((c) => !c.passed)).length}</span><span>Explicabilidad: {pct(decided.filter((i) => i.decisionReason).length)}%</span></div>
  </div>;
}

function Reasons({ title, invoices }: { title: string; invoices: Invoice[] }) {
  const rows = reasonBreakdown(invoices);
  return <section><h2 className="font-semibold">{title} · motivos</h2><p className="mt-1 text-xs text-muted-foreground">% sobre {invoices.length} casos; un caso puede tener varios motivos.</p>{!rows.length && <p className="mt-4 text-sm text-muted-foreground">Sin casos</p>}<ul className="mt-4 space-y-4">{rows.map((row) => <li key={row.label}><div className="flex justify-between gap-3 text-sm"><span>{row.label}</span><span className="shrink-0 font-mono">{row.count} · {row.percent.toFixed(1)}%</span></div><progress max={100} value={row.percent} className="mt-2 h-1 w-full" aria-label={row.label} /></li>)}</ul></section>;
}