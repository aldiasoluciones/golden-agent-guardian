import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, BarChart3, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewCase } from "@/components/review-case";
import { useAppState, useTenantId } from "@/lib/store";
import { getTenants } from "@/lib/tenants";
import { pendingValidation } from "@/lib/treasury";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Validaciones pendientes — AL DIA · Blinka Agent" },
    { name: "description", content: "Facturas de la empresa activa que requieren aprobación humana, con motivos y decisiones auditables." },
    { property: "og:title", content: "Validaciones pendientes — AL DIA · Blinka Agent" },
    { property: "og:description", content: "Revisa las excepciones del agente, autoriza o rechaza y mantén despejada tu bandeja." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ReviewPage,
});

function ReviewPage() {
  const { invoices } = useAppState();
  const tenantId = useTenantId();
  const company = getTenants().find((t) => t.id === tenantId);
  const pending = pendingValidation(invoices).sort((a, b) => Number(b.priority === "alta") - Number(a.priority === "alta") || a.dueDate.localeCompare(b.dueDate));
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div><p className="mb-2 text-xs font-mono uppercase text-primary">AL DIA · {company?.name}</p><h1 className="text-3xl font-bold">Validaciones pendientes</h1><p className="mt-2 text-sm text-muted-foreground">{pending.length} facturas requieren tu decisión</p></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/bandeja"><Inbox />Bandeja</Link></Button><Button asChild variant="secondary"><Link to="/analitica"><BarChart3 />Analítica</Link></Button></div>
    </header>
    {pending.length ? <div>{pending.map((invoice) => <ReviewCase key={`${tenantId}:${invoice.id}`} invoice={invoice} />)}</div> : <div className="flex flex-col items-center py-20 text-center"><ClipboardCheck className="mb-4 h-10 w-10 text-primary" /><h2 className="text-xl font-semibold">Todo al día</h2><p className="mt-2 text-sm text-muted-foreground">No hay facturas pendientes de validación humana.</p></div>}
  </div>;
}
