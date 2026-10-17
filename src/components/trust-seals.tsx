import { Info, Languages, LockKeyhole, Scale, ShieldCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const seals = [
  {
    icon: ShieldCheck,
    title: "Motor determinista",
    badge: "IA sin poder de pago",
    description: "La IA extrae y explica; las reglas controlan la aprobación autónoma.",
    scope: "Separación lógica, no Air-Gap físico. No certifica ausencia de alucinaciones en la lectura de la IA.",
    tone: "text-primary bg-primary/10",
  },
  {
    icon: Languages,
    title: "Lectura multilingüe AL DIA",
    badge: "ES · EN · FR · DE · PT",
    description: "Ingestión en cinco idiomas y control de tolerancia cambiaria FX.",
    scope: "Lectura asistida por IA, sujeta a errores y disponibilidad. El motor compara COP y USD con la tasa configurada; no valida todas las monedas ni jurisdicciones.",
    tone: "text-primary bg-primary/10",
  },
  {
    icon: Target,
    title: "Capital protegido",
    badge: "Sin pago autónomo ante fallas",
    description: "Duplicados y proveedores no autorizados se frenan; cuentas cambiadas se escalan.",
    scope: "Según las políticas activas. Una cuenta distinta requiere revisión humana cuando la comparación bancaria está habilitada; no garantiza protección contra todo fraude.",
    tone: "text-success bg-success/10",
  },
  {
    icon: Scale,
    title: "Supervisión humana & SHA-256",
    badge: "HITL · Trazabilidad",
    description: "Nombre y justificación obligatorios para resolver desvíos; comprobantes con hash.",
    scope: "El nombre registrado no es una firma digital certificada. SHA-256 permite contrastar el comprobante; el historial local no es un registro inmutable ni una auditoría externa.",
    tone: "text-warning-foreground bg-warning/15",
  },
  {
    icon: LockKeyhole,
    title: "Privacidad & Ciberseguridad",
    badge: "Separación por empresa",
    description: "Datos del demo separados por empresa en este navegador; marcos Ley 1581 / GDPR.",
    scope: "Zero-Data Retention, ausencia de reentrenamiento y cumplimiento legal no están verificados. La separación local no sustituye permisos de acceso ni aislamiento de producción.",
    tone: "text-muted-foreground bg-muted",
  },
] as const;

const defenses = [
  { title: "Prompt Injection", text: "El texto extraído no modifica las políticas ni autoriza pagos: el motor evalúa los datos. Una extracción manipulada sigue siendo un riesgo; no hay inmunidad total." },
  { title: "Fraude BEC", text: "Con comparación bancaria activa, una cuenta distinta a la registrada impide el pago autónomo y escala el caso. El remitente o logo no reemplaza esa comprobación." },
  { title: "Duplicados omnicanal", text: "Con bloqueo de duplicados activo, se compara proveedor y número normalizados con pagos previos de la empresa, sin importar el canal. Depende del historial disponible en este navegador." },
] as const;

export function TrustSeals() {
  return (
    <section aria-labelledby="trust-seals-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="trust-seals-title" className="font-mono text-xs uppercase text-muted-foreground">Sellos de confianza y ciberseguridad</h2>
        <span className="text-[11px] text-muted-foreground">Controles del demo · Sin certificación externa</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {seals.map(({ icon: Icon, title, badge, description, scope, tone }) => (
          <article key={title} className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Ver respaldo técnico: ${title}`} title="Ver respaldo técnico" className="h-8 w-8 shrink-0 text-muted-foreground"><Info /></Button>
                </PopoverTrigger>
                <PopoverContent align="end" collisionPadding={16} className="w-96 max-w-[calc(100vw-2rem)] max-h-[70dvh] overflow-y-auto rounded-lg border-border bg-popover shadow-none">
                  <h3 className="text-sm font-semibold">Ver respaldo técnico</h3>
                  <p className="mt-1 text-xs text-primary">{title}</p>
                  <ul className="mt-3 list-disc space-y-3 pl-4 text-xs leading-relaxed">
                    {defenses.map((defense) => <li key={defense.title}><strong>{defense.title}: </strong>{defense.text}</li>)}
                  </ul>
                  <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground"><strong>Alcance: </strong>{scope}</p>
                </PopoverContent>
              </Popover>
            </div>
            <h3 className="text-sm font-semibold leading-snug">{title}</h3>
            <span className="mt-2 self-start rounded border border-border bg-secondary px-2 py-1 font-mono text-[10px] leading-relaxed">{badge}</span>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}