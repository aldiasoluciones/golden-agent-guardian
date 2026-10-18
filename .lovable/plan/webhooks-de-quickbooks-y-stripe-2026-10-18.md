# Webhooks de QuickBooks y Stripe

## Objetivo
Dos endpoints públicos nuevos con firma verificada al estilo oficial de cada proveedor, conectados en el flujo:

```text
QuickBooks (Bill creado) --webhook--> blinkagent (reglas) --orden--> Blinka/Stripe (payout)
Stripe (payout.paid / payout.failed) --webhook--> blinkagent --> registro BillPayment para QuickBooks
```

## Qué se construye
1. **Webhook de entrada QuickBooks** — `POST /api/public/v1/quickbooks`
   - Verifica la cabecera `intuit-signature` (HMAC-SHA256 en base64 del cuerpo con el "verifier token").
   - Acepta el formato de notificación de Intuit (`eventNotifications[].dataChangeEvent.entities` con `name: "Bill"`) y también un Bill completo de demo (proveedor, monto, moneda, cuenta).
   - Pasa el Bill por el motor determinista y responde PAGAR / FRENAR / ESCALAR con su motivo. Firma falsa → 401.
2. **Webhook de confirmación Stripe** — `POST /api/public/v1/stripe`
   - Verifica `Stripe-Signature` (`t=…,v1=…`, HMAC-SHA256 de `t.cuerpo`, tolerancia de 5 min).
   - Eventos `payout.paid`, `payout.failed`, `transfer.created`. Si es pagado, devuelve el registro `BillPayment` listo para QuickBooks con la huella SHA-256; si falla, lo marca para revisión humana.
3. **Panel en Demo** (paso 1 Entrada y paso 3 Salida): botones "QuickBooks: Bill válido", "QuickBooks: proveedor fuera de lista", "Firma falsa", y en salida "Stripe: payout pagado", "Stripe: payout fallido", con registro de respuestas.
4. Pruebas automáticas: firma válida acepta, firma falsa da 401, Stripe con marca de tiempo vieja da 401, Bill de proveedor no autorizado da FRENAR.

## Alcance honesto
- Funciona con claves sandbox ("sandbox") por defecto. Para recibir eventos reales se guardan dos claves secretas: `QUICKBOOKS_VERIFIER_TOKEN` y `STRIPE_WEBHOOK_SECRET`, y se registra la URL pública en el portal de desarrolladores de Intuit y en Stripe → Webhooks.
- No mueve dinero ni escribe en QuickBooks: devuelve el registro de pago para que la integración real lo publique.

## Detalles técnicos
- Archivos: `src/routes/api/public/v1/quickbooks.ts`, `src/routes/api/public/v1/stripe.ts`, utilidades de firma puras en `src/lib/provider-signatures.ts` (+ test), panel `src/components/provider-webhooks.tsx` montado en `src/routes/demo.tsx`.
- Reutiliza `decideApi` y validación Zod; lectura de secretos dentro del handler; comparación en tiempo constante; límite de 100 KB.
