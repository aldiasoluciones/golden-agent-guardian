import { createFileRoute, Link } from "@tanstack/react-router";
import { TrustSeals } from "@/components/trust-seals";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "blinkagent — Más productividad, más alcance, pagos seguros" },
      { name: "description", content: "Agente de cuentas por pagar de AL DIA: potencia tu productividad, llega más lejos con tus clientes y previene ataques antes de que ocurran." },
      { property: "og:title", content: "blinkagent — Más productividad, más alcance, pagos seguros" },
      { property: "og:description", content: "La IA lee, las reglas deciden. Seguro para todos y preventivo frente a fraudes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const PILLARS = [
  { title: "Potencia tu productividad", text: "Lotes de 10, 100 o 300 facturas decididos en milisegundos; tu equipo solo revisa las excepciones." },
  { title: "Llega más lejos con tus clientes", text: "Facturas en varios idiomas y rutas de pago por país y moneda, conectado con QuickBooks y Stripe." },
  { title: "Seguro para todos", text: "Reglas fijas deciden, la IA solo lee y explica. Cada decisión tiene huella digital y cada empresa está aislada." },
  { title: "Previene antes de que ocurra", text: "Frena fraudes y desvíos antes de mover un peso, con aviso preventivo e informe descargable." },
];

const DEFENSES = [
  { t: "Empresa fantasma en cuarentena", d: "Cuentas nuevas empiezan sin autonomía de pago." },
  { t: "Instrucciones ocultas ignoradas", d: "Texto en la factura nunca cambia las reglas." },
  { t: "Cuenta bancaria alterada", d: "Si el destino no coincide con el registrado, se frena." },
  { t: "Duplicados en cualquier canal", d: "La misma factura por correo, WhatsApp o API no se paga dos veces." },
  { t: "Webhooks firmados", d: "Entradas y salidas con firma; una firma falsa se rechaza." },
  { t: "Escaneo preventivo", d: "Aviso consolidado sin interrumpir e informe en Excel." },
];

function Home() {
  return (
    <main className="mx-auto max-w-7xl space-y-10 px-6 py-12">
      <section className="space-y-5">
        <p className="font-mono text-xs text-primary">blinkagent · by AL DIA (Powered by ALJ)</p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">Paga más rápido, llega más lejos y frena el fraude antes de que ocurra.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">blinkagent potencia tu productividad, te permite llegar más lejos con tus clientes, es seguro para todos y previene ataques antes de que se produzcan.</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full"><Link to="/validaciones">Ir a Validaciones</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link to="/demo">Ver Demo</Link></Button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
          </div>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Así prevenimos ataques</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEFENSES.map((x) => (
            <div key={x.t} className="rounded-xl border border-border p-4">
              <p className="font-medium">{x.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Controles demostrativos implementados en la app; no constituyen certificación externa.</p>
      </section>
      <TrustSeals />
    </main>
  );
}
