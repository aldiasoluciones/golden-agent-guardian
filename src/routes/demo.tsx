import { createFileRoute, Link } from "@tanstack/react-router";
import { Burst, Correo, WhatsApp } from "./canales";
import { DemoUpload } from "@/components/demo-upload";
import { ShellAttack } from "@/components/shell-attack";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [
    { title: "Demo completo — blinkagent by AL DIA" },
    { name: "description", content: "Envía facturas por correo, WhatsApp o archivo y corre los lotes de prueba del reto." },
    { property: "og:title", content: "Demo completo — blinkagent by AL DIA" },
    { property: "og:description", content: "Prueba el agente de punta a punta: canales, archivos y lotes verificables." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Demo,
});

function Demo() {
  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Demo</h1>
      <p className="mt-1 text-muted-foreground">Envía una factura por correo, WhatsApp o archivo. El motor decide: pagar, frenar o escalar.</p>
    </div>
    <div className="grid gap-6 lg:grid-cols-2"><Correo /><WhatsApp /></div>
    <DemoUpload />
    <Burst />
    <ShellAttack />
    <p className="text-center text-xs text-muted-foreground"><Link to="/integraciones" className="text-primary underline">Centro de Integración · Entrada y salida Blinka</Link></p>
  </div>;
}
