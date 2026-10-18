# Retirar el banner de alertas cuando se revisan + refresco horario

## Qué cambia para el tesorero
1. **Banner de alerta preventiva se retira solo cuando todo fue revisado.** Al abrir "Ver detalles" (o descargar el informe) y pulsar "Marcar como revisado", el banner desaparece de Bandeja y Validaciones. Si después llega una nueva factura sospechosa, el banner vuelve a aparecer solo con lo nuevo. Los informes siguen disponibles en Registro de auditoría.
2. **Refresco automático cada hora** de las facturas entrantes en Bandeja y Validaciones, sin mover lo que se está revisando.
3. **Botón "Refrescar ahora"** en ambas vistas para cuando el tesorero termine antes; muestra "N factura(s) nueva(s)" o "Sin novedades" y la hora del último refresco.

## Detalles técnicos
- `src/lib/fraud-alerts.ts`: guardar por empresa (en su propio estado local) la lista de facturas sospechosas ya revisadas (`reviewedFraudIds`) y exponer `markFraudReviewed(ids)`. `fraudScan` devuelve `unreviewed`; el banner solo se muestra si hay facturas sin revisar. No cambia ninguna decisión de pago.
- `src/components/fraud-alert.tsx`: botón "Marcar como revisado" en el diálogo; registra evento de auditoría "alertas revisadas" con fecha.
- Extraer la lógica de refresco de `src/routes/bandeja.tsx` a un hook compartido (`useHourlyRefresh`) y usarlo también en `src/routes/validaciones.tsx`.
- Prueba en `src/lib/fraud-alerts.test.ts`: tras marcar revisadas, el banner queda oculto; una nueva sospechosa lo reactiva.
