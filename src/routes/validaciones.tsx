import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, BarChart3, Inbox, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewCase } from "@/components/review-case";
import { useAppState, useTenantId } from "@/lib/store";
import { getTenants } from "@/lib/tenants";
import { budgetSummary, pendingValidation } from "@/lib/treasury";
import { fmt, invCOP } from "@/lib/rules";

export const Route = createFileRoute("/validaciones")({
  head: () => ({ meta: [
    { title: "Centro de Comando Financiero — AL DIA · blinkagent" },
    { name: "description", content: "Casos que requieren firma humana, presupuesto del mes y capital protegido de la empresa activa." },
    { property: "og:title", content: "Centro de Comando Financiero — AL DIA · blinkagent" },
    { property: "og:description", content: "Rigor bancario, operación en un toque: aprueba o rechaza excepciones auditables." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CommandCenter,
});

function CommandCenter() {
  const { invoices, policies } = useAppState();
  const tenantId = useTenantId();
  const company = getTenants().find((t) => t.id === tenantId);
  const pending = pendingValidation(invoices).sort((a, b) => Number(b.priority === "alta") - Number(a.priority === "alta") || a.dueDate.localeCompare(b.dueDate));
  const budget = budgetSummary(invoices, policies, new Date().toISOString().slice(0, 7));
  const frozen = invoices.filter((i) => i.status === "frenada" || i.status === "rechazada");
  const protectedCOP = frozen.reduce((s, i) => s + invCOP(i, policies), 0);
  const outside = invoices.filter((i) => i.status === "pagada" && i.checks?.some((c) => !c.passed)).length;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 font-mono text-xs uppercase text-primary">AL DIA · {company?.name}</p><h1 className="text-3xl font-bold">Centro de Comando</h1></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/bandeja"><Inbox />Bandeja</Link></Button><Button asChild variant="secondary"><Link to="/analitica"><BarChart3 />Analítica</Link></Button></div>
    </header>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Pendientes de tu firma" value={String(pending.length)} cls="text-warning" />
      <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Pagado vs. presupuesto</p><p className="mt-1 font-mono text-lg">{budget.percent.toFixed(0)}%</p><progress aria-label="Presupuesto utilizado" max={100} value={Math.min(100, budget.percent)} className="mt-2 h-1.5 w-full" /><p className="mt-1 truncate text-[11px] text-muted-foreground">{fmt(budget.amount)} de {fmt(policies.periodLimit)}</p></div>
      <Kpi label="Capital protegido" value={fmt(protectedCOP)} sub={`${frozen.length} frenadas`} cls="text-destructive" />
      <Kpi label="Pagos fuera de reglas" value={String(outside)} sub="Verificado por el motor" cls={outside ? "text-destructive" : "text-primary"} />
    </section>
    <section className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Cola de validación humana · {pending.length}</h2>
      {pending.length ? pending.map((invoice) => <ReviewCase key={`${tenantId}:${invoice.id}`} invoice={invoice} />) : <div className="flex flex-col items-center rounded-lg border border-border py-16 text-center"><ClipboardCheck className="mb-4 h-10 w-10 text-primary" /><h3 className="text-xl font-semibold">Todo al día</h3><p className="mt-2 text-sm text-muted-foreground">No hay facturas pendientes de validación humana.</p></div>}
    </section>
    <p className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Comprobante SHA-256 · Registro inmutable de decisiones · Conciliación en Excel</p>
  </div>;
}

function Kpi({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls: string }) {
  return <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 truncate font-mono text-2xl ${cls}`}>{value}</p>{sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}</div>;
}
