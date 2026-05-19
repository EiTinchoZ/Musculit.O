<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Before touching framework-specific APIs, read the relevant guide in `node_modules/next/dist/docs/`.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Proyecto

Nombre de trabajo: `Musculit.O`

Musculit.O es una herramienta personal de tracking de entrenamiento, journal y progreso físico. No debe sentirse como una demo de IA. Debe sentirse como un producto privado, diario, durable y con criterio.

## Regla principal

Claude Code y Codex comparten repositorio, pero no comparten rol.

## Roles

### Claude Code

- Director de producto y de experiencia.
- Responsable del criterio visual, la narrativa de interfaz y la arquitectura de alto nivel.
- Define prioridades, módulos, flujos y decisiones de diseño.
- Cuando toque frontend visible, debe evitar estética genérica y dejar criterios claros para las siguientes iteraciones.

### Codex

- Responsable de implementación pragmática.
- Construye estructura, lógica, persistencia, API, modelos de datos y pantallas.
- Mantiene la coherencia técnica del repo y documenta cambios reales.
- Puede tocar frontend, pero debe respetar la dirección visual del producto.

## Reglas de colaboración

- Antes de implementar, revisar `README.md`, `ROUTINE.md` y este archivo.
- No inventar cambios de rutina. Si cambia la rutina, primero actualizar `ROUTINE.md`.
- No introducir patrones visuales genéricos de SaaS con tarjetas repetidas y métricas vacías.
- No usar terminología fitness inventada. Si un ejercicio es ambiguo, documentarlo y pedir confirmación.
- No marcar como implementado algo que solo está planeado.
- Mantener comentarios breves y de alto valor.

## Estándar visual

- Mobile-first.
- Apariencia premium y editorial, no gamer, no dashboard corporativo, no neón genérico.
- Tipografía con carácter y jerarquía clara.
- Paleta deliberada y sobria.
- Las interacciones deben sentirse rápidas, táctiles y útiles.

## Fuente de verdad operativa

- `README.md`: visión, stack, despliegue y estado real
- `ROUTINE.md`: rutina semanal actual
- `PROMPTS_INICIALES.md`: prompts de arranque
- `src/lib/routine-data.ts`: rutina tipada para la UI
- `prisma/schema.prisma`: modelo de persistencia

## Convenciones técnicas

- Usar TypeScript estricto.
- Mantener módulos chicos y con nombres explícitos.
- Si se agrega persistencia, documentar el modelo de datos en el mismo cambio.
- Si se agrega una dependencia, justificar por qué existe.
- Si se cambia una decisión importante, reflejarla en `README.md`.

## Módulos previstos

1. `Routine Tracker`
2. `Set Weight Logging`
3. `Rest Timer`
4. `Journal`
5. `Progress Analytics`
6. `Calendar / History`
7. `Settings / Profile`

## Estado actual

- Rutina semanal reestructurada: Lun/Jue descanso, Mar Pull, Mié Piernas, Vie Cardio con Cata, Sáb Push con Cata, Dom Piernas con Cata.
- Miercoles y Domingo tienen los mismos ejercicios de piernas (9 ejercicios).
- Interfaz simplificada: 3 tabs (Hoy / Historial / Perfil) en lugar de 5.
- Tab Hoy = tracker del día actual integrado. Sin home separado.
- Timer de descanso, pesos por set y journal intactos.
- Persistencia progresiva con API + Prisma + fallback local.
- Proyecto listo para conectarse a GitHub y luego desplegarse en Vercel con Postgres.
