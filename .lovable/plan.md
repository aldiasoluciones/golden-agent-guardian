# Bandeja operativa + Demo limpio para jurados

## 1. Bandeja (se abre desde Validaciones)
- Lleva lo de la captura: los 4 indicadores (pendientes de firma, pagado vs. presupuesto, capital protegido, pagos fuera de reglas), la lista de cuentas por pagar y el detalle de cada factura con reglas, razonamiento, comprobante o firma humana.
- Se quitan de la Bandeja los botones de prueba y la carga de archivos (pasan a Demo).
- Conserva "Volver a Validaciones".

## 2. Demo limpio (una sola vista, 4 bloques)
1. **Enviar un correo** (simulador de correo).
2. **Escribir un WhatsApp** (simulador de WhatsApp).
3. **Subir facturas**: individual o varias a la vez (arrastrar y soltar).
4. **Lotes listos**:
   - **Lote jurados: un caso típico por factura** (nuevo, PDFs multilingües). Cada caso muestra el resultado esperado y, al terminar, una tabla "esperado vs. obtenido" con check verde o alerta:
     - Válida → PAGAR
     - Duplicada → FRENAR
     - Proveedor fuera de lista blanca → FRENAR
     - Cuenta bancaria cambiada → ESCALAR
     - Supera límite de auto-pago → ESCALAR
     - No cuadra con lo acordado → ESCALAR
     - Presupuesto insuficiente → ESCALAR
     - Sin pagador → FRENAR
     - Empresa pagadora ajena → FRENAR
     - Tasa de cambio alterada → ESCALAR
   - **Lote WOW: 100 facturas heterogéneas** (se mantiene, con ZIP descargable).
- Se retiran de Demo: ráfaga 300/min, botones "un clic por caso", lote de 7 y la consola API completa (queda solo un enlace pequeño "Ver API REST").

## 3. Validación de las condiciones del reto
Prueba automática que corre los casos del lote jurados contra el motor y confirma:
- Cero pagos fuera de reglas (ningún caso con regla fallida queda pagado).
- Cada factura termina en PAGAR, FRENAR o ESCALAR según lo esperado.
- Toda decisión tiene motivo legible sin depender de la IA.
- Sin datos reales y sin mover dinero (pagos simulados).
Además se correrá el lote de 100 en el navegador y se revisará que ninguna factura con reglas fallidas aparezca pagada.

## 4. Cómo funciona la API en vivo (respuesta en el chat)
Se explicará al final con un ejemplo: un sistema externo (ERP, correo, WhatsApp Business) envía la factura en JSON a la dirección pública del agente; el motor aplica las políticas de la empresa y responde al instante pagar/frenar/escalar con las reglas evaluadas y el motivo. No guarda la factura ni mueve dinero.

## Detalles técnicos
- `bandeja.tsx`: quitar paneles de presets/subida; agregar KPIs (reutilizar lógica de `index.tsx`).
- Nuevo componente de carga + lotes extraído de `bandeja.tsx` (read/commit, 3 workers).
- `canales.tsx`: exportar `WhatsApp` y `Correo`; Demo los usa sin `Burst`.
- Generar ~10 PDFs en `public/downloads/lote-jurados/` con pagadores de tenants reales; manifiesto con decisión esperada.
- Test nuevo en `src/lib/rules.test.ts` con un caso por regla.
