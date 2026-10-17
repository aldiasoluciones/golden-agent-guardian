import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "./bandeja";
import { Canales } from "./canales";
import { ApiDocs } from "./api-docs";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [
    { title: "Demo completo — blinkagent by AL DIA" },
    { name: "description", content: "Carga de facturas, WhatsApp, correo y API REST del agente en una sola vista." },
    { property: "og:title", content: "Demo completo — blinkagent by AL DIA" },
    { property: "og:description", content: "Prueba el agente de punta a punta: archivos, canales y API." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Demo,
});

function Demo() {
  return <div className="space-y-12">
    <section id="bandeja"><Inbox /></section>
    <section id="canales" className="border-t border-border pt-10"><Canales /></section>
    <section id="api" className="border-t border-border pt-10"><ApiDocs /></section>
  </div>;
}
