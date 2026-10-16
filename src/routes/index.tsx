import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel, StatusBadge } from "@/components/ui-bits";
import { fmt, spentByCategory } from "@/lib/rules";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tesorería — Blinka Agent" },
      { name: "description", content: "Dinero pagado automáticamente, retenido por seguridad y auditoría en tiempo real." },
      { property: "og:title", content: "Tesorería — Blinka Agent" },
      { property: "og:description", content: "Un agente que paga las cuentas dentro de las reglas y pide permiso cuando algo se sale de ellas." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { invoices, audit, policies } = useAppState();
  const sum = (f: (s: string) => boolean) => invoices.filter((i) => f(i.status)).reduce((a, i) => a + i.amount, 0);
  const auto = sum((s) => s === "pagada");
  const held = sum((s) => s === "retenida");
  const human = sum((s) => s === "aprobada");
  const blocked = sum((s) => s === "rechazada");
  const spent = spentByCategory(invoices);
  const total = auto + held + human + blocked || 1;

  const kpis = [
    { label: "Pagado automáticamente", v: auto, n: invoices.filter((i) => i.status === "pagada").length, cls: "text-primary" },
    { label: "Retenido por seguridad", v: held, n: invoices.filter((i) => i.status === "retenida").length, cls: "text-warning" },
    { label: "Pagado con aprobación humana", v: human, n: invoices.filter((i) => i.status === "aprobada").length, cls: "text-foreground" },
    { label: "Fraude / rechazo evitado", v: blocked, n: invoices.filter((i) => i.status === "rechazada").length, cls: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Agentes que pagan por la empresa</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Blinka Agent paga las cuentas dentro de tus reglas y se detiene a pedir permiso cuando algo se sale de ellas.
          </p>
        </div>
        <Link to="/bandeja" className="rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90">
          Probar el agente →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Panel key={k.label}>
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`mt-2 font-mono text-2xl font-semibold ${k.cls}`}>{fmt(k.v)}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{k.n} factura(s)</p>
          </Panel>
        ))}
      </div>

      <Panel title="Distribución del flujo de pagos">
        <div className="flex h-4 overflow-hidden rounded bg-muted">
          <div className="bg-primary" style={{ width: `${(auto / total) * 100}%` }} />
          <div className="bg-foreground/70" style={{ width: `${(human / total) * 100}%` }} />
          <div className="bg-warning" style={{ width: `${(held / total) * 100}%` }} />
          <div className="bg-destructive" style={{ width: `${(blocked / total) * 100}%` }} />
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Límite de auto-pago vigente: {fmt(policies.autoPayLimit)} · {policies.vendors.length} proveedores en lista blanca
        </p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Ejecución de presupuesto">
          <div className="space-y-4">
            {Object.entries(policies.budgets).map(([cat, b]) => {
              const s = spent[cat] ?? 0;
              const pct = Math.min(100, (s / b) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm">
                    <span>{cat}</span>
                    <span className="font-mono text-xs text-muted-foreground">{fmt(s)} / {fmt(b)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-muted">
                    <div className={`h-2 rounded ${pct > 85 ? "bg-warning" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Auditoría en tiempo real">
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos aún. Ve a la bandeja y lanza una prueba rápida.</p>
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

      {invoices.length > 0 && (
        <Panel title="Últimas facturas">
          <ul className="divide-y divide-border">
            {invoices.slice(0, 6).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>{i.vendorName} · <span className="font-mono text-muted-foreground">{i.number}</span></span>
                <span className="flex items-center gap-3"><span className="font-mono">{fmt(i.amount)}</span><StatusBadge s={i.status} /></span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
