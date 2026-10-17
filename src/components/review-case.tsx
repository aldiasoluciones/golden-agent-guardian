import { useState } from "react";
import { Check, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/ui-bits";
import { humanDecision } from "@/lib/agent";
import { money } from "@/lib/rules";
import type { Invoice } from "@/lib/types";

export function ReviewCase({ invoice }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const act = async (approve: boolean) => {
    if (!name.trim() || why.trim().length < 5) { setError("Escribe tu nombre y una justificación de al menos 5 caracteres."); return; }
    setBusy(true);
    try { await humanDecision(invoice.id, approve, name.trim(), why.trim()); }
    catch { setError("No se pudo registrar la decisión. Intenta nuevamente."); }
    finally { setBusy(false); }
  };
  return <article className="border-b border-border py-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-semibold">{invoice.vendorName}</h2><p className="text-xs text-muted-foreground">{invoice.number} · Vence {invoice.dueDate || "sin fecha"}{invoice.batchId ? ` · ${invoice.batchId}` : ""}</p></div>
      <div className="flex items-center gap-3"><span className="font-mono text-sm">{money(invoice.amount, invoice.currency)}</span>{invoice.priority === "alta" && <span className="text-xs text-warning">Prioridad alta</span>}</div>
    </div>
    <p className="mt-2 max-w-4xl text-sm text-muted-foreground">{invoice.decisionReason}</p>
    <Button className="mt-3" variant="outline" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}><ChevronDown />{open ? "Cerrar revisión" : "Validar factura"}</Button>
    {open && <div className="mt-4 space-y-3">
      <ul className="space-y-1 text-sm">{invoice.checks?.filter((c) => !c.passed).map((c) => <li key={c.id}><span className="text-warning">{c.label}:</span> {c.detail}</li>)}</ul>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Nombre del aprobador<input className={`${inputCls} mt-1`} value={name} onChange={(e) => setName(e.target.value)} /></label><label className="text-xs text-muted-foreground">Justificación<input className={`${inputCls} mt-1`} value={why} onChange={(e) => setWhy(e.target.value)} /></label></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => act(true)}><Check />Aprobar excepción y pagar</Button><Button variant="destructive" disabled={busy} onClick={() => act(false)}><X />Rechazar pago</Button></div>
    </div>}
  </article>;
}