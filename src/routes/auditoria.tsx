import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/ui-bits";
import type { Invoice } from "@/lib/types";
import { Receipt } from "@/components/receipt";
import { fmt, money } from "@/lib/rules";
import { StatusBadge, inputCls } from "@/components/ui-bits";
import { useAppState } from "@/lib/store";

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
  const { audit, invoices } = useAppState();
  const [open, setOpen] = useState<string | null>(null);
  const inv = invoices.find((i) => i.id === open);
  const exportCsv = () => {
    const rows = [["AL DIA · Blinka Agent — registro de decisiones"], ["fecha", "tipo", "monto", "mensaje"], ...audit.map((e) => [e.at, e.type, String(e.amount ?? ""), e.message.replace(/"/g, "'")])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aldia-blinka-auditoria.csv";
    a.click();
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de auditoría</h1>
          <p className="mt-1 text-muted-foreground">{audit.length} eventos registrados.</p>
        </div>
        <button onClick={exportCsv} className="rounded-md border border-border px-4 py-2 text-sm">Exportar CSV</button>
      </div>
      <InvoiceDb invoices={invoices} onOpen={setOpen} />
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

function InvoiceDb({ invoices, onOpen }: { invoices: Invoice[]; onOpen: (id: string) => void }) {
  const [ch, setCh] = useState("todos");
  const [dec, setDec] = useState("todas");
  const [q, setQ] = useState("");
  const [n, setN] = useState(50);
  const ql = q.toLowerCase();
  const rows = invoices.filter((i) => (ch === "todos" || (i.channel ?? "manual") === ch) && DEC[dec]!(i) && (!ql || `${i.id} ${i.number} ${i.nit} ${i.vendorName} ${i.batchId ?? ""}`.toLowerCase().includes(ql)));
  const exportCsv = () => {
    const head = ["id", "numero", "canal", "remitente", "proveedor", "nit", "cuenta", "monto", "moneda", "estado", "prioridad", "cola", "lote", "ms_decision", "recibida", "comprobante", "hash", "porque"];
    const data = rows.map((i) => [i.id, i.number, i.channel ?? "manual", i.sender ?? "", i.vendorName, i.nit, i.bankAccount, i.amount, i.currency, i.status, i.priority ?? "", i.queue ?? "", i.batchId ?? "", i.latencyMs ?? "", i.createdAt, i.receipt?.id ?? "", i.receipt?.hash ?? "", (i.decisionReason ?? "").replace(/"/g, "'")]);
    const blob = new Blob([[head, ...data].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aldia-base-facturas.csv";
    a.click();
  };
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
        <button onClick={exportCsv} className="rounded-md border border-border px-3 py-2 text-sm">Exportar base (CSV)</button>
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
