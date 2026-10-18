import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clipboard, Check, FileUp, Mail, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

const cases = {
  valid: { label: "Factura válida", vendorName: "Papelería Andina S.A.S", vendorTaxId: "900123456-1", bankAccount: "Bancolombia 123-456789-01" },
  blocked: { label: "Proveedor fuera de lista", vendorName: "Fantasma Ltda", vendorTaxId: "999000111-2", bankAccount: "Nequi 300-0000000" },
};

export function RealTestGuide() {
  const [selected, setSelected] = useState<keyof typeof cases>("valid");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const payload = JSON.stringify({ event: "invoice.created", invoice: {
    number: "REAL-TEST-1001", vendorName: cases[selected].vendorName,
    vendorTaxId: cases[selected].vendorTaxId, bankAccount: cases[selected].bankAccount,
    amount: 1_200_000, currency: "COP", category: "Suministros", payer: { name: "AL DIA Demo S.A.S" },
  } });
  const command = `body='${payload}'
signature=$(printf '%s' "$body" | openssl dgst -sha256 -hmac 'sandbox' | awk '{print $NF}')
curl -i 'https://blinkagent.lovable.app/api/public/v1/inbound' \\
  -H 'Content-Type: application/json' \\
  -H "X-Blinkagent-Signature: sha256=$signature" \\
  --data-raw "$body"`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("No se pudo copiar. Selecciona el comando y cópialo manualmente.");
    }
  };

  return <section aria-label="Prueba real para jurados" className="space-y-4 border-y border-border py-6">
    <div>
      <h2 className="text-xl font-semibold">Prueba real para jurados</h2>
      <p className="mt-1 text-sm text-muted-foreground">Usa una factura propia o envía una solicitud al servicio publicado. La lectura y las reglas se ejecutan; los pagos y registros contables siguen siendo simulados.</p>
    </div>
    <details className="group border-b border-border pb-4" open>
      <summary className="flex cursor-pointer items-center gap-2 font-semibold"><FileUp className="size-4 shrink-0 text-primary" />1 · Subir una factura propia</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Selecciona arriba la empresa destinataria. La factura debe identificar al pagador y contener proveedor, identificación fiscal, cuenta, monto y moneda.</li>
        <li>Abre la carga de archivos y adjunta tu PDF, imagen, XML o texto. Usa un archivo de hasta 4,5 MB. La extracción puede necesitar saldo de IA.</li>
        <li>Comprueba la empresa detectada y el motivo de la decisión. Un proveedor no autorizado se frena; una cuenta cambiada requiere revisión.</li>
        <li>Consulta los casos pendientes en Validaciones y el historial en Registro de auditoría. Los datos de esta prueba quedan en este navegador, separados por empresa.</li>
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><a href="#factura-propia"><FileUp />Adjuntar factura</a></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/validaciones">Ver validaciones</Link></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/auditoria">Ver auditoría</Link></Button>
      </div>
    </details>
    <details className="border-b border-border pb-4">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Mail className="size-4 shrink-0 text-primary" />2 · Enviar desde correo o WhatsApp</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Correo: conecta tu buzón en Make o Zapier y configura la recepción de mensajes con adjuntos. WhatsApp: conecta un número de WhatsApp Business mediante un proveedor autorizado.</li>
        <li>Descarga el adjunto y extrae sus datos en el servicio puente. El webhook recibe JSON estructurado, no el PDF ni el mensaje directamente.</li>
        <li>Envía un POST al endpoint del paso 3. Firma el cuerpo exacto con HMAC-SHA256 y envía la cabecera X-Blinkagent-Signature: sha256=&lt;firma&gt;. Escribir solamente «sandbox» no es una firma válida.</li>
        <li>Envía una factura desde tu correo o teléfono y verifica la respuesta en el historial de Make, Zapier o tu proveedor de WhatsApp.</li>
      </ol>
      <p className="mt-3 text-sm text-muted-foreground">Conexión externa pendiente de configurar: los botones Correo y WhatsApp de esta Demo son simuladores. El webhook actual devuelve una decisión, pero no guarda la factura ni activa alertas en esta pantalla. Para eso falta conectar el almacenamiento y las notificaciones.</p>
    </details>
    <details>
      <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Terminal className="size-4 shrink-0 text-primary" />3 · Probar el webhook publicado</summary>
      <p className="mt-3 text-sm text-muted-foreground">Ejecuta en Bash con curl y OpenSSL. Datos sintéticos, solicitud real al servidor. Este comando usa la clave pública de demostración «sandbox»; si se configura una clave privada, deberá firmarse desde tu servicio puente.</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Caso de prueba del webhook">
        {Object.entries(cases).map(([key, item]) => <Button key={key} size="sm" variant={selected === key ? "default" : "outline"} aria-pressed={selected === key} onClick={() => { setSelected(key as keyof typeof cases); setCopied(false); setCopyError(""); }}>{item.label}</Button>)}
        <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check /> : <Clipboard />}{copied ? "Copiado" : "Copiar comando"}</Button>
      </div>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs"><code>{command}</code></pre>
      {copyError && <p role="alert" className="mt-2 text-sm text-destructive">{copyError}</p>}
      <p className="mt-3 text-sm text-muted-foreground">Resultado esperado: HTTP 200 · {selected === "valid" ? "PAGAR con motivo y huella SHA-256 de la decisión (no es un comprobante bancario)" : "FRENAR por proveedor no autorizado"}. Para probar el rechazo de firma, sustituye la cabecera por X-Blinkagent-Signature: sha256=falsa: debe responder HTTP 401.</p>
      <p className="mt-2 text-sm text-muted-foreground">No mueve dinero, no escribe en QuickBooks ni sincroniza el historial del navegador. Detecta duplicados solo si envías el historial en la solicitud. Una prueba completa con pago real requiere habilitar y verificar las conexiones de Blinka/Stripe y QuickBooks.</p>
    </details>
  </section>;
}