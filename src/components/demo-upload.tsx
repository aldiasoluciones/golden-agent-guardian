import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Panel } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { SAMPLES, addInvoice, runAgent, type SampleKey } from "@/lib/agent";
import { extractInvoice } from "@/lib/extract.functions";
import { JURY_SOURCE, runJurySession, setTenant, store, updateInvoice, useAppState } from "@/lib/store";
import { matchTenant } from "@/lib/tenants";
import type { Invoice } from "@/lib/types";
import WOW_NAMES from "@/lib/wow-names.json";

type Expect = "pagar" | "frenar" | "escalar";
/** Lote jurados: un caso típico por factura, en orden (la original va antes que su duplicado). */
export const JURY_CASES: { label: string; expect: Expect; file?: string; preset?: SampleKey }[] = [
  { label: "Factura válida (francés)", expect: "pagar", file: "FACTURE_PA-9410_ORIGINALE.pdf" },
  { label: "Cobro duplicado (francés)", expect: "frenar", file: "FACTURE_PA-9410_DUPLICATA.pdf" },
  { label: "Proveedor fuera de lista blanca (alemán)", expect: "frenar", file: "RECHNUNG_BER-2026-884.pdf" },
  { label: "Cuenta bancaria cambiada", expect: "escalar", preset: "cuenta" },
  { label: "Supera límite de auto-pago (inglés)", expect: "escalar", file: "INVOICE_TL-5590.pdf" },
  { label: "Sin empresa pagadora (español)", expect: "frenar", file: "FACTURA_SIN-PAGADOR_SP-3301.pdf" },
  { label: "Empresa pagadora ajena (inglés)", expect: "frenar", file: "INVOICE_EMPRESA-AJENA_EX-7720.pdf" },
  { label: "No cuadra con lo acordado", expect: "escalar", preset: "noCuadra" },
  { label: "Presupuesto insuficiente", expect: "escalar", preset: "presupuesto" },
  { label: "Tasa de cambio alterada", expect: "escalar", preset: "tasaAlterada" },
];

export const outcome = (s: string): Expect | "otro" =>
  s === "pagada" || s === "aprobada" ? "pagar" : s === "frenada" || s === "rechazada" ? "frenar" : s === "retenida" ? "escalar" : "otro";

type Row = { label: string; expect: Expect; got: string; company: string; reason: string };

