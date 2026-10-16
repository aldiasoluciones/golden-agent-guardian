import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel, inputCls } from "@/components/ui-bits";
import { fmt } from "@/lib/rules";
import { log, store, uid, useAppState } from "@/lib/store";
import type { Policies, Vendor } from "@/lib/types";

export const Route = createFileRoute("/politicas")({
  head: () => ({
    meta: [
      { title: "Políticas financieras — Blinka Agent" },
      { name: "description", content: "Límites de auto-pago, lista blanca de proveedores, presupuestos y reglas de anomalías." },
      { property: "og:title", content: "Políticas financieras — Blinka Agent" },
      { property: "og:description", content: "Define las reglas dentro de las que el agente puede pagar solo." },
    ],
  }),
  component: PoliciesPage,
});

function setP(patch: Partial<Policies>, msg: string) {
  store.set((s) => ({ ...s, policies: { ...s.policies, ...patch } }));
  log({ type: "politica", message: msg });
}

function PoliciesPage() {
  const { policies: p } = useAppState();
  const [v, setV] = useState<Omit<Vendor, "id">>({ name: "", nit: "", bankAccount: "", category: "Suministros", avgAmount: 1_000_000 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Políticas y reglas financieras</h1>
        <p className="mt-1 text-muted-foreground">El agente solo paga solo si una factura cumple todas estas reglas. Los cambios aplican de inmediato.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Límite de auto-pago">
          <input type="number" className={inputCls} value={p.autoPayLimit}
            onChange={(e) => setP({ autoPayLimit: Number(e.target.value) }, `Límite de auto-pago cambiado a ${fmt(Number(e.target.value))}.`)} />
          <p className="mt-2 font-mono text-xs text-muted-foreground">Por encima de {fmt(p.autoPayLimit)} se pide aprobación.</p>
        </Panel>
        <Panel title="Detección de anomalías">
          <label className="text-sm">Multiplicador sobre el promedio histórico</label>
          <input type="number" step="0.1" className={`${inputCls} mt-1`} value={p.anomalyMultiplier}
            onChange={(e) => setP({ anomalyMultiplier: Number(e.target.value) }, `Umbral de anomalía cambiado a ${e.target.value}×.`)} />
        </Panel>
        <Panel title="Controles antifraude">
          {([["requireBankMatch", "Exigir cuenta bancaria registrada"], ["blockDuplicates", "Bloquear facturas duplicadas"]] as const).map(([k, l]) => (
            <label key={k} className="mb-2 flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-primary" checked={p[k]}
                onChange={(e) => setP({ [k]: e.target.checked }, `${l}: ${e.target.checked ? "activado" : "desactivado"}.`)} />
              {l}
            </label>
          ))}
        </Panel>
      </div>

      <Panel title="Presupuestos mensuales por categoría">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(p.budgets).map(([cat, b]) => (
            <div key={cat}>
              <label className="text-sm">{cat}</label>
              <input type="number" className={`${inputCls} mt-1`} value={b}
                onChange={(e) => setP({ budgets: { ...p.budgets, [cat]: Number(e.target.value) } }, `Presupuesto ${cat} = ${fmt(Number(e.target.value))}.`)} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Lista blanca de proveedores">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left font-mono text-xs text-muted-foreground">
              <tr><th className="py-2">Proveedor</th><th>NIT</th><th>Cuenta registrada</th><th>Categoría</th><th>Promedio</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {p.vendors.map((x) => (
                <tr key={x.id}>
                  <td className="py-2">{x.name}</td>
                  <td className="font-mono">{x.nit}</td>
                  <td className="font-mono">{x.bankAccount}</td>
                  <td>{x.category}</td>
                  <td className="font-mono">{fmt(x.avgAmount)}</td>
                  <td className="text-right">
                    <button className="text-xs text-destructive" onClick={() => setP({ vendors: p.vendors.filter((y) => y.id !== x.id) }, `Proveedor ${x.name} retirado de la lista blanca.`)}>Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="mt-4 grid gap-2 sm:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!v.name || !v.nit) return;
            setP({ vendors: [...p.vendors, { ...v, id: uid("V") }] }, `Proveedor ${v.name} agregado a la lista blanca.`);
            setV({ ...v, name: "", nit: "", bankAccount: "" });
          }}>
          <input className={inputCls} placeholder="Nombre" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          <input className={inputCls} placeholder="NIT" value={v.nit} onChange={(e) => setV({ ...v, nit: e.target.value })} />
          <input className={inputCls} placeholder="Banco y cuenta" value={v.bankAccount} onChange={(e) => setV({ ...v, bankAccount: e.target.value })} />
          <select className={inputCls} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
            {Object.keys(p.budgets).map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="number" className={inputCls} placeholder="Promedio" value={v.avgAmount} onChange={(e) => setV({ ...v, avgAmount: Number(e.target.value) })} />
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Agregar</button>
        </form>
      </Panel>

      <button className="text-sm text-muted-foreground underline" onClick={() => confirm("¿Reiniciar todo el demo?") && store.reset()}>
        Reiniciar demo (borra facturas, auditoría y restaura políticas)
      </button>
    </div>
  );
}
