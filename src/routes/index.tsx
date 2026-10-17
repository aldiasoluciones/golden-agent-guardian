import { createFileRoute, Link } from "@tanstack/react-router";
import { TrustSeals } from "@/components/trust-seals";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "blinkagent — Cero alucinaciones, cero pagos indebidos" },
      { name: "description", content: "Agente de cuentas por pagar de AL DIA: la IA lee, las reglas deciden. Sellos de confianza y ciberseguridad." },
      { property: "og:title", content: "blinkagent — Cero alucinaciones, cero pagos indebidos" },
      { property: "og:description", content: "La IA lee, las reglas deciden. Pagos dentro de política y revisión humana para excepciones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const PILLARS = [
  { title: "ROI por eficiencia", text: "El agente resuelve los casos dentro de política y deja al equipo solo las excepciones." },
  { title: "Bajo consumo de IA", text: "La IA solo extrae y explica; las decisiones se calculan sin costo de IA." },
  { title: "Confiabilidad determinista", text: "Reglas de código deciden pagar, frenar o escalar. Cada decisión queda explicada." },
];

function Home() {
  return (
    <main className="mx-auto max-w-7xl space-y-10 px-6 py-12">
      <section className="space-y-5">
        <p className="font-mono text-xs text-primary">blinkagent · by AL DIA (Powered by ALJ)</p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">Cero alucinaciones, cero pagos indebidos.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">La IA lee facturas en cualquier idioma; las reglas de tu empresa deciden. Lo que se sale de política espera tu firma.</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full"><Link to="/validaciones">Ir a Validaciones</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link to="/demo">Ver Demo</Link></Button>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
          </div>
        ))}
      </section>
      <TrustSeals />
    </main>
  );
}