export function DemoUpload() {
  const { invoices } = useAppState();
  const extract = useServerFn(extractInvoice);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [batch, setBatch] = useState<{ total: number; done: number; errors: string[] } | null>(null);
  const [jury, setJury] = useState<Row[] | null>(null);

  const read = async (f: File): Promise<() => string> => {
    if (f.size > 4_500_000) throw new Error(`${f.name}: supera 4.5 MB`);
    const isText = /\.(txt|csv|json|xml|md|eml)$/i.test(f.name) || f.type.startsWith("text/");
    const payload = isText
      ? { fileName: f.name, mime: f.type, text: await f.text() }
      : { fileName: f.name, mime: f.type, dataUrl: await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(f); }) };
    const res = await extract({ data: payload });
    if (!res.ok) throw new Error(`${f.name}: ${res.error}`);
    const x = res.invoice as { number?: string; vendorName?: string; nit?: string; bankAccount?: string; amount?: number; currency?: string; category?: string; dueDate?: string; description?: string; clientName?: string; clientTaxId?: string; clientEmail?: string };
    const hasPayer = !!(x.clientName || x.clientTaxId || x.clientEmail);
    const m = hasPayer ? matchTenant({ name: x.clientName, taxId: x.clientTaxId, email: x.clientEmail }) : null;
    const payer: Invoice["payer"] = m
      ? { status: "detectado", name: m.tenant.name, how: m.how }
      : hasPayer
        ? { status: "desconocido", name: String(x.clientName || x.clientTaxId || x.clientEmail), how: "sin coincidencia" }
        : { status: "sin-dato", name: "No indicado", how: "la factura no dice a quién va dirigida → rechazada" };
    return () => {
      if (m) setTenant(m.tenant.id);
      return addInvoice({
        number: String(x.number || "S/N"), vendorName: String(x.vendorName || "Desconocido"), nit: String(x.nit || ""),
        bankAccount: String(x.bankAccount || ""), amount: Number(x.amount) || 0, currency: x.currency === "USD" ? "USD" : "COP",
        category: String(x.category || "Otro"), dueDate: String(x.dueDate || ""), description: String(x.description || ""), source: `Archivo: ${f.name}`, payer,
      }).id;
    };
  };

  const fetchPdf = async (path: string, n: string) => new File([await (await fetch(path)).blob()], n, { type: "application/pdf" });

  const onFiles = async (list: File[]) => {
    if (!list.length) return;
    setErr(""); setBusy(true); setJury(null);
    setBatch({ total: list.length, done: 0, errors: [] });
    let next = 0, decided = 0;
    let chain = Promise.resolve();
    const worker = async () => {
      while (next < list.length) {
        const i = next++;
        try {
          const file = list[i];
          if (!file) continue;
          const commit = await read(file);
          chain = chain.then(async () => { await runAgent(commit(), { onCheck: () => {}, onText: () => {} }, { ai: false, delay: 0 }); });
          await chain;
        } catch (e) {
          setBatch((b) => b && { ...b, errors: [...b.errors, (e as Error).message] });
        }
        decided++;
        setBatch((b) => b && { ...b, done: decided });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setBusy(false);
  };

  const wow = async () => onFiles(await Promise.all(WOW_NAMES.map((n) => fetchPdf(`/downloads/lote-wow/${n}`, n))));

  const runJury = async () => {
    setErr(""); setBusy(true); setBatch(null);
    const rows: Row[] = [];
    setJury([]);
    try { await runJurySession(async () => {
    setTenant("t000");
    for (const c of JURY_CASES) {
      try {
        let id: string;
        if (c.file) id = (await read(await fetchPdf(`/downloads/${c.file}`, c.file)))();
        else {
          if (!c.preset) throw new Error("Caso sin archivo ni datos de prueba.");
          setTenant("t000"); id = addInvoice(SAMPLES[c.preset]()).id;
        }
        updateInvoice(id, { source: JURY_SOURCE + c.label });
        await runAgent(id, { onCheck: () => {}, onText: () => {} }, { ai: false, delay: 0 });
        const inv = store.get().invoices.find((i) => i.id === id);
        rows.push({ label: c.label, expect: c.expect, got: outcome(inv?.status ?? ""), company: inv?.payer?.name ?? "AL DIA Demo S.A.S.", reason: inv?.decisionReason ?? "" });
      } catch (e) {
        rows.push({ label: c.label, expect: c.expect, got: "error", company: "—", reason: (e as Error).message });
      }
      setJury([...rows]);
    }
    }); } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const ok = jury?.filter((r) => r.got === r.expect).length ?? 0;
  const recentFiles = invoices.filter((i) => i.source?.startsWith("Archivo:")).length;

  return (
    <div className="space-y-6">
      <Panel title="Subir facturas · una o muchas">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (!busy) onFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => !busy && fileRef.current?.click()}
          className="cursor-pointer rounded-md border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground hover:border-primary"
        >
          {busy && batch ? `Procesando: ${batch.done} de ${batch.total}…` : "Arrastra o haz clic · PDF, imagen, correo o texto"}
        </div>
        <input ref={fileRef} type="file" multiple hidden accept=".pdf,image/*,.txt,.csv,.json,.xml,.eml" onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; onFiles(fs); }} />
        {batch && (
          <div className="mt-3 text-xs">
            <progress aria-label="Avance del lote" max={batch.total} value={batch.done} className="h-1.5 w-full" />
            <p className="mt-1 text-muted-foreground">{batch.done}/{batch.total} procesadas · revisa resultados en <Link to="/bandeja" className="text-primary underline">Bandeja</Link> ({recentFiles} por archivo en la empresa activa)</p>
            {batch.errors.map((er) => <p key={er} className="text-destructive">{er}</p>)}
          </div>
        )}
        {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Lote jurados · un caso típico por factura">
          <p className="text-sm text-muted-foreground">{JURY_CASES.length} casos con resultado esperado. Al terminar se compara lo esperado con lo que decidió el motor.</p>
          <Button disabled={busy} onClick={runJury} className="mt-3 w-full">Correr lote jurados</Button>
          {jury && (
            <div className="mt-3">
              <p className="mb-2 font-mono text-xs">{ok}/{jury.length} coinciden con lo esperado</p>
              <ul className="space-y-1 text-xs">
                {jury.map((r) => (
                  <li key={r.label} title={r.reason} className={`flex justify-between gap-2 rounded border px-2 py-1 ${r.got === r.expect ? "border-primary/40" : "border-destructive bg-destructive/10"}`}>
                    <span>{r.got === r.expect ? "✓" : "✗"} {r.label}</span>
                    <span className="font-mono uppercase">{r.expect} → {r.got}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
        <Panel title="Lote WOW · 100 facturas heterogéneas">
          <p className="text-sm text-muted-foreground">5 idiomas, varias monedas y 12 empresas pagadoras, con trampas mezcladas.</p>
          <button disabled={busy} onClick={wow} className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">⚡ Correr las 100 facturas</button>
          <a href="/downloads/lote-wow-100-facturas.zip" download className="mt-2 block text-center text-xs text-primary underline">Descargar las 100 facturas (ZIP)</a>
        </Panel>
      </div>
    </div>
  );
}
