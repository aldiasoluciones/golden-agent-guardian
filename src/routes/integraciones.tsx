import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { ApiDocs } from "./api-docs";
import { BlinkaConnect } from "@/components/blinka-connect";

export const Route = createFileRoute("/integraciones")({
  head: () => ({ meta: [
    { title: "Centro de Integración — blinkagent by AL DIA" },
    { name: "description", content: "Entrada REST de facturas y salida simulada de órdenes hacia Blinka en un solo lugar." },
    { property: "og:title", content: "Centro de Integración — blinkagent by AL DIA" },
    { property: "og:description", content: "Prueba decisiones de entrada y descarga órdenes simuladas hacia Blinka." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Integrations,
});

function Integrations() {
  return <div className="space-y-6">
    <header>
      <h1 className="text-3xl font-bold">Centro de Integración</h1>
      <p className="mt-2 text-sm text-muted-foreground">Entrada REST disponible · Salida hacia Blinka simulada · No se mueve dinero.</p>
    </header>
    <div className="grid items-start gap-8 xl:grid-cols-2">
      <section className="min-w-0 space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><ArrowDownToLine className="size-5 text-primary" />Entrada · Evaluar factura</h2>
        <p className="text-sm text-muted-foreground">Devuelve PAGAR, FRENAR o ESCALAR y su motivo. No guarda facturas; el historial debe incluirse en cada solicitud.</p>
        <ApiDocs embedded />
      </section>
      <section className="min-w-0 space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><ArrowUpFromLine className="size-5 text-primary" />Salida · Órdenes para Blinka</h2>
        <p className="text-sm text-muted-foreground">Órdenes del cliente activo. Aún no hay una API de salida conectada a Blinka.</p>
        <BlinkaConnect />
      </section>
    </div>
  </div>;
}