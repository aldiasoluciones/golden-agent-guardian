# Pagos por país con los rieles de Blinka + lote de 100 facturas realista

## Objetivo
Que cada factura aprobada salga por el riel real que Blinka publica para su país y moneda, y que el lote de 100 facturas refleje esa mezcla de países.

## Mapa de rieles (según la imagen de Blinka)

```text
Transferencias en USD
  Estados Unidos ............ ACH (local) / Wire (urgente o > umbral)
  200+ países ............... SWIFT
  Perú, Panamá, China, HK ... Ruta local en USD

Rutas locales en moneda del país
  Europa (EUR) .............. SEPA
  Colombia (COP) ............ Bre-B (transferencia)
  Brasil (BRL) .............. Pix (TED como respaldo)
  México (MXN) .............. SPEI
  Argentina (ARS) ........... CBU / CVU / Alias
  Chile (CLP), Perú (PEN), Bolivia (BOB),
  Costa Rica (CRC), Sudáfrica (ZAR) .. Transferencia bancaria local
```

Se mantienen USDC (wallet exacta en lista blanca) y Stripe para el webhook de confirmación.

## Qué cambia
1. **Monedas**: se agregan EUR, BRL, MXN, ARS, CLP, PEN, BOB, CRC, ZAR. Cada una con tasa demo fija a COP en Administración (editable), para que límites y presupuestos sigan comparándose en COP.
2. **Países de proveedor**: se amplían a los de la imagen. El riel se elige automáticamente por país + moneda; si la combinación no tiene ruta (p. ej. ARS a un proveedor de Chile), la factura **escala** con un motivo claro ("sin ruta de pago Blinka para…").
3. **Validación del dato bancario por riel** (formato demo): IBAN para SEPA, llave Pix, CLABE de 18 dígitos para SPEI, CBU/CVU de 22 dígitos o alias para Argentina, routing de 9 dígitos para ACH, SWIFT/BIC para Wire/SWIFT. Dato que no corresponde al riel → escala.
4. **Orden de salida**: muestra país, moneda, riel y si es ruta local USD o local en moneda del país.
5. **Lote de 100 facturas regenerado** con proveedores de esos países, en su idioma y moneda (EUR en alemán/francés, BRL en portugués, MXN/ARS/CLP/PEN/BOB/CRC en español, ZAR y USD en inglés), datos bancarios coherentes con el riel, y las mismas trampas (≈9 duplicados, algunas cuentas cambiadas y proveedores fuera de lista). Los proveedores se registran en la lista blanca del cliente demo para que el resultado sea predecible.
6. **Analítica**: nuevo reparto "pagado por riel / país".

## Alcance honesto
Rutas, formatos y tasas son de demostración basados en la página pública de Blinka; no se mueve dinero ni se garantiza disponibilidad real de cada corredor.

## Detalles técnicos
- `src/lib/types.ts`: ampliar `Currency` y `Country`; `usdRate` se complementa con `fxToCOP: Record<Currency, number>` (migración suave: si falta, se construye desde valores por defecto).
- `src/lib/rules.ts`: `invCOP` usa la tabla; nuevo check `rail` (país+moneda+formato de cuenta) que solo puede escalar, nunca pagar por sí mismo.
- `src/lib/blinka-connect.ts`: `railFor` basado en tabla `RAILS` (SEPA, BRE-B, PIX, TED, SPEI, CBU, LOCAL-BANK, ACH, WIRE, SWIFT, USD-LOCAL, USDC, STRIPE).
- Lote: script Python en `/tmp` genera los 100 PDF en `public/downloads/lote-wow/`, actualiza `wow-names.json`, el ZIP y los proveedores del cliente demo; se verifica cargando el lote y comprobando conteos por decisión y por riel.
- Pruebas nuevas: un caso por riel (Colombia→Bre-B, Brasil→Pix, México→SPEI, Europa→SEPA, Argentina→CBU, Perú USD→ruta local USD, Japón USD→SWIFT), formato de cuenta inválido escala, conversión a COP por moneda.
