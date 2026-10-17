import { useState } from "react";
import { buildAttack, detectShellCompany, simulateAttack } from "@/lib/fraud";
import { useAppState } from "@/lib/store";
import { fmt, invCOP } from "@/lib/rules";

export function ShellAttack() {
  const { policies } = useAppState();
  const [res, setRes] = useState<null | { det: ReturnType<typeof detectShellCompany>; out: ReturnType<typeof simulateAttack> }>(null);
  const run = () => {
    const atk = buildAttack(policies);
    const det = detectShellCompany(atk, policies, 3, 120);
    setRes({ det, out: simulateAttack(atk, policies, det.quarantine) });
  };
  const blocked = res ? res.out.filter((x) => x.final !== "pagar").reduce((a, x) => a + invCOP(x.inv, policies), 0) : 0;
  return <section className="rounded-xl border bg-card p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">Simular ataque: empresa fantasma</h2>
        <p className="text-sm text-muted-foreground">Empresa creada hace 3 días envía 40 facturas en 2 horas, con montos justo bajo el límite y a una cuenta mula. Simulación: no se guarda ni se paga nada.</p>
      </div>
      <button onClick={run} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">Lanzar ataque</button>
    </div>
    {res && <div className="space-y-3">
      <div className={`rounded-lg border p-4 ${res.det.quarantine ? "border-destructive bg-destructive/10" : "border-border"}`}>
        <p className="font-semibold">{res.det.quarantine ? `🚨 ALERTA: posible empresa fantasma — riesgo ${res.det.score}/4. Cuarentena activada: autonomía en $0.` : "Sin alerta"}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {res.det.signals.map((s) => <li key={s.id}>{s.hit ? "✗" : "✓"} <b>{s.label}</b> — {s.detail}</li>)}
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border p-3"><div className="text-2xl font-bold">{res.out.length}</div><div className="text-xs text-muted-foreground">Facturas del ataque</div></div>
        <div className="rounded-lg border p-3"><div className="text-2xl font-bold">{res.out.filter((x) => x.final === "pagar").length}</div><div className="text-xs text-muted-foreground">Pagadas</div></div>
        <div className="rounded-lg border p-3"><div className="text-2xl font-bold">{fmt(blocked)}</div><div className="text-xs text-muted-foreground">Capital protegido</div></div>
      </div>
      <p className="text-xs text-muted-foreground">Doble barrera: el motor ya frena por proveedor no autorizado ({res.out.filter((x) => x.engine === "frenar").length}/{res.out.length}); la cuarentena congela todo aunque el atacante lograra registrarse en la lista blanca.</p>
    </div>}
  </section>;
}
