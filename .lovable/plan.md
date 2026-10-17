# Centro de Comando Financiero — AL DIA

Objetivo: que la pantalla principal se sienta como un centro de comando bancario (rigor Blinka) y que se opere tan rápido como una herramienta estilo Tecnicapp. Solo cambios visuales y de orden; el motor de reglas no se toca.

## 1. Pantalla principal = Centro de Comando
Arriba, una franja de 4 indicadores grandes de la empresa activa:
- Pendientes de tu firma (número, en amarillo)
- Pagado este mes vs. presupuesto (barra)
- Capital protegido (frenadas, en rojo)
- Pagos fuera de reglas: 0 (sello verde fijo de seguridad)

Debajo, solo la cola de casos que requieren validación humana (como hoy), y al resolverlos salen de la vista.

## 2. Tarjetas de revisión estilo Tecnicapp
- Semáforo de prioridad a la izquierda (alta / normal).
- Monto grande, proveedor, vencimiento y el motivo en una línea.
- Botones grandes de un toque: Aprobar y pagar / Rechazar, visibles sin abrir nada.
- Nombre y justificación siguen siendo obligatorios (rigor), pero el nombre del aprobador se recuerda para no escribirlo cada vez.
- Funciona bien en celular (botones a todo el ancho).

## 3. Rigor visible
- Sello en cada tarjeta: "Decisión del motor determinista · la IA solo explica".
- Línea de confianza al pie: comprobante SHA-256, registro inmutable, Excel de conciliación.

## 4. Analítica más limpia
- Mismo contenido, con los 3 porcentajes por tipología como tarjetas de color y el presupuesto arriba; mejor lectura en pantallas pequeñas.

## Detalles técnicos
- Archivos: src/routes/index.tsx, src/components/review-case.tsx, src/routes/analitica.tsx, tokens en src/styles.css si hace falta.
- Indicadores reutilizan budgetSummary y pendingValidation de treasury.ts; nombre del aprobador guardado en localStorage.
- Sin cambios en rules.ts, agent.ts ni pruebas de reglas; verificación visual con captura a 631 px y escritorio.
