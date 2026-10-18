import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [dismissed, setDismissed] = useState("");
  const signature = JSON.stringify(events.map((e) => [e.id, e.fraudIncident?.invoices.length]));
  const latest = [...events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
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
  if (!reports) return <>
    <Button variant="outline" className="border-destructive/40 text-destructive" onClick={() => setDismissed("")}><AlertTriangle />Ver alertas preventivas ({events.length})</Button>
    <Dialog open={dismissed !== signature} onOpenChange={(open) => setDismissed(open ? "" : signature)}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg border-destructive/40">
        <DialogHeader className="pr-6 text-left">
          <AlertTriangle className="mb-2 h-8 w-8 text-destructive" aria-hidden="true" />
          <DialogTitle className="leading-snug">Alerta preventiva de fraude</DialogTitle>
          <DialogDescription className="break-words">{company} · {events.length} alerta(s) registrada(s)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="border-l-4 border-destructive bg-destructive/10 p-3">Tres o más facturas con indicios sospechosos en 10 minutos. Requiere investigación; no confirma fraude ni un acceso al servidor.</p>
          {latest && <div className="space-y-2">
            <p className="text-muted-foreground">Última alerta · {new Date(latest.at).toLocaleString("es-CO")}</p>
            <p><strong>{latest.fraudIncident?.invoices.length} facturas</strong> · Monto observado: {fmt(latest.amount ?? 0)}</p>
            <ul className="space-y-2 border-t border-border pt-3">{latest.fraudIncident?.invoices.map((i) => <li key={i.id} className="break-words"><strong>{i.number}</strong> · {i.vendorName}<p className="text-muted-foreground">{i.decisionReason}</p></li>)}</ul>
          </div>}
          <p className="text-muted-foreground">Confirma el proveedor y la cuenta por un canal independiente antes de autorizar excepciones. El monto observado no equivale a pérdidas confirmadas.</p>
          {latest && <Button variant="outline" disabled={busy} onClick={() => download(latest)}><Download />{busy ? "Generando informe…" : "Descargar informe Excel"}</Button>}
          {error && <p role="alert" className="text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setDismissed(signature)}>Cerrar alerta</Button>
          <Button asChild><Link to="/auditoria">Ver todos los informes</Link></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
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