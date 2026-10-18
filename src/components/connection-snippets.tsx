import { useEffect, useState } from "react";
import { Check, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";

function Snippet({ title, note, text }: { title: string; note: string; text: string }) {
  const [ok, setOk] = useState(false);
  return <div className="space-y-2 rounded-lg border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-2">
      <div><h3 className="font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{note}</p></div>
      <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1500); }}>{ok ? <Check /> : <Clipboard />}{ok ? "Copiado" : "Copiar"}</Button>
    </div>
    <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs"><code>{text}</code></pre>
  </div>;
}

export function ConnectionSnippets() {
  const [o, setO] = useState("https://blinkagent.lovable.app");
  useEffect(() => setO(window.location.origin), []);
  const inv = `{"event":"invoice.created","invoice":{"number":"F-1001","vendorName":"Papelería Andina S.A.S","vendorTaxId":"900123456-1","bankAccount":"Bancolombia 123-456789-01","amount":1200000,"currency":"COP","category":"Suministros","payer":{"name":"AL DIA Demo S.A.S"}}}`;
  return <section id="conexiones" aria-label="Conexiones listas para pegar" className="scroll-mt-20 space-y-4 border-t border-border pt-8">
    <div>
      <h2 className="text-xl font-semibold">Conexiones listas para pegar</h2>
      <p className="mt-1 text-sm text-muted-foreground">Copia estos datos en Make/Zapier, tu proveedor de WhatsApp Business, QuickBooks y Stripe para conectar la app a los servicios reales. Firma de demostración: «sandbox».</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Snippet title="Correo o WhatsApp (Make / Zapier)" note="Módulo HTTP POST tras extraer los datos del adjunto o mensaje."
        text={`URL: ${o}/api/public/v1/inbound\nMétodo: POST\nContent-Type: application/json\nX-Blinkagent-Signature: sha256=<HMAC-SHA256 del cuerpo con la clave>\n\nCuerpo:\n${inv}`} />
      <Snippet title="API de decisión" note="Prueba desde una terminal con curl y OpenSSL."
        text={`body='${inv}'\nsig=$(printf '%s' "$body" | openssl dgst -sha256 -hmac 'sandbox' | awk '{print $NF}')\ncurl -i '${o}/api/public/v1/inbound' -H 'Content-Type: application/json' -H "X-Blinkagent-Signature: sha256=$sig" --data-raw "$body"`} />
      <Snippet title="QuickBooks (Intuit webhooks)" note="Developer portal › Webhooks. Firma verificada con el Verifier Token."
        text={`Endpoint URL: ${o}/api/public/v1/quickbooks\nEventos: Bill (Create, Update)\nCabecera esperada: intuit-signature\nRetorno: BillPayment listo para conciliar`} />
      <Snippet title="Stripe (webhook de pagos)" note="Dashboard › Developers › Webhooks › Add endpoint."
        text={`Endpoint URL: ${o}/api/public/v1/stripe\nEventos: payout.paid, payout.failed\nCabecera esperada: Stripe-Signature\nSecreto de firma: whsec_… (configurar en la app)`} />
    </div>
  </section>;
}
