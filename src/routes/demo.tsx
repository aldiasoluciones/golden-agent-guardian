import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Burst, Correo, WhatsApp } from "./canales";
import { ApiDocs } from "./api-docs";
import { DemoUpload } from "@/components/demo-upload";
import { ShellAttack } from "@/components/shell-attack";
import { InboundWebhook } from "@/components/inbound-webhook";
import { BlinkaConnect } from "@/components/blinka-connect";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [
    { title: "Demo de punta a punta — blinkagent by AL DIA" },
    { name: "description", content: "Flujo completo: la factura entra por correo, WhatsApp o ERP, el motor decide y la orden aprobada sale hacia Blinka." },
    { property: "og:title", content: "Demo de punta a punta — blinkagent by AL DIA" },
    { property: "og:description", content: "Entrada omnicanal, blindaje determinista y salida simulada hacia Blinka en una sola vista." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Demo,
});

function Step({ id, n, title, text, children }: { id: string; n: number; title: string; text: string; children: ReactNode }) {
  return <section id={id} className="relative scroll-mt-20 space-y-4 border-l-2 border-primary/30 pl-5 sm:pl-8">
    <span className="absolute -left-[15px] top-0 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{n}</span>
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
    {children}
  </section>;
}

function Demo() {
  return <div className="space-y-10">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Demo de punta a punta</h1>
      <p className="mt-1 text-muted-foreground">Entrada → decisión → salida. Todo simulado: no se mueve dinero real.</p>
    </div>
    <Step id="entrada" n={1} title="Entrada · La factura llega" text="Por correo, WhatsApp, archivo, lote o directamente desde el ERP con firma segura.">
      <div className="grid gap-6 lg:grid-cols-2"><Correo /><WhatsApp /></div>
      <DemoUpload />
      <Burst />
      <InboundWebhook />
      <ApiDocs embedded />
    </Step>
    <Step id="blindaje" n={2} title="Decisión · El motor filtra" text="Reglas fijas deciden pagar, frenar o escalar. Prueba un ataque de empresa fantasma.">
      <ShellAttack />
    </Step>
    <Step id="salida" n={3} title="Salida · Orden hacia Blinka" text="Solo las facturas aprobadas generan orden de dispersión firmada, con su riel asignado.">
      <BlinkaConnect />
    </Step>
  </div>;
}
