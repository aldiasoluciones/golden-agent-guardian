import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/ui-bits";
import { Receipt } from "@/components/receipt";
import { fmt } from "@/lib/rules";
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
      <Panel>
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
