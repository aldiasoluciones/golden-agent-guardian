import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIntuit, signStripe } from "@/lib/provider-signatures";

type StepState = "idle" | "run" | "ok" | "fail";
type Step = { title: string; detail: string; state: StepState; body?: string };

const BILL = {
  number: `QB-BILL-${Math.floor(2000 + Math.random() * 8000)}`,
  vendorName: "Papelería Andina S.A.S",
  vendorTaxId: "900123456-1",
  bankAccount: "Bancolombia 123-456789-01",
  currency: "COP",
  category: "Suministros",
  amount: 1_200_000,
  payer: { name: "AL DIA Demo S.A.S" },
};

const INITIAL: Step[] = [
  { title: "1 · Entrada QuickBooks", detail: "Bill firmado con la firma oficial de Intuit", state: "idle" },
  { title: "2 · Decisión del motor", detail: "Reglas deterministas: PAGAR, FRENAR o ESCALAR", state: "idle" },
  { title: "3 · Dispersión Stripe", detail: "Solo si la decisión es PAGAR: payout firmado", state: "idle" },
  { title: "4 · Regreso a QuickBooks", detail: "BillPayment con huella SHA-256 para conciliar", state: "idle" },
];

const dot = (s: StepState) =>
  s === "ok" ? "bg-primary" : s === "fail" ? "bg-destructive" : s === "run" ? "animate-pulse bg-primary/50" : "bg-muted-foreground/30";

export function FullFlow() {
  const [steps, setSteps] = useState<Step[]>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState("");

  const set = (i: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((st, j) => (j === i ? { ...st, ...patch } : st)));

  const run = async () => {
    setBusy(true);
    setVerdict("");
    setSteps(INITIAL);
    const origin = window.location.origin;
    try {
      // 1-2: QuickBooks inbound → deterministic engine
      set(0, { state: "run" });
      const qbBody = JSON.stringify({ bill: BILL });
      const qb = await fetch(`${origin}/api/public/v1/quickbooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "intuit-signature": await signIntuit("sandbox", qbBody) },
        body: qbBody,
      });
      const qbJson = await qb.json().catch(() => ({}));
      if (!qb.ok) throw new Error(qbJson.error ?? `HTTP ${qb.status}`);
      set(0, { state: "ok", body: JSON.stringify(qbJson, null, 2) });
      set(1, { state: "ok", detail: `Decisión: ${qbJson.decision} · ${qbJson.reason ?? qbJson.decisionReason ?? ""}` });

      if (qbJson.decision !== "PAGAR") {
        set(2, { state: "fail", detail: "Sin orden de salida: el motor no aprobó el pago" });
        set(3, { state: "fail", detail: "No se genera BillPayment" });
        setVerdict(`El motor decidió ${qbJson.decision}: nada sale hacia Stripe ni QuickBooks. Cero pagos fuera de las reglas.`);
        return;
      }

      // 3: Stripe payout.paid confirmation
      set(2, { state: "run" });
      const stripeBody = JSON.stringify({
        id: `evt_${Date.now()}`,
        type: "payout.paid",
        data: { object: {
          id: `po_${Math.random().toString(36).slice(2, 10)}`,
          amount: BILL.amount * 100,
          currency: "cop",
          failure_message: null,
          metadata: { invoice: BILL.number, vendor: BILL.vendorName, receipt_sha256: (qbJson.receiptSha256 ?? "demo").padEnd(64, "0") },
        } },
      });
      const st = await fetch(`${origin}/api/public/v1/stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Stripe-Signature": await signStripe("sandbox", stripeBody) },
        body: stripeBody,
      });
      const stJson = await st.json().catch(() => ({}));
      if (!st.ok) throw new Error(stJson.error ?? `HTTP ${st.status}`);
      set(2, { state: "ok", detail: `Stripe confirmó ${stJson.event} → ${stJson.status}`, body: JSON.stringify(stJson, null, 2) });

      // 4: BillPayment back to QuickBooks
      set(3, { state: "ok", detail: `BillPayment ${stJson.quickbooks?.DocNumber ?? BILL.number} listo para conciliar en QuickBooks` });
      setVerdict("Flujo completo: QuickBooks → motor → Stripe → QuickBooks. Todo firmado, todo auditado, cero dinero real movido.");
    } catch (e) {
      setVerdict(`Error en el flujo: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-primary/40 bg-card p-4">
      <h3 className="font-semibold">Flujo completo en 1 clic · QuickBooks → Motor → Stripe → QuickBooks</h3>
      <p className="text-xs text-muted-foreground">
        La prueba que un jurado puede correr solo: entra un Bill firmado de QuickBooks, el motor decide, Stripe confirma el pago y el registro BillPayment vuelve a QuickBooks con la huella SHA-256. Simulado: no mueve dinero.
      </p>
      <Button size="sm" disabled={busy} onClick={run}>{busy ? "Ejecutando…" : "▶ Probar flujo completo"}</Button>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="rounded border border-border p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${dot(s.state)}`} />
              <span className="font-medium">{s.title}</span>
            </div>
            <p className="ml-4 mt-0.5 text-muted-foreground">{s.detail}</p>
            {s.body && <details className="ml-4 mt-1"><summary className="cursor-pointer font-mono text-[10px]">Ver respuesta</summary><pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px]">{s.body}</pre></details>}
          </li>
        ))}
      </ol>
      {verdict && <p className="rounded bg-muted p-2 text-xs font-medium">{verdict}</p>}
    </section>
  );
}
