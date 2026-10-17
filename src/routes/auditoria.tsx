import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/ui-bits";
import type { Invoice } from "@/lib/types";
import { Receipt } from "@/components/receipt";
import { fmt, money } from "@/lib/rules";
import { StatusBadge, inputCls } from "@/components/ui-bits";
import { useAppState, useTenantId } from "@/lib/store";
import { getTenants } from "@/lib/tenants";
import { exportReconciliation } from "@/lib/reconciliation";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Registro de auditoría — Blinka Agent by AL DIA" },
      { name: "description", content: "Bitácora inmutable de cada decisión del agente y de cada aprobación humana." },
      { property: "og:title", content: "Registro de auditoría — Blinka Agent by AL DIA" },
      { property: "og:description", content: "Cada pago, freno y escalamiento queda registrado con su porqué." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

const COLORS: Record<string, string> = {
  pago_auto: "border-primary", aprobada: "border-primary", retenida: "border-warning", frenada: "border-destructive", rechazada: "border-destructive",
};

function AuditPage() {
  const state = useAppState();
  const { audit, invoices } = state;
  const tenantId = useTenantId();
  const company = getTenants().find((t) => t.id === tenantId)?.name ?? tenantId;
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const inv = invoices.find((i) => i.id === open);
  const exportExcel = async (filtered?: Invoice[]) => {
    setExporting(true); setExportError("");
    try { await exportReconciliation(state, company, filtered); }
    catch { setExportError("No se pudo descargar el Excel. Intenta nuevamente."); }
    finally { setExporting(false); }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de auditoría</h1>
          <p className="mt-1 text-muted-foreground">{audit.length} eventos registrados.</p>
        </div>
        <Button onClick={() => exportExcel()} disabled={exporting} variant="outline"><Download />{exporting ? "Generando Excel…" : "Descargar conciliación Excel"}</Button>
      </div>
      {exportError && <p role="alert" className="text-destructive">{exportError}</p>}
      <InvoiceDb invoices={invoices} onOpen={setOpen} onExport={exportExcel} exporting={exporting} />
      <Panel title="Bitácora de eventos">
        {audit.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos todavía.</p>}
        <ul className="space-y-3">
          {audit.map((e) => {
            const i = invoices.find((x) => x.id === e.invoiceId);
            return (
              <li key={e.id} className={`border-l-2 pl-4 ${COLORS[e.type] ?? "border-border"}`}>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
                  <span>{new Date(e.at).toLocaleString("es-CO")}</span><span className="uppercase">{e.type}</span>
                  {e.amount !== undefined && <span>{fmt(e.amount)}</span>}
                  {i?.receipt && (e.type === "pago_auto" || e.type === "aprobada") && (
                    <button className="text-primary" onClick={() => setOpen(i.id)}>ver comprobante {i.receipt.id}</button>
                  )}
                </div>
                <p className="text-sm">{e.message}</p>
              </li>
            );
          })}
        </ul>
      </Panel>
      {inv?.receipt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg"><Receipt inv={inv} /></div>
        </div>
      )}
    </div>
  );
}

const DEC: Record<string, (i: Invoice) => boolean> = {
  todas: () => true,
  pagada: (i) => i.status === "pagada" || i.status === "aprobada",
  frenada: (i) => i.status === "frenada" || i.status === "rechazada",
  escalada: (i) => i.status === "retenida",
};

function InvoiceDb({ invoices, onOpen, onExport, exporting }: { invoices: Invoice[]; onOpen: (id: string) => void; onExport: (rows: Invoice[]) => Promise<void>; exporting: boolean }) {
  const [ch, setCh] = useState("todos");
  const [dec, setDec] = useState("todas");
  const [q, setQ] = useState("");
  const [n, setN] = useState(50);
  const ql = q.toLowerCase();
  const rows = invoices.filter((i) => (ch === "todos" || (i.channel ?? "manual") === ch) && (DEC[dec]?.(i) ?? true) && (!ql || `${i.id} ${i.number} ${i.nit} ${i.vendorName} ${i.batchId ?? ""}`.toLowerCase().includes(ql)));
  const sel = "rounded-md border border-input bg-background px-2 py-2 text-sm";
  return (
    <Panel title={`Base de facturas · ${rows.length} de ${invoices.length}`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <select className={sel} value={ch} onChange={(e) => setCh(e.target.value)}>
          <option value="todos">Todos los canales</option><option value="whatsapp">WhatsApp</option><option value="correo">Correo</option><option value="manual">Bandeja</option>
        </select>
        <select className={sel} value={dec} onChange={(e) => setDec(e.target.value)}>
          <option value="todas">Todas las decisiones</option><option value="pagada">Pagadas</option><option value="frenada">Frenadas</option><option value="escalada">Escaladas</option>
        </select>
        <input className={`${inputCls} max-w-xs`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ID, número, NIT, lote…" />
        <Button variant="outline" onClick={() => onExport(rows)} disabled={exporting}><Download />Exportar filtradas (Excel)</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="font-mono uppercase text-muted-foreground"><tr><th className="p-2">ID</th><th className="p-2">Canal</th><th className="p-2">Proveedor</th><th className="p-2">Monto</th><th className="p-2">Decisión</th><th className="p-2">Cola</th><th className="p-2">ms</th><th className="p-2">Por qué</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.slice(0, n).map((i) => (
              <tr key={i.id} className="align-top">
                <td className="p-2 font-mono">{i.id}<div className="text-muted-foreground">{i.number}</div></td>
                <td className="p-2">{i.channel === "whatsapp" ? "WhatsApp" : i.channel === "correo" ? "Correo" : "Bandeja"}<div className="text-muted-foreground">{i.sender}</div></td>
                <td className="p-2">{i.vendorName}<div className="text-muted-foreground">{i.nit}</div></td>
                <td className="p-2 whitespace-nowrap">{money(i.amount, i.currency)}</td>
                <td className="p-2"><StatusBadge s={i.status} />{i.receipt && <button className="mt-1 block text-primary" onClick={() => onOpen(i.id)}>comprobante</button>}</td>
                <td className="p-2">{i.status === "retenida" ? `${i.queue === "lote" ? `Lote ${i.batchId}` : "Revisión"}${i.priority === "alta" ? " · alta" : ""}` : "—"}</td>
                <td className="p-2 font-mono">{i.latencyMs ?? "—"}</td>
                <td className="p-2 min-w-64">{i.decisionReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > n && <button onClick={() => setN(n + 100)} className="mt-3 text-sm text-primary">Ver 100 más</button>}
    </Panel>
  );
}
