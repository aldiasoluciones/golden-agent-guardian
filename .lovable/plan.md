# Demo limpia: Prueba real para jurados de principio a fin

## Qué verá el jurado en /demo (de arriba a abajo)

```text
1. Prueba real para jurados (arriba, única sección operativa)
   Paso 1  Elegir forma de entrada:  [Correo] [WhatsApp] [Archivo/PDF] [API/Webhook]
   Paso 2  En la entrada elegida, 4 ejercicios:
           a) 10 facturas típicas  -> Ejecutar + Descargar los 10 PDF (auditoría manual)
           b) Lote de 100 facturas -> Ejecutar + Descargar ZIP
           c) Ráfaga de 300 facturas (demo de volumen)
           d) Ataque masivo (empresa fantasma) -> dispara alerta preventiva
   Paso 3  Resultado: pagadas / frenadas / escaladas + enlace a Validaciones
   Paso 4  Salida: pagos aprobados -> Stripe ; contabilización -> QuickBooks (BillPayment)
   Paso 5  Cierre: Auditoría y Excel de conciliación
2. Conexiones listas para pegar (al final)
   - Correo / WhatsApp (Make/Zapier -> URL webhook + cabecera de firma + JSON ejemplo)
   - API de decisión (URL + comando cURL firmado)
   - QuickBooks (URL webhook + eventos a suscribir)
   - Stripe (URL webhook + eventos payout.paid / payout.failed)
   Cada bloque con botón Copiar.
```

## Qué se retira de la pantalla
- "Flujo completo en 1 clic".
- Secciones sueltas Entrada / Decisión / Salida, documentación API embebida y paneles duplicados: su función queda dentro de la prueba guiada o en las conexiones finales.

## Reglas que se mantienen
- El motor de reglas sigue siendo el único que decide; nada mueve dinero real.
- Los 4 ejercicios usan los lotes existentes (Jurados 10, WOW 100, ráfaga 300, ataque fantasma) por la entrada elegida, aplicando las mismas verificaciones.
- Se mantiene la nota honesta: correo/WhatsApp/Stripe/QuickBooks reales requieren pegar estas conexiones en sus plataformas.

## Detalles técnicos
- Reescribir `src/components/real-test-guide.tsx` como asistente por pasos con selector de canal (estado local) que reutiliza `runJurySession`, el lote WOW, `Burst` y `ShellAttack` (modo compacto), etiquetando el canal origen.
- Descargas: 10 PDF desde `public/downloads/*.pdf` (añadir los que falten para llegar a 10 o enlazar los del lote jurados), ZIP `public/downloads/lote-wow-100-facturas.zip`.
- Paso de salida reutiliza la lógica de `full-flow.tsx` (Stripe webhook + BillPayment) aplicada a los aprobados; luego eliminar el componente FullFlow de la ruta.
- Nuevo `src/components/connection-snippets.tsx` con URLs basadas en `window.location.origin` y bloques copiables.
- `src/routes/demo.tsx` queda: título, RealTestGuide, ConnectionSnippets. Actualizar `AGENTS.md` (regla de Demo) y verificar con Playwright los 4 canales x 4 ejercicios, descargas y alerta.
