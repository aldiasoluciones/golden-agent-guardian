import { money } from "@/lib/rules";
import type { Invoice } from "@/lib/types";

export function Receipt({ inv }: { inv: Invoice }) {
  const r = inv.receipt!;
  const download = () => {
    const blob = new Blob([JSON.stringify({ emisor: "AL DIA · Blinka Agent", comprobante: r, decision: inv.decisionReason, factura: { ...inv, checks: undefined, aiReasoning: undefined } }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${r.id}.json`;
    a.click();
  };
  const rows: [string, string][] = [
    ["Comprobante", r.id],
    ["Fecha", new Date(r.at).toLocaleString("es-CO")],
    ["Beneficiario", `${inv.vendorName} · ${inv.nit}`],
    ["Cuenta destino", inv.bankAccount],
    ["Factura", inv.number],
    ["Monto", money(inv.amount, inv.currency)],
    ["Autorización", r.method === "auto" ? "Agente AL DIA (dentro de políticas)" : `Humano: ${r.approver}`],
    ...(r.justification ? ([["Justificación", r.justification]] as [string, string][]) : []),
  ];
  return (
    <div className="rounded-lg border-2 border-dashed border-primary bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">✓ Comprobante de decisión · AL DIA</p>
        <button onClick={download} className="rounded border border-border px-2 py-1 text-xs">Descargar</button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-mono break-all">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-3 break-all font-mono text-[10px] text-muted-foreground">SHA-256 {r.hash}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">Pago simulado: no se movió dinero real. Emitido por AL DIA.</p>
    </div>
  );
}
