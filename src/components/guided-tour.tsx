import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

type Path = "/" | "/demo" | "/validaciones" | "/auditoria" | "/politicas";
const STEPS: { to: Path; title: string; text: string }[] = [
  { to: "/", title: "1. Inicio y sellos", text: "Mira los 3 pilares y abre «Ver respaldo técnico» en un sello para ver qué está protegido." },
  { to: "/demo", title: "2. Demo: lote Jurados", text: "Pulsa «Correr lote jurados». Verás 10 casos típicos: el motor paga, frena o escala cada uno según las reglas." },
  { to: "/validaciones", title: "3. Validaciones", text: "Aquí quedan solo los casos que necesitan una persona. Aprueba o rechaza uno escribiendo el motivo." },
  { to: "/auditoria", title: "4. Registro de auditoría", text: "Cada decisión tiene su explicación, fecha y responsable. Descarga el cruce de cuentas en Excel." },
  { to: "/politicas", title: "5. Administración", text: "Cambia límites y proveedores autorizados. En «Conexión Blinka» prueba la conexión y descarga la orden de pago." },
];

export function GuidedTour() {
  const [step, setStep] = useState<number | null>(null);
  const nav = useNavigate();
  const go = (i: number) => { setStep(i); void nav({ to: STEPS[i]!.to }); };
  if (step === null)
    return (
      <button onClick={() => go(0)} className="fixed bottom-5 right-5 z-30 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
        ▶ Iniciar demo guiado
      </button>
    );
  const s = STEPS[step]!;
  return (
    <div role="dialog" aria-label="Demo guiado" className="fixed bottom-5 right-5 z-30 w-80 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">{s.title}</h2>
        <button onClick={() => setStep(null)} aria-label="Cerrar demo guiado" className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
      <div className="mt-3 flex gap-1">
        {STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
      </div>
      <div className="mt-3 flex justify-between">
        <button disabled={step === 0} onClick={() => go(step - 1)} className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-40">Anterior</button>
        {step < STEPS.length - 1
          ? <button onClick={() => go(step + 1)} className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">Siguiente</button>
          : <button onClick={() => setStep(null)} className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">Terminar</button>}
      </div>
    </div>
  );
}
