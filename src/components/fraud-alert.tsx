import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { store, useAppState, useTenantId } from "@/lib/store";
import { getTenants } from "@/lib/tenants";
import { fraudReportWorkbook, fraudScan, markFraudReviewed } from "@/lib/fraud-alerts";
import { downloadBlob } from "@/lib/reconciliation";
import { fmt } from "@/lib/rules";

export function FraudAlert({ reports = false }: { reports?: boolean }) {
  const state = useAppState();
  const { audit } = state;
  const tenantId = useTenantId();
  const company = getTenants().find((t) => t.id === tenantId)?.name ?? tenantId;
  const events = audit.filter((e) => e.type === "alerta_fraude" && e.fraudIncident);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const scan = fraudScan(state);
  const consolidated = scan.incident ? {
    id: scan.incident.id, at: scan.incident.triggeredAt, fraudIncident: scan.incident,
  } : undefined;
  if (!events.length) return null;
  const download = async (event: Pick<typeof events[number], "id" | "at" | "fraudIncident">) => {
    if (!event.fraudIncident) return;
    setBusy(true); setError("");
    try {
      const wb = await fraudReportWorkbook(event.fraudIncident, company, event.at);
      const buffer = await wb.xlsx.writeBuffer();
      downloadBlob(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `Informe-preventivo-${tenantId}-${event.id}.xlsx`);
    } catch { setError("No se pudo descargar el informe. Intenta nuevamente."); }
    finally { setBusy(false); }
  };
  if (!reports && scan.pending) return <section role="status" className="flex flex-wrap items-center gap-2 border-l-4 border-border bg-secondary p-3 text-sm text-muted-foreground">
    <AlertTriangle className="h-4 w-4 shrink-0" />Escaneo preventivo en curso · {scan.pending} factura(s) por terminar.
  </section>;
  const markReviewed = () => {
    if (consolidated) store.set((s) => markFraudReviewed(s, consolidated.fraudIncident.invoices.map((i) => i.id), new Date().toISOString()));
    setOpen(false);
  };
  if (!reports && !scan.unreviewed) return null;
  if (!reports) return <>
    <section role="status" className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-destructive bg-destructive/10 p-4">
      <div className="min-w-0 text-sm"><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />Escaneo preventivo finalizado</p>
        <p className="mt-1 break-words">{company} · {scan.incident?.invoices.length ?? 0} movimientos sospechosos · {scan.eventCount} alerta(s). No confirma fraude.</p>
      </div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setOpen(true)}>Ver detalles</Button>
        {consolidated && <Button variant="outline" disabled={busy} onClick={() => download(consolidated)}><Download />{busy ? "Generando informe…" : "Descargar informe Excel"}</Button>}
      </div>
      {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
    </section>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg border-destructive/40">
        <DialogHeader className="pr-6 text-left">
          <AlertTriangle className="mb-2 h-8 w-8 text-destructive" aria-hidden="true" />
           <DialogTitle className="leading-snug">Escaneo preventivo consolidado</DialogTitle>
          <DialogDescription className="break-words">{company} · {events.length} alerta(s) registrada(s)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
           <p className="border-l-4 border-destructive bg-destructive/10 p-3">Las alertas se activan con tres o más facturas sospechosas en 10 minutos. Este consolidado reúne todos los movimientos con indicios y las evidencias históricas de esta empresa, sin contar dos veces la misma factura. Requiere investigación; no confirma fraude ni un acceso al servidor.</p>
           {consolidated && <div className="space-y-2">
             <p><strong>{consolidated.fraudIncident.invoices.length} facturas</strong> · Monto observado: {fmt(consolidated.fraudIncident.amountCOP)}</p>
             <ul className="space-y-2 border-t border-border pt-3">{consolidated.fraudIncident.invoices.map((i) => <li key={i.id} className="break-words"><strong>{i.number}</strong> · {i.vendorName}<p className="text-muted-foreground">{i.decisionReason}</p><ul className="mt-1 text-xs text-muted-foreground">{i.checks?.filter((c) => !c.passed && ["duplicate", "whitelist", "bank"].includes(c.id)).map((c) => <li key={c.id}>{c.label}: {c.detail}</li>)}</ul></li>)}</ul>
          </div>}
          <p className="text-muted-foreground">Confirma el proveedor y la cuenta por un canal independiente antes de autorizar excepciones. El monto observado no equivale a pérdidas confirmadas.</p>
           {consolidated && <Button variant="outline" disabled={busy} onClick={() => download(consolidated)}><Download />{busy ? "Generando informe…" : "Descargar informe Excel"}</Button>}
          {error && <p role="alert" className="text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
           <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
           <Button variant="secondary" onClick={markReviewed}>Marcar como revisado</Button>
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