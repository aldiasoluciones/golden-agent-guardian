import { useState } from "react";
import { dispersalOrders } from "@/lib/blinka-connect";
import { useAppState } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function BlinkaConnect() {
  const { invoices, policies } = useAppState();
  const [env, setEnv] = useState<"sandbox" | "produccion">("sandbox");
  const [result, setResult] = useState("");
  const orders = dispersalOrders(invoices, policies);
  const test = () =>
    setResult(env === "produccion"
      ? "Producción bloqueada: requiere credenciales y contrato con Blinka."
      : `200 OK (simulado) · Transfer ID: blk_tx_${Math.random().toString(36).slice(2, 10)} · ${orders.length} órdenes listas`);
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ env, orders }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "orden-dispersion-blinka.json"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">Conexión Blinka · Simulada</h3>
      <p className="text-xs text-muted-foreground">Solo las facturas aprobadas por las reglas o por una persona generan orden de dispersión (ACH, Wire, Bre-B, Pix, SPEI, USDC). Simulado: no mueve dinero.</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select aria-label="Entorno" value={env} onChange={(e) => setEnv(e.target.value as typeof env)} className="rounded-md border border-border bg-background px-2 py-1">
          <option value="sandbox">Sandbox Blinka</option>
          <option value="produccion">Producción</option>
        </select>
        <Button size="sm" onClick={test}>Probar conexión</Button>
        <Button size="sm" variant="outline" onClick={download}>Descargar orden ({orders.length})</Button>
      </div>
      {result && <p className="font-mono text-xs">{result}</p>}
      <p className="font-mono text-[11px] text-muted-foreground">Producción pendiente de documentación, credenciales y contrato con Blinka. No se envían órdenes a un servicio externo.</p>
    </section>
  );
}
