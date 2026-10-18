import { toCurrency } from "@/lib/rails";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChannelAttachments } from "@/components/channel-attachments";
import { attachmentPayload } from "@/lib/channel-files";
import { matchTenant } from "@/lib/tenants";
import { Panel, StatusBadge, inputCls } from "@/components/ui-bits";
import { addInvoice, runAgent, SAMPLES } from "@/lib/agent";
import { BURST_PER_MINUTE, BURST_SIZE, runBurst, type BurstStats } from "@/lib/burst";
import { extractInvoice } from "@/lib/extract.functions";
import { money, TEAM_CAPACITY } from "@/lib/rules";
import { setTenant, store, useAppState } from "@/lib/store";
import type { Channel, Invoice } from "@/lib/types";

export const Route = createFileRoute("/canales")({
  head: () => ({
    meta: [
      { title: "Canales en vivo: WhatsApp y Correo — blinkagent by AL DIA" },
      { name: "description", content: "Envía facturas por WhatsApp o correo y mira al agente decidir en vivo; prueba de ráfaga a 300 facturas por minuto." },
      { property: "og:title", content: "WhatsApp y Correo en vivo — blinkagent by AL DIA" },
      { property: "og:description", content: "Pagar, frenar o escalar: el agente decide cada factura que llega por WhatsApp o correo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Canales,
});

const WA_PRESETS = [
  { label: "Cuenta de cobro normal", key: "valida" as const, text: "Hola, les comparto la factura PA de Papelería Andina S.A.S, NIT 900123456-1, por $1.850.000 COP, pagar a Bancolombia 123-456789-01. Resmas y tóner." },
  { label: "Cambio de cuenta (trampa)", key: "cuenta" as const, text: "URGENTE: Servicios Cloud Nova NIT 901555222-3, licencias por $4.100.000. Favor pagar HOY a nuestra NUEVA cuenta Nequi 3105559911." },
];
const MAIL_PRESETS = [
  { label: "Contratista USD", key: "validaUsd" as const, subject: "Invoice DevStudio — October", body: "Hi, attached invoice from DevStudio Remote LLC (EIN 88-1234567), 800 USD monthly retainer, wire to Chase 021000021-77441." },
  { label: "Contratista Brasil (PT)", key: "br" as const, subject: "Fatura outubro — consultoria", body: "Olá, segue a fatura da Paulo Andrade Consultoria (CNPJ 12.345.678/0001-90), 1.100 USD, via SWIFT ITAUBRSP, conta 0445-77881-2." },
  { label: "Agencia EE. UU. (EN)", key: "usAch" as const, subject: "BrightOps October retainer", body: "Hello, invoice from BrightOps Agency Inc (EIN 47-2093815), 900 USD, ACH routing 026009593, account 88901234." },
  { label: "Supera el límite", key: "limite" as const, subject: "Factura fletes temporada alta", body: "Buen día, TransLogix Colombia NIT 830777111-9 envía factura por $6.200.000 por fletes nacionales. Cuenta BBVA 0013-554433." },
];

type Msg = { from: "user" | "agent"; text: string; invId?: string };

async function ingest(channel: Channel, sender: string, data: Omit<Invoice, "id" | "status" | "createdAt">) {
  const inv = addInvoice({ ...data, channel, sender, source: `${channel === "whatsapp" ? "WhatsApp" : "Correo"} · ${sender}` });
  await runAgent(inv.id, { onCheck: () => {}, onText: () => {} }, { ai: false, delay: 150 });
  const result = store.get().invoices.find((i) => i.id === inv.id);
  if (!result) throw new Error("No se pudo recuperar la decisión de la factura");
  return result;
}

function reply(i: Invoice) {
  const head = i.status === "pagada" ? "✅ PAGADA" : i.status === "frenada" ? "🛑 FRENADA" : i.queue === "lote" ? "⏳ ESCALADA (lote diferido)" : `⚠️ ESCALADA${i.priority === "alta" ? " · prioridad alta" : ""}`;
  return `${head} — ${i.number} por ${money(i.amount, i.currency)}.\n${i.decisionReason ?? ""}`;
}

function useLive(channel: Channel, sender: string) {
  const extract = useServerFn(extractInvoice);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const send = async (text: string, presetKey?: keyof typeof SAMPLES, files: File[] = []) => {
    if (busy) return files;
    setBusy(true);
    const failed: File[] = [];
    setMsgs((m) => [...m, { from: "user", text: [text, ...files.map((f) => `📎 ${f.name}`)].filter(Boolean).join("\n") }, { from: "agent", text: "Factura recibida. Validando contra las reglas de la empresa…" }]);
    try {
      const entries: (File | null)[] = files.length ? files : [null];
      for (const file of entries) {
        try {
          let data: Omit<Invoice, "id" | "status" | "createdAt"> | null = !file && presetKey ? SAMPLES[presetKey]() : null;
          if (!data) {
            const payload = file ? await attachmentPayload(file) : { fileName: `${channel}.txt`, mime: "text/plain", text };
            const r = await extract({ data: payload });
            if (!r.ok) throw new Error(r.error);
            const x = r.invoice;
            const payerFields = { name: String(x["clientName"] || ""), taxId: String(x["clientTaxId"] || ""), email: String(x["clientEmail"] || "") };
            const match = matchTenant(payerFields);
            const hasPayer = !!(payerFields.name || payerFields.taxId || payerFields.email);
            if (match) setTenant(match.tenant.id);
            const payer: Invoice["payer"] = match
              ? { status: "detectado", name: match.tenant.name, how: match.how }
              : { status: hasPayer ? "desconocido" : "sin-dato", name: payerFields.name || payerFields.taxId || payerFields.email || "No indicado", how: hasPayer ? "sin coincidencia" : "la factura no indica empresa pagadora" };
            data = { number: String(x["number"] || "S/N"), vendorName: String(x["vendorName"] || "Desconocido"), nit: String(x["nit"] || ""), bankAccount: String(x["bankAccount"] || ""), amount: Number(x["amount"]) || 0, currency: toCurrency(x["currency"]), category: String(x["category"] || "Otro"), dueDate: String(x["dueDate"] || ""), description: String(x["description"] || ""), source: "", payer };
          }
          const inv = await ingest(channel, file ? `${sender} · ${file.name}` : sender, data);
          setMsgs((m) => [...m, { from: "agent", text: `${file ? `${file.name}\n` : ""}${inv.payer ? `Empresa pagadora: ${inv.payer.name}\n` : ""}${reply(inv)}`, invId: inv.id }]);
        } catch (error) {
          if (file) failed.push(file);
          setMsgs((m) => [...m, { from: "agent", text: `No se procesó ${file?.name ?? "el mensaje"}: ${error instanceof Error ? error.message : "Error inesperado"}. Puedes volver a intentarlo.` }]);
        }
      }
    } finally { setBusy(false); }
    return failed;
  };
  return { msgs, busy, send };
}

function Chat({ msgs, tone }: { msgs: Msg[]; tone: "wa" | "mail" }) {
  return (
    <div className="h-72 space-y-2 overflow-y-auto rounded-md border border-border bg-background p-3">
      {msgs.length === 0 && <p className="text-xs text-muted-foreground">Sin mensajes. Usa un ejemplo o escribe uno.</p>}
      {msgs.map((m, i) => (
        <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs ${m.from === "user" ? (tone === "wa" ? "ml-auto bg-primary/15" : "ml-auto bg-secondary") : "bg-card border border-border"}`}>
          {m.text}
        </div>
      ))}
    </div>
  );
}

export function WhatsApp() {
  const phone = "+57 310 555 0142";
  const { msgs, busy, send } = useLive("whatsapp", phone);
  const [t, setT] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  return (
    <Panel title="WhatsApp · +57 300 AL DIA">
      <p className="mb-2 text-xs text-muted-foreground">Remitente: {phone}</p>
      <div onPaste={(e) => { const pasted = Array.from(e.clipboardData.files); if (!busy && pasted.length) { e.preventDefault(); setFiles((f) => [...f, ...pasted]); } }}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy) setFiles((f) => [...f, ...Array.from(e.dataTransfer.files)]); }}>
      <Chat msgs={msgs} tone="wa" />
      <div className="mt-3 flex flex-wrap gap-2">
        {WA_PRESETS.map((p) => (
          <button key={p.label} disabled={busy} onClick={() => send(p.text, p.key)} className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50">{p.label}</button>
        ))}
      </div>
      <form className="mt-3 space-y-2" onSubmit={async (e) => { e.preventDefault(); if (!busy && (t.trim() || files.length)) { const failed = await send(t, undefined, files); setFiles(failed); if (!failed.length) setT(""); } }}>
        <ChannelAttachments files={files} onChange={setFiles} busy={busy} channel="WhatsApp" />
        <div className="flex gap-2">
          <input aria-label="Mensaje de WhatsApp" disabled={busy} className={`${inputCls} min-w-0`} value={t} onChange={(e) => setT(e.target.value)} placeholder="Escribe la cuenta de cobro…" />
          <Button disabled={busy || (!t.trim() && !files.length)} type="submit">{busy ? "Enviando…" : "Enviar"}</Button>
        </div>
      </form>
      </div>
    </Panel>
  );
}

export function Correo() {
  const from = "facturacion@proveedor.co";
  const { msgs, busy, send } = useLive("correo", from);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  return (
    <Panel title="Correo · facturas@aldia.co">
      <p className="mb-2 text-xs text-muted-foreground">De: {from}</p>
      <Chat msgs={msgs} tone="mail" />
      <div className="mt-3 flex flex-wrap gap-2">
        {MAIL_PRESETS.map((p) => (
          <button key={p.label} disabled={busy} onClick={() => send(`Asunto: ${p.subject}\n\n${p.body}`, p.key)} className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50">{p.label}</button>
        ))}
      </div>
      <form className="mt-2 space-y-2" onSubmit={async (e) => { e.preventDefault(); if (!busy && (body.trim() || files.length)) { const failed = await send(`Asunto: ${subject}\n\n${body}`, undefined, files); setFiles(failed); if (!failed.length) { setSubject(""); setBody(""); } } }}>
        <input aria-label="Asunto del correo" disabled={busy} className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto" />
        <textarea aria-label="Cuerpo del correo" disabled={busy} className={inputCls} rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Cuerpo del correo con los datos de la factura…" />
        <ChannelAttachments files={files} onChange={setFiles} busy={busy} channel="Correo" />
        <Button type="submit" disabled={busy || (!body.trim() && !files.length)}>{busy ? "Enviando…" : "Enviar correo"}</Button>
      </form>
    </Panel>
  );
}

export function Burst() {
  const [st, setSt] = useState<BurstStats | null>(null);
  const [running, setRunning] = useState(false);
  const sig = useRef({ stop: false });
  const go = async () => {
    sig.current = { stop: false };
    setRunning(true);
    setSt(null);
    await runBurst(setSt, sig.current);
    setRunning(false);
  };
  const pct = st ? (st.done / BURST_SIZE) * 100 : 0;
  const box = (l: string, v: string | number, c = "") => (
    <div className="rounded-md border border-border p-3"><div className="font-mono text-[10px] uppercase text-muted-foreground">{l}</div><div className={`text-xl font-bold ${c}`}>{v}</div></div>
  );
  return (
    <Panel title={`Prueba de ráfaga · ${BURST_SIZE} facturas a ${BURST_PER_MINUTE}/min`}>
      <p className="mb-3 text-sm text-muted-foreground">
        Mitad por WhatsApp, mitad por correo, con casos normales y trampas. Solo decide el motor de reglas. El equipo revisa máximo {TEAM_CAPACITY} escaladas a la vez: las de riesgo alto entran siempre; el resto se agrupa por proveedor en lotes para no saturarlo.
      </p>
      <div className="flex gap-2">
        <button disabled={running} onClick={go} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{running ? "Ráfaga en curso…" : `Lanzar ráfaga de ${BURST_SIZE}`}</button>
        {running && <button onClick={() => (sig.current.stop = true)} className="rounded-md border border-border px-4 py-2 text-sm">Detener</button>}
      </div>
      {st && (
        <div className="mt-4 space-y-3">
          <div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {box("Procesadas", `${st.done}/${BURST_SIZE}`)}
            {box("Ritmo", `${st.perMin}/min`)}
            {box("Decisión prom.", `${st.avgMs.toFixed(1)} ms`)}
            {box("Tiempo", `${st.elapsed.toFixed(0)} s`)}
            {box("Pagadas", st.pagada, "text-primary")}
            {box("Frenadas", st.frenada, "text-destructive")}
            {box("Escaladas a revisión", st.activa, "text-warning")}
            {box("Escaladas en lote", st.lote, "text-warning")}
          </div>
          {!running && <p className="text-sm">Listo. Revisa cada factura una por una en <Link to="/auditoria" className="text-primary underline">Auditoría</Link>, filtrando por canal o decisión.</p>}
        </div>
      )}
    </Panel>
  );
}

export function Canales() {
  const { invoices } = useAppState();
  const recent = invoices.filter((i) => i.channel === "whatsapp" || i.channel === "correo").slice(0, 8);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Canales en vivo</h1>
        <p className="mt-1 text-muted-foreground">Las facturas llegan por WhatsApp o correo y el agente decide: pagada, frenada o escalada.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2"><WhatsApp /><Correo /></div>
      <Burst />
      <Panel title="Últimas recibidas por canal">
        {recent.length === 0 ? <p className="text-sm text-muted-foreground">Nada todavía.</p> : (
          <ul className="divide-y divide-border text-sm">
            {recent.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-mono text-xs">{i.channel === "whatsapp" ? "WhatsApp" : "Correo"} · {i.number} · {i.vendorName}</span>
                <span className="flex items-center gap-2">{money(i.amount, i.currency)} <StatusBadge s={i.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
