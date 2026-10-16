# Blinka Agent — versión AL DIA (Golden Path)

Objetivo: que el demo se sienta como un producto de AL DIA y cubra al 100% la ficha del Reto Blinka, siguiendo la estrategia Golden Path (un recorrido guiado que funciona de principio a fin, sin fallar, en pocos clics).

## 1. Marca AL DIA
- Nombre visible: "Blinka Agent · by AL DIA" en el encabezado, el pie de página, los comprobantes y el CSV exportado.
- Logo AL DIA generado (marca simple con transparencia) en el encabezado y como icono de la pestaña.
- Pie: "Producto de AL DIA · Powered by ALJ".
- Títulos y descripciones de cada página actualizados con la marca.

## 2. Golden Path guiado (la lógica de trabajo)
En la portada, un recorrido de 3 pasos numerados que lleva al jurado sin explicaciones:
1. Define las reglas (Políticas)
2. Corre el set de facturas (Bandeja)
3. Revisa decisiones y registro (Tesorería y Auditoría)

Botón principal "Correr el set completo del reto": procesa todas las facturas de prueba seguidas y deja el tablero listo para revisión.

## 3. Los 5 casos trampa de la ficha (un clic cada uno)
Además de la factura normal:
- Cobro duplicado (misma factura ya pagada)
- Beneficiario nuevo fuera de la lista permitida
- Factura que no cuadra con lo acordado (monto distinto al contrato del proveedor)
- Monto sobre el límite que exige aprobación humana
- Presupuesto insuficiente para el período
- Cambio de cuenta bancaria (se conserva)

## 4. Reglas nuevas pedidas por la ficha
- Límite por período (mensual) además del límite por pago.
- Monto acordado por proveedor con tolerancia (para "no cuadra con lo acordado").
- Moneda: facturas en USD y COP, con tasa de cambio configurable; todas las reglas se evalúan en una moneda base.

## 5. Tres decisiones explícitas
Cada factura termina en uno de tres estados, con su porqué en lenguaje claro:
- Pagada por el agente
- Frenada (duplicado, beneficiario no permitido: nunca se paga sola)
- Escalada a una persona (límite, presupuesto, no cuadra, cuenta distinta)

## 6. Tablero con los criterios de éxito
- Autonomía: % de facturas decididas sin intervención.
- Seguridad: pagos fuera de reglas sin aprobación = 0 (indicador verde fijo, con verificación real).
- Explicabilidad: % de decisiones con explicación registrada.
- Columnas Pagó / Frenó / Escaló con el motivo de cada una.

## Detalles técnicos
- Ampliar tipos y motor de reglas (`rules.ts`): `currency`, `periodLimit`, `agreedAmount`/tolerancia, tasa USD→COP; nuevo estado "frenada" vs "retenida" (escalada).
- Nuevos SAMPLES en `agent.ts` y acción "correr set completo" secuencial.
- Extracción de facturas devuelve también moneda.
- Pruebas en `rules.test.ts`: una por cada caso trampa + regla "nunca paga fuera de reglas".
- Reiniciar almacenamiento con nueva clave para no romper datos viejos.
- Registrar decisiones en `AGENTS.md`; republicar al terminar.
