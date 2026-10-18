import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

type Path = "/" | "/demo" | "/validaciones" | "/auditoria" | "/politicas";
const STEPS: { to: Path; title: string; text: string }[] = [
  { to: "/", title: "1. Inicio", text: "Lee los 4 pilares, las defensas contra ataques y abre «Ver respaldo técnico» en un sello." },
  { to: "/demo", title: "2. Prueba real para jurados", text: "Elige la entrada (correo, WhatsApp, archivos o API) y corre los ejercicios: 10 facturas típicas, lote de 100, 300 facturas y ataque masivo." },
  { to: "/demo", title: "3. Salida a Stripe y QuickBooks", text: "Mira cómo las facturas aprobadas generan la orden de pago y el registro contable. Al final están las conexiones listas para pegar." },
  { to: "/validaciones", title: "4. Validaciones", text: "Solo quedan los casos que necesitan una persona. Si hay alertas, ábrelas con «Ver detalles» y «Marcar como revisado» para retirar el aviso. Usa «Refrescar ahora» para traer facturas nuevas." },
  { to: "/auditoria", title: "5. Registro de auditoría", text: "Cada decisión tiene motivo, fecha y responsable. Descarga el cruce de cuentas y los informes preventivos en Excel." },
  { to: "/politicas", title: "6. Administración", text: "Cambia límites, proveedores autorizados y la empresa activa para ver reglas distintas." },
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
