# blinkagent by AL DIA

**Agente de pagos con IA que paga las cuentas dentro de las reglas de la empresa y pide permiso cuando algo se sale de ellas.**

blinkagent lee facturas en cualquier idioma y canal (correo, WhatsApp, archivos, API, webhook), identifica al pagador legítimo, audita cada factura contra las reglas financieras de la empresa en milisegundos, paga las válidas de forma autónoma y frena o escala a aprobación humana (HITL) todo lo que viole las reglas — con el motivo exacto explicado en lenguaje plano.

> **Demo en vivo:** https://blinkagent.lovable.app
> **Prueba real para jurados:** https://blinkagent.lovable.app/demo

---

## Índice

1. [Qué resuelve](#qué-resuelve)
2. [Definición de fraude](#definición-de-fraude)
3. [Flujos de la aplicación](#flujos-de-la-aplicación)
4. [Arquitectura](#arquitectura)
5. [Estructura del código](#estructura-del-código)
6. [Motor de reglas determinista](#motor-de-reglas-determinista)
7. [APIs y webhooks](#apis-y-webhooks)
8. [Ciberseguridad](#ciberseguridad)
9. [Multiempresa (100 tenants)](#multiempresa-100-tenants)
10. [Pruebas](#pruebas)
11. [Instalación y ejecución local](#instalación-y-ejecución-local)
12. [Límites del demo](#límites-del-demo)

---

## Qué resuelve

| Problema | Cómo lo resuelve blinkagent |
|---|---|
| Facturas en idiomas y formatos dispares | Ingesta multilingüe (ES/EN/FR/DE/PT) con extracción de datos y detección del pagador |
| Pagos duplicados (mismo canal o distinto canal) | Bloqueo determinista por número de factura y huella SHA-256 del documento |
| Fraude BEC (cuenta bancaria alterada) | Verificación contra la cuenta homologada en la lista blanca → freno inmediato |
| Empresas fantasma / proveedores no registrados | Fuera de lista blanca o en cuarentena (< 30 días) → cero dispersión autónoma |
| Exceso de límites y presupuestos | Límite de auto-pago, límite mensual y presupuesto por categoría comparados en COP |
| Auditoría y cumplimiento | Registro completo de auditoría, decisión firmada (SHA-256) y conciliación en Excel |

**Pilares del producto:**

1. **ROI por eficiencia del agente** — el tesorero solo ve lo que requiere validación humana.
2. **Bajo consumo de IA** — la IA solo extrae y explica; las decisiones no dependen de ella.
3. **Confiabilidad determinista** — un motor de reglas de código cerrado decide el dinero; la IA jamás alucina una decisión.

## Definición de fraude

En blinkagent, **indicio de fraude** es cualquier intento deliberado o anómalo de inducir una dispersión económica hacia un destinatario no legítimo, desviar fondos a una cuenta no homologada, o cobrar múltiples veces por una misma obligación. Tres tipologías detectadas por el motor:

1. **Suplantación de cuenta (BEC / man-in-the-middle)** — la cuenta bancaria, IBAN, llave Pix/Bre-B o wallet del invoice no coincide con la homologada → `bank_account_mismatch` → FRENAR/ESCALAR.
2. **Proveedor fantasma / suplantación de identidad** — empresas inexistentes, de reciente creación o con ID fiscal alterado → `whitelist_unauthorized` / `shell_company_quarantine` → FRENAR de raíz.
3. **Cobro duplicado (replay attack)** — la misma factura por dos canales → `duplicate_hash` / `duplicate_invoice_number` → FRENAR.

**Distinción clave:** un desvío operativo (supera el límite de auto-pago, tasa de cambio fuera de tolerancia, dígito faltante) **escala a HITL por política interna** — no se etiqueta como fraude. Las señales preventivas de fraude activan alerta e informe sin cambiar la decisión de pago.

## Flujos de la aplicación

### Flujo 1 — Entrada omnicanal

```
Correo / WhatsApp / Archivo / API / Webhook (QuickBooks Bill)
        │
        ▼
Extracción de datos (multilingüe) + detección del pagador
        │
        ▼
Motor determinista (src/lib/rules.ts) — 15 ms
        │
   ┌────┴─────────┬──────────────┐
   ▼              ▼              ▼
 PAGAR        FRENAR        ESCALAR
   │              │              │
   ▼              ▼              ▼
Orden firmada  Retención      Cola HITL
(rail Blinka)  + motivo       (Validaciones)
```

- Si el pagador no está identificado o es una entidad ajena → la factura se frena; si no declara a quién va dirigida → se rechaza.
- Las facturas válidas generan **orden de pago firmada** dirigida al riel correcto (ACH, SWIFT, SEPA, Pix, Bre-B, SPEI, CBU, PSE, etc. según país y moneda — tabla en `src/lib/rails.ts`).

### Flujo 2 — Ejecución y salida

```
Factura PAGADA → Orden firmada (HMAC SHA-256)
        │
        ▼
Webhook de salida (Stripe payout / riel Blinka simulado)
        │
        ├── payout pagado  → BillPayment listo para QuickBooks (conciliación)
        └── payout fallido → escalado a HITL
```

### Flujo 3 — Validación humana (HITL)

- `/validaciones` muestra **solo** los casos que requieren decisión humana (ni bandeja histórica ni reportes).
- El operador aprueba o rechaza con nombre y justificación; la decisión queda con **huella digital SHA-256** (nombre, fecha exacta y motivo).
- Sin pop-ups que congelen la pantalla: un escaneo preventivo corre en segundo plano y muestra un banner no bloqueante con los hallazgos; el detalle y el informe Excel se abren solo por acción del usuario. Al marcar las alertas como revisadas, el banner se retira hasta que llegue una nueva sospechosa.
- Refresco automático cada hora sin mover lo que el tesorero está revisando, con «Refrescar ahora» a demanda.

### Flujo 4 — Auditoría, tesorería y conciliación

- `/auditoria` — registro en tiempo real de cada decisión con su motivo determinista.
- `/analitica` — histórico de decisiones, presupuestos y eficiencia del agente.
- **Conciliación en Excel** generada en el navegador (ExcelJS) con impuestos, monedas y firmas — lista para el ERP/contador.

### Flujo 5 — Demo guiada (para jurados)

`/demo` en una sola vista vertical:

1. **Prueba real para jurados** (arriba): selector de canal (correo / WhatsApp / archivo) → 4 ejercicios: 10 facturas típicas (descargables para auditoría manual), lote de 100 facturas (descargable en ZIP), 300 facturas de demostración y entrada de ataque masivo.
2. **Salida a Stripe y QuickBooks** con órdenes firmadas y webhooks de prueba.
3. **Conexiones listas para pegar** (al final): correo/WhatsApp vía Make/Zapier, API de decisión con cURL firmado, QuickBooks y Stripe.

## Arquitectura

```
┌────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                     │
│  TanStack Start v1 (SSR + rutas de archivo + Server Fns)   │
│  Tailwind CSS v4 · estado por tenant en localStorage       │
├────────────────────────────────────────────────────────────┤
│                    BACKEND (edge runtime)                  │
│  Server Functions: extract, translate, decide, webhooks    │
│  Lovable AI Gateway (solo extracción/explicación)          │
├────────────────────────────────────────────────────────────┤
│              API PÚBLICA (src/routes/api/public/v1)        │
│  POST /inbound (webhook firmado HMAC)                      │
│  POST /decide (API de decisión)                            │
│  POST /quickbooks · /stripe (webhooks de proveedor)        │
├────────────────────────────────────────────────────────────┤
│                 NÚCLEO DETERMINISTA (código cerrado)       │
│  src/lib/rules.ts — PAGAR / FRENAR / ESCALAR               │
│  IA solo extrae y explica · cero pagos fuera de las reglas │
└────────────────────────────────────────────────────────────┘
```

**Stack tecnológico:**

- **Framework:** TanStack Start v1 (React 19, SSR/SSG, Server Functions en runtime edge / Cloudflare Workers).
- **Lenguaje:** TypeScript estricto en el 100 % del proyecto (frontend, backend y pruebas).
- **Estilos:** Tailwind CSS v4 con tokens semánticos.
- **IA:** Lovable AI Gateway (`openai/gpt-6-astra`) — solo extracción de datos, traducción del sitio y explicación de decisiones.
- **Pruebas:** Vitest (motor de reglas, rieles, fraude, tesorería, sesiones de jurado, firmas, routing).
- **Backend de datos:** Lovable Cloud (PostgreSQL) disponible; el estado operativo del demo vive aislado por tenant en el navegador.

## Estructura del código

```
src/
├── lib/
│   ├── rules.ts              # Motor determinista: PAGAR/FRENAR/ESCALAR + decisionReason
│   ├── agent.ts              # Orquestación: extracción IA → reglas → ejecución
│   ├── rails.ts              # Rieles de pago por país/moneda + FX a COP
│   ├── types.ts              # Tipos de dominio (Invoice, Policies, AuditEvent…)
│   ├── tenants.ts            # 100 empresas generadas deterministicamente
│   ├── store.ts              # Estado por tenant (localStorage) + runJurySession
│   ├── fraud.ts              # Simulación de empresa fantasma (shell company)
│   ├── fraud-alerts.ts       # Escaneo preventivo consolidado + informe Excel
│   ├── burst.ts              # Ataques de ráfaga/duplicados
│   ├── treasury.ts           # Selectores puros de tesorería
│   ├── api-decide.ts         # Lógica compartida de la API de decisión
│   ├── provider-signatures.ts# Verificación de firmas Intuit/Stripe
│   ├── extract.functions.ts  # Extracción de datos de facturas (IA)
│   └── translate.functions.ts# Traducción del sitio (EN) vía IA
├── routes/
│   ├── index.tsx             # Landing (pilares + sellos de confianza)
│   ├── demo.tsx              # Demo guiada en vista vertical
│   ├── validaciones.tsx      # Solo casos HITL pendientes
│   ├── bandeja.tsx           # Bandeja operativa
│   ├── auditoria.tsx         # Registro de auditoría
│   ├── analitica.tsx         # Reportes históricos
│   ├── politicas.tsx         # Panel de políticas y lista blanca
│   └── api/public/v1/        # inbound · decide · quickbooks · stripe
├── components/               # full-flow, real-test-guide, guided-tour, fraud-alert…
└── test/                     # Pruebas de routing y setup
```

## Motor de reglas determinista

`src/lib/rules.ts` evalúa cada factura contra 11 controles y produce una de tres decisiones con un `decisionReason` en lenguaje plano (explicabilidad garantizada sin depender de la IA):

| # | Control | Fallo → |
|---|---|---|
| 1 | Pagador identificado y legítimo | FRENAR/RECHAZAR |
| 2 | Proveedor en lista blanca | FRENAR |
| 3 | Cuenta bancaria = cuenta homologada | FRENAR (BEC) |
| 4 | No duplicada (número + hash) | FRENAR |
| 5 | Monto ≤ límite de auto-pago | ESCALAR (HITL) |
| 6 | Monto dentro de lo acordado ± tolerancia | ESCALAR |
| 7 | Dentro de anomalía vs. promedio histórico | ESCALAR |
| 8 | Dentro del presupuesto de su categoría | ESCALAR |
| 9 | Total del mes ≤ límite por período | ESCALAR |
| 10 | Tasa de cambio dentro de tolerancia | ESCALAR |
| 11 | Documento legal vigente (RUT/W-9/W-8) | ESCALAR |

- **Todo el dinero se compara en COP** vía la tasa USD configurada (y tasas demo por moneda en `fxToCOP`) — una sola moneda base mantiene límites y presupuestos consistentes.
- Duplicados y proveedores no autorizados **congelan** el flujo; cualquier otro fallo **escala** a validación humana.
- La IA **solo explica y extrae**: mantener "cero pagos fuera de las reglas" es demostrable.

## APIs y webhooks

| Endpoint | Método | Propósito |
|---|---|---|
| `/api/public/v1/inbound` | POST | Webhook de entrada: verifica HMAC (`X-Blinkagent-Signature`, clave sandbox `sandbox`), evalúa con el motor y responde la decisión. No persiste. |
| `/api/public/v1/decide` | POST | API de decisión: mismo motor, sin firma (para pruebas directas). |
| `/api/public/v1/quickbooks` | POST | Webhook de prueba QuickBooks: verifica firma oficial Intuit; un `Bill` pasa por el motor. |
| `/api/public/v1/stripe` | POST | Webhook de prueba Stripe: payout pagado → registro `BillPayment` para QuickBooks; payout fallido → escalado. |

Ejemplo de prueba firmada:

```bash
BODY='{"invoice":{"number":"TL-5590","vendorName":"Tekno Logic","nit":"900123456","bankAccount":"Bancolombia 123456789","amount":1200000,"currency":"COP","category":"Tecnología","dueDate":"2026-11-01","description":"Licencias","source":"api"}}'
SIG=$(node -e "const c=require('crypto');console.log(c.createHmac('sha256','sandbox').update(process.argv[1]).digest('hex'))" "$BODY")
curl -s -X POST https://blinkagent.lovable.app/api/public/v1/inbound \
  -H "Content-Type: application/json" \
  -H "X-Blinkagent-Signature: sha256=$SIG" \
  -d "$BODY"
```

## Ciberseguridad

Defensas implementadas (presentacionales en la landing, reales en el motor y los webhooks):

- **Anti prompt-injection:** las instrucciones ocultas dentro de PDFs nunca alteran las decisiones — la IA no decide el dinero.
- **Blindaje BEC:** la cuenta de destino se compara contra la homologada; discrepancia → freno con alerta.
- **Cuarentena de empresas fantasma:** proveedores nuevos (< 30 días) tienen autonomía de pago $0.
- **Duplicados omnicanal:** bloqueo por número y huella SHA-256 en cualquier canal de entrada.
- **Webhooks firmados:** HMAC SHA-256 en el webhook de entrada y verificación de firmas oficiales Intuit/Stripe.
- **Escaneo preventivo de fraude:** consolidado y no bloqueante; ≥ 3 facturas sospechosas hacia el mismo cliente en 10 minutos → alerta + informe Excel. Señal preventiva, nunca confirmación de fraude ni cambio de decisión.
- **Bloqueo de destinos internos:** las órdenes de salida rechazan hosts locales/privados.
- Los sellos de confianza de la landing describen **controles implementados**; no afirman certificaciones externas ni air-gap físico.

## Multiempresa (100 tenants)

- 100 clientes se generan determinísticamente en `src/lib/tenants.ts`; cada uno con su propio perfil de riesgo.
- El estado de cada tenant (políticas, facturas, auditoría) vive bajo **su propia clave de localStorage** — aislamiento total entre empresas.
- El **Lote Jurados** usa estados de política temporales y solo reemplaza facturas/eventos etiquetados como jurado: las demostraciones repetidas nunca contaminan datos ajenos.

## Pruebas

```bash
bunx vitest run
```

Suites incluidas: `rules.test.ts` (motor), `rails.test.ts` (rieles y FX), `fraud.test.ts` y `fraud-alerts.test.ts` (fraude y escaneo), `treasury.test.ts` (selectores), `jury-session.test.ts` (aislamiento del lote de jurado), `provider-signatures.test.ts` (firmas), `tenants.test.ts`, `app-routing.test.tsx` (rutas).

## Instalación y ejecución local

```bash
git clone <este-repositorio>
cd blinkagent
npm install        # o: bun install
npm run dev        # servidor de desarrollo
bunx vitest run    # pruebas
```

## Límites del demo

Para transparencia total con jurados y auditores:

- Los simuladores de **correo y WhatsApp** procesan la factura en el navegador; no son conexiones reales a esos servicios. Correo/WhatsApp reales requieren un puente (Make/Zapier) hacia el webhook de entrada.
- El webhook de entrada es **stateless** (verifica, decide y no persiste).
- Los pagos **Stripe/Blinka** y la escritura en **QuickBooks** están simulados: no se mueve dinero ni se escribe en cuentas reales.
- La persistencia centralizada y las notificaciones multiusuario requieren conectar el almacenamiento en la nube del proyecto.

---

© AL DIA POWERED BY ALJ — construido con [Lovable](https://lovable.dev).
