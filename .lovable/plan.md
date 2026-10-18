# Guion final + Inicio con el nuevo mensaje de venta

## Mensaje central (se usa igual en guion e Inicio)
blinkagent potencia tu productividad, te permite llegar más lejos con tus clientes, es seguro para todos y previene ataques antes de que se produzcan.

## 1. Guion final (entregable descargable)
Documento `guion-final-blinkagent.md` en Archivos, con:
- Elevator de 1 minuto y guion de video de 3:00 (con tiempos), lenguaje claro y cercano.
- Los 4 pilares del mensaje, cada uno con prueba visible en la app:
  - Productividad: lotes de 10/100/300 facturas, decisiones en milisegundos, solo los casos dudosos llegan a revisión humana.
  - Llegar más lejos: rutas de pago por país y moneda, facturas en varios idiomas, conexión con QuickBooks y Stripe.
  - Seguro para todos: reglas fijas que deciden (la IA solo lee y explica), huella digital de cada decisión, revisión humana, cada empresa aislada.
  - Previene antes: cuarentena de empresas nuevas (empresa fantasma), defensa contra instrucciones ocultas en la factura, cuenta bancaria alterada, duplicados por cualquier canal, firmas en webhooks de entrada y salida, escaneo general con aviso consolidado al final (no interrumpe) e informe en Excel.
- Definición de fraude (3 tipologías) y frases de cierre.
- Cifras de pérdidas y ROI marcadas como escenarios, no resultados medidos.

## 2. Pantalla de Inicio
- Nuevo encabezado y subtítulo con el mensaje central.
- Fila de 4 pilares (Productividad, Alcance, Seguridad para todos, Prevención) reemplazando/ajustando los pilares actuales.
- Nueva sección corta "Así prevenimos ataques" con 6 controles: empresa fantasma en cuarentena, instrucciones ocultas, cuenta alterada, duplicados omnicanal, firmas de webhooks, escaneo preventivo con informe.
- Se mantienen los 5 sellos de confianza con sus aclaraciones de alcance; sin afirmar certificaciones.
- Actualizar título y descripción de la página.

## Detalles técnicos
- Solo cambios de presentación en `src/routes/index.tsx` (y el componente de sellos si hace falta texto); sin tocar reglas de pago.
- Verificar compilación y pruebas existentes.
- La factura subida (FACTURE_PA-9410) puede citarse en el guion como ejemplo de prueba real en francés, si la quieres incluir.
