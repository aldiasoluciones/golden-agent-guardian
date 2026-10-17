# Golden Agent Guardian

el demo debe funcionar de principio a fin y tener un despliegue real en un sitio web.
vamos con la estrategia golden path para el Reto Blinka: Agentes que pagan por la empresa. Un agente que paga las cuentas dentro de las reglas de la empresa y pide permiso cuando algo se sale de ellas.

Debe incluir:
1. Panel de políticas y reglas financieras de la empresa (límites de auto-pago, lista blanca de proveedores, reglas de presupuesto y anomalías).
2. Bandeja de entrada de facturas/cuentas por pagar con carga de archivos y botones de prueba rápida precargados (factura aprobable dentro de reglas vs factura anómala que excede límites o cambia cuenta bancaria).
3. Agente de IA que audita en tiempo real: muestra su cadena de razonamiento y verificación de reglas.
4. Ejecución autónoma para casos válidos (generando comprobante de desembolso) y freno con solicitud de aprobación humana (HITL) interactiva cuando se viola alguna regla, explicando exactamente qué falló.
5. Dashboard de tesorería y registro de auditoría en tiempo real con métricas de dinero pagado automáticamente y dinero retenido por seguridad.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://golden-agent-guardian.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/53bc9bf9-6ff6-4c85-9357-952779024304).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
