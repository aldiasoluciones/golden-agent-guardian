# Página de inicio con los sellos

## Qué cambia
- Nueva página de Inicio (la primera que se ve al abrir blinkagent): eslogan "Cero alucinaciones, cero pagos indebidos", los 3 pilares (ROI, bajo consumo de IA, motor determinista) y los 5 sellos con su "Ver respaldo técnico".
- Botones claros: "Ir a Validaciones" y "Ver Demo".
- Los sellos salen de la vista de Validaciones, que queda solo con los casos para revisión humana.
- Menú: Inicio, Validaciones, Administración, Registro de auditoría, Demo.

## Detalles técnicos
- `src/routes/index.tsx` pasa a ser la página de inicio (usa `TrustSeals`), con su propio head().
- La cola HITL actual se mueve a `src/routes/validaciones.tsx`.
- Actualizar enlaces en `__root.tsx` y los "← Volver a Validaciones" de bandeja y analítica hacia `/validaciones`.
- Actualizar la regla de `AGENTS.md` sobre la vista principal; correr `bunx vitest run`.
