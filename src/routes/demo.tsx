import { createFileRoute } from "@tanstack/react-router";
import { RealTestGuide } from "@/components/real-test-guide";
import { ConnectionSnippets } from "@/components/connection-snippets";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [
    { title: "Prueba real para jurados — blinkagent by AL DIA" },
    { name: "description", content: "Paso a paso de principio a fin: entrada por correo, WhatsApp, archivo o API, 4 ejercicios, decisiones, salida a Stripe y QuickBooks." },
    { property: "og:title", content: "Prueba real para jurados — blinkagent by AL DIA" },
    { property: "og:description", content: "Prueba guiada de punta a punta y conexiones listas para pegar." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Demo,
});

function Demo() {
  return <div className="space-y-12">
    <RealTestGuide />
    <ConnectionSnippets />
  </div>;
}
