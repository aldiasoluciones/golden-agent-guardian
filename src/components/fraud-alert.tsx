import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState, useTenantId } from "@/lib/store";
import { getTenants } from "@/lib/tenants";
import { fraudReportWorkbook } from "@/lib/fraud-alerts";
import { downloadBlob } from "@/lib/reconciliation";
import { fmt } from "@/lib/rules";

export function FraudAlert({ reports = false }: { reports?: boolean }) {
  const { audit } = useAppState();
  const tenantId = useTenantId();
  const company = getTenants().find((t) => t.id === tenantId)?.name ?? tenantId;
  const events = audit.filter((e) => e.type === "alerta_fraude" && e.fraudIncident);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!events.length) return null;
  const download = async (event: typeof events[number]) => {
    if (!event.fraudIncident) return;
    setBusy(true); setError("");
    try {
      const wb = await fraudReportWorkbook(event.fraudIncident, company, event.at);
      const buffer = await wb.xlsx.writeBuffer();
      downloadBlob(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `Informe-preventivo-${tenantId}-${event.id}.xlsx`);
    } catch { setError("No se pudo descargar el informe. Intenta nuevamente."); }
    finally { setBusy(false); }
  };
  if (!reports) return <aside role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 border-l-4 border-destructive bg-destructive/10 p-4">
    <div className="flex items-start gap-3"><AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-destructive" /><div><p className="font-semibold">Alerta preventiva de fraude · {company}</p><p className="text-sm text-muted-foreground">{events.length} alerta(s): tres o más facturas sospechosas en 10 minutos. Pendiente de investigación.</p></div></div>
    <Button asChild variant="outline"><Link to="/auditoria">Ver informes</Link></Button>
  </aside>;
  return <section className="space-y-3" aria-label="Informes preventivos de fraude">
    <h2 className="text-lg font-semibold">Informes preventivos de fraude · {company}</h2>
    {events.map((event) => <details key={event.id} className="rounded-lg border border-destructive/40 p-4">
      <summary className="cursor-pointer font-semibold">{event.fraudIncident?.invoices.length} facturas sospechosas · {new Date(event.at).toLocaleString("es-CO")}</summary>
      <div className="mt-3 space-y-3"><p className="text-sm">{event.message}</p><p className="text-sm text-muted-foreground">Monto observado: {fmt(event.amount ?? 0)} · No equivale a pérdidas confirmadas. Registro local; no hay notificación por correo ni bloqueo adicional.</p>
        <ul className="space-y-2 text-sm">{event.fraudIncident?.invoices.map((i) => <li key={i.id}><strong>{i.number}</strong> · {i.vendorName} · {i.channel ?? "manual"}<p className="text-muted-foreground">{i.decisionReason}</p></li>)}</ul>
        <Button variant="outline" disabled={busy} onClick={() => download(event)}><Download />{busy ? "Generando informe…" : "Descargar informe Excel"}</Button>
      </div>
    </details>)}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </section>;
}