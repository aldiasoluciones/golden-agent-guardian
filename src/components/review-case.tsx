import { useEffect, useState } from "react";
import { Check, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/ui-bits";
import { humanDecision } from "@/lib/agent";
import { money } from "@/lib/rules";
import type { Invoice } from "@/lib/types";

const APPROVER_KEY = "aldia-approver";

export function ReviewCase({ invoice }: { invoice: Invoice }) {
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setName(localStorage.getItem(APPROVER_KEY) ?? ""); }, []);
  const high = invoice.priority === "alta";
  const failed = invoice.checks?.filter((c) => !c.passed) ?? [];
  const act = async (approve: boolean) => {
    if (!name.trim() || why.trim().length < 5) { setError("Escribe tu nombre y una justificación de al menos 5 caracteres."); return; }
    setBusy(true); setError("");
    try { localStorage.setItem(APPROVER_KEY, name.trim()); await humanDecision(invoice.id, approve, name.trim(), why.trim()); }
    catch { setError("No se pudo registrar la decisión. Intenta nuevamente."); }
    finally { setBusy(false); }
  };
  return <article className={`rounded-lg border border-border border-l-4 bg-card p-4 sm:p-5 ${high ? "border-l-destructive" : "border-l-warning"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`font-mono text-[11px] uppercase ${high ? "text-destructive" : "text-warning"}`}>{high ? "Prioridad alta" : "Prioridad normal"}</p>
        <h2 className="mt-1 truncate text-lg font-semibold">{invoice.vendorName}</h2>
        <p className="text-xs text-muted-foreground">{invoice.number} · Vence {invoice.dueDate || "sin fecha"}{invoice.batchId ? ` · ${invoice.batchId}` : ""}</p>
      </div>
      <p className="font-mono text-2xl font-semibold">{money(invoice.amount, invoice.currency)}</p>
    </div>
    <p className="mt-3 text-sm">{invoice.decisionReason}</p>
    {failed.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{failed.map((c) => <span key={c.id} title={c.detail} className="rounded bg-warning/15 px-2 py-0.5 text-xs text-warning">{c.label}</span>)}</div>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-muted-foreground">Aprobador<input className={`${inputCls} mt-1`} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Justificación<input className={`${inputCls} mt-1`} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Ej. Validado con el proveedor" /></label>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Button size="lg" disabled={busy} onClick={() => act(true)}><Check />Aprobar y pagar</Button>
      <Button size="lg" variant="destructive" disabled={busy} onClick={() => act(false)}><X />Rechazar</Button>
    </div>
    <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground"><ShieldCheck className="h-3 w-3 text-primary" />Decisión del motor determinista · la IA solo explica</p>
  </article>;
}
