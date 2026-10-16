import type { InvoiceStatus } from "@/lib/types";

const STATUS: Record<InvoiceStatus, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-muted text-muted-foreground" },
  auditando: { label: "Auditando…", cls: "bg-secondary text-foreground animate-pulse" },
  pagada: { label: "Pagada (auto)", cls: "bg-primary/15 text-primary" },
  retenida: { label: "Retenida · requiere aprobación", cls: "bg-warning/15 text-warning" },
  aprobada: { label: "Pagada (aprobación humana)", cls: "bg-primary/15 text-primary" },
  rechazada: { label: "Rechazada", cls: "bg-destructive/15 text-destructive" },
};

export function StatusBadge({ s }: { s: InvoiceStatus }) {
  const x = STATUS[s];
  return <span className={`inline-flex rounded px-2 py-0.5 font-mono text-[11px] ${x.cls}`}>{x.label}</span>;
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-card p-5 ${className}`}>
      {title && <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</h2>}
      {children}
    </section>
  );
}

export const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
