import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Download, FileUp, Mail, MessageCircle, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Burst, Correo, WhatsApp } from "@/routes/canales";
import { DemoUpload, JURY_CASES } from "@/components/demo-upload";
import { ShellAttack } from "@/components/shell-attack";
import { InboundWebhook } from "@/components/inbound-webhook";
import { BlinkaConnect } from "@/components/blinka-connect";
import { QuickBooksWebhook, StripeWebhook } from "@/components/provider-webhooks";

const CHANNELS = [
  { key: "correo", label: "Correo", icon: Mail },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "archivo", label: "Archivo / PDF", icon: FileUp },
  { key: "api", label: "API / Webhook", icon: Terminal },
] as const;
type Ch = (typeof CHANNELS)[number]["key"];

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: ReactNode }) {
  return <section className="relative space-y-4 border-l-2 border-primary/30 pl-5 sm:pl-8">
    <span className="absolute -left-[15px] top-0 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{n}</span>
    <div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>
    {children}
  </section>;
}

export function RealTestGuide() {
  const [ch, setCh] = useState<Ch>("correo");
  const label = CHANNELS.find((c) => c.key === ch)!.label;
  const pdfs = JURY_CASES.filter((c) => c.file);
  return <section aria-label="Prueba real para jurados" className="space-y-8">
    <div>
      <h2 className="text-2xl font-semibold">Prueba real para jurados</h2>
      <p className="mt-1 text-sm text-muted-foreground">De principio a fin: elige la entrada, corre los 4 ejercicios, revisa las decisiones y mira la salida a Stripe y QuickBooks. El motor de reglas decide; no se mueve dinero real.</p>
    </div>

    <Step n={1} title="Elige la forma de entrada" text="La factura llega por correo, WhatsApp, archivo o directamente por API firmada.">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Forma de entrada">
        {CHANNELS.map((c) => <Button key={c.key} size="sm" variant={ch === c.key ? "default" : "outline"} aria-pressed={ch === c.key} onClick={() => setCh(c.key)}><c.icon />{c.label}</Button>)}
      </div>
      {ch === "correo" && <Correo />}
      {ch === "whatsapp" && <WhatsApp />}
      {ch === "api" && <InboundWebhook />}
      {ch === "archivo" && <p className="text-sm text-muted-foreground">Adjunta tu PDF, imagen, XML o texto en el panel de carga del paso 2.</p>}
    </Step>

    <Step n={2} title={`Los 4 ejercicios · entrada ${label}`} text="a) 10 facturas típicas · b) lote de 100 · c) ráfaga de 300 · d) ataque masivo de empresa fantasma.">
      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h4 className="font-semibold">a) 10 facturas típicas — descarga para auditoría manual</h4>
        <ul className="grid gap-1 text-xs sm:grid-cols-2">
          {pdfs.map((c) => <li key={c.file}><a className="inline-flex items-center gap-1 text-primary underline" href={`/downloads/${c.file}`} download><Download className="size-3" />{c.label}</a></li>)}
        </ul>
        <p className="text-xs text-muted-foreground">Los otros {JURY_CASES.length - pdfs.length} casos (cuenta cambiada, no cuadra, presupuesto, tasa alterada) se generan como texto al correr el lote.</p>
        <a href="/downloads/lote-wow-100-facturas.zip" download className="inline-flex items-center gap-1 text-xs text-primary underline"><Download className="size-3" />b) Descargar las 100 facturas (ZIP)</a>
      </div>
      <div id="factura-propia" className="scroll-mt-20"><DemoUpload /></div>
      <Burst />
      <ShellAttack />
    </Step>

    <Step n={3} title="Revisa las decisiones" text="Pagadas salen solas; frenadas y escaladas esperan a un humano. Las alertas de fraude aparecen como ventana en Validaciones.">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to="/validaciones">Ir a Validaciones</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/analitica">Ver analítica</Link></Button>
      </div>
    </Step>

    <Step n={4} title="Salida · Stripe paga, QuickBooks contabiliza" text="Solo lo aprobado genera orden firmada hacia Blinka/Stripe y el BillPayment vuelve a QuickBooks.">
      <BlinkaConnect />
      <div className="grid gap-4 lg:grid-cols-2"><StripeWebhook /><QuickBooksWebhook /></div>
    </Step>

    <Step n={5} title="Cierre · Auditoría y conciliación" text="Cada decisión queda con nombre, fecha exacta y motivo. Descarga el Excel listo para el contador.">
      <Button asChild size="sm" variant="outline"><Link to="/auditoria">Registro de auditoría y Excel</Link></Button>
    </Step>
  </section>;
}
