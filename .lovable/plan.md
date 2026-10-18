# Botón «Ejecución completa en vivo» en Demo

Un solo botón arriba de Demo que recorre todo el circuito sin copiar nada ni cambiar de pestaña.

## Qué verá el usuario
Un panel con 4 pasos que se encienden uno tras otro (con check verde al terminar):

1. **Entrada** — corre el lote Jurados (10 casos típicos) por el mismo motor de siempre.
2. **Decisión** — muestra el resumen: cuántas pagadas, frenadas y escaladas, con el motivo de cada una.
3. **Webhook de entrada** — envía una factura firmada como lo haría un ERP y muestra la respuesta (PAGAR) y el rechazo de una firma falsa (401).
4. **Salida** — genera un webhook de prueba automáticamente y envía solo las órdenes aprobadas; muestra HTTP 200, tiempo y enlace «Ver entregas en webhook.site».

Al final: tarjeta de resultado con capital protegido, enlaces directos a «Revisar en Validaciones» (casos escalados) y «Descargar conciliación Excel».

## Reglas que se mantienen
- El motor determinista sigue siendo la única autoridad; nada frenado o escalado sale.
- Todo simulado: no se mueve dinero; producción sigue bloqueada.
- Repetible: usa la limpieza automática del lote Jurados, siempre 10/10.
- Si falla webhook.site, el paso 4 lo dice claramente y el resto del flujo queda válido.

## Detalle técnico
- Nuevo componente `src/components/live-run.tsx`, montado al inicio de `src/routes/demo.tsx`.
- Reutiliza `runJurySession` (store), `createTestWebhook` y `sendDispersalWebhook` (webhook.functions), `dispersalOrders` (blinka-connect) y la firma HMAC del webhook de entrada (extraer `sign` a un helper compartido).
- Sin cambios en `rules.ts` ni en endpoints. Verificación con Playwright en móvil y escritorio; tests existentes en verde.
