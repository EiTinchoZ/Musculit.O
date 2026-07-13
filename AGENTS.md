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
- Miercoles y Domingo comparten los mismos 9 ejercicios de piernas; Miercoles ademas cierra con finisher de core (cable crunch + leg raises), igual que Sabado (Push).
- Interfaz simplificada: 3 tabs (Hoy / Historial / Perfil) en lugar de 5.
- Tab Hoy = tracker del día actual integrado. Sin home separado.
- Timer de descanso, pesos por set y journal intactos.
- Persistencia progresiva con API + Prisma + fallback local.
- Proyecto listo para conectarse a GitHub y luego desplegarse en Vercel con Postgres.

---

## Plan de Implementación — Overhaul 2026-07-13

Rol: **Solo Claude Code** (confirmado por Tín). Pendiente de aprobación explícita antes de tocar código.

### Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Frecuencia de abs | 3x/semana — Miércoles, Sábado y Domingo (los 2 días de pierna + Push) | Cambiado 2026-07-13 a pedido explícito de Tín, prioriza frecuencia sobre recuperación óptima. Sábado-Domingo quedan seguidos (recuperación de abs sub-óptima ese par); revisar si el progreso se estanca |
| Paleta UI | Se mantiene ember/brass | Ya es la identidad visual del producto, el overhaul es de layout/interacción, no de dirección de color |
| Tab IA | 4to tab "Coach" en la barra principal | Confirmado por Tín, revierte la simplificación a 3 tabs documentada arriba — queda registrado aquí como cambio consciente |
| IndexedDB | No se agrega | El JSON de estado es chico (sesiones de un solo usuario), localStorage ya alcanza. Se documenta para no repetir la pregunta |
| Animaciones Bloque 3 | CSS puro, sin Framer Motion | Evita dependencia nueva y peso de bundle en una app mobile-first; `globals.css` ya tiene el patrón de keyframes a extender |

### Bloque 1 — Rutina (routine-data.ts + ROUTINE.md)

Cambios del amigo, ya parcialmente aplicados en el código actual — solo falta:
- `cable-overhead-tricep-extension`: `2 x 8` → `3 x 8`
- `leg-extension`: `2 x 8-10` → `3 x 8-10`
- `abductor machine`: `1 x fallo` → `2 x 8`, cue actualizado con "lean forward al sentarte" para más activación de glúteo medio

Bloque de core (TikTok), como finisher:
- Cable crunch (o sustituto con disco + banco declinado si no hay polea) — `3 x 10-15 al fallo`
- Leg raises controladas, sin balanceo — `3 x 10-15 al fallo`
- Va al final de Miércoles (Piernas) y Sábado (Push)
- `ROUTINE.md` se actualiza primero (fuente de verdad), luego `routine-data.ts`

### Bloque 2 — Fix persistencia / Safari (crítico)

Diagnóstico real tras leer el código (no es lo que se asumió originalmente):
- El `localStorage.setItem` en cada cambio de estado **ya es síncrono** (musculit-app.tsx:67) — eso no es el bug.
- El bug real tiene dos partes:
  1. El guardado a la base de datos va detrás de un debounce de 700ms (`musculit-app.tsx:98-116`). Si Safari suspende la pestaña antes de que dispare, la DB nunca recibe el cambio.
  2. Al reabrir la app, el efecto que carga desde `/api/app-state` **sobreescribe sin condición** el estado ya hidratado desde localStorage (`musculit-app.tsx:82`). Si la DB quedó desactualizada por el punto 1, esta carga borra el progreso más reciente que sí estaba en localStorage.

Fix:
- Listener `visibilitychange` (a `hidden`) + `pagehide`: disparar el PUT inmediatamente con `fetch(..., { keepalive: true })`, sin esperar el debounce
- Guardar un timestamp `updatedAt` junto al estado (local y en DB); al cargar desde `/api/app-state`, comparar contra el timestamp local y solo reemplazar si el remoto es más nuevo — nunca pisar un estado local más reciente
- No se agrega IndexedDB (ver decisiones arriba)

### Bloque 3 — UI overhaul mobile-first

- Rediseño de layout orientado 100% a iPhone Safari, mismos 3+1 tabs
- Touch targets mínimo 44px, sin dependencia de estados `:hover`
- Animaciones con CSS (keyframes + transitions), sin librería nueva
- Flujo de registro de set con mínimo de taps
- Mantiene paleta ember/brass y estándar visual ya documentado arriba

### Bloque 4 — Tab de IA ("Coach")

**Cambio de proveedor (2026-07-13):** Tín pidió no usar Anthropic, usar Groq. La API de Groq es compatible con el formato de OpenAI, así que se implementó con `fetch` directo a `https://api.groq.com/openai/v1/chat/completions` — **sin agregar ningún SDK nuevo** como dependencia.

- `GROQ_API_KEY` en `.env.local` (la key nunca toca el cliente, todo corre en `src/app/api/coach/route.ts`)
- Modelos: `llama-3.1-8b-instant` para "Resumen semanal" (rápido/barato), `llama-3.3-70b-versatile` para "Análisis completo" (más profundo, compara contra el objetivo declarado y da 2-3 recomendaciones concretas)
- El route lee el `AppState` real directamente del store server-side (`loadPersistedAppState`), no depende de que el cliente mande el estado completo — arma el contexto (perfil, stats derivados, últimas 14 sesiones con datos reales) y se lo pasa al modelo
- Si no hay sesiones registradas todavía, responde con un mensaje claro en vez de llamar a Groq sin datos
- Tab "Coach" (4to tab, ver decisión tomada) con dos botones y área de resultado con estados de carga/error
- Verificado en navegador con Playwright: ambos modos (resumen y análisis) devolvieron respuestas reales y coherentes en español, sin errores de consola. `tsc --noEmit` limpio.

### Orden de ejecución

1. Bloque 1 (rutina) — **listo (2026-07-13)**: `ROUTINE.md` y `routine-data.ts` actualizados (overhead tricep extension 3x8, leg extension 3x8-10, abductor machine 2x8 con cue lean forward, finisher de core en Miércoles y Sábado). `tsc --noEmit` limpio.
2. Bloque 2 (persistencia) — **listo (2026-07-13)**: `visibilitychange`/`pagehide` disparan guardado inmediato con `fetch keepalive`. Se agregó `musculit.v1.sync` en localStorage (`lastLocalWriteAt` / `lastConfirmedSyncAt`) para que la carga remota al abrir la app nunca pise un estado local más reciente que no llegó a sincronizarse. Verificado en navegador con Playwright: sin errores de consola, sin requests fallidos, sync meta con timestamps correctos tras un cambio de estado.
3. Bloque 3 (UI) — **listo, pendiente de revisión de Tín (2026-07-13)**. Por pantallas (decisión de Tín): Hoy → Historial → Perfil.
   - Tab Hoy: anillo de progreso SVG (ember→brass) reemplaza el texto plano de % y la barra lineal redundante; checkbox de ejercicio y toggles de unidad/timer a 44px; grilla de sets con columnas dinámicas según el número real de sets (antes quedaba con espacio vacío en ejercicios de 2 sets); timer por set integrado como ícono dentro del input en vez de un botón de texto repetido por columna.
   - Tab Historial: franja de "esta semana" y flechas de navegación del calendario mensual a 44px; leyenda de colores agregada bajo el calendario (antes los puntos de estado no tenían referencia visible).
   - Tab Perfil: inputs de datos personales a 44px de alto mínimo, limpieza de estilos hover redundantes en botones (no aportan nada en mobile, la retroalimentación táctil ya la maneja el `:active` global de `globals.css`).
   - Verificado en navegador con Playwright en las 3 pantallas: `tsc --noEmit` limpio, sin errores de consola, sin requests fallidos.
4. Bloque 4 (IA) — **listo (2026-07-13)**. Cambio de proveedor: Groq en vez de Anthropic (decisión de Tín). Ver detalle abajo.
5. Bloque 7 (semana irregular) — **listo (2026-07-13)**. Ver detalle abajo.
6. Bloque 6 (hábitos/retos/tips) — **listo (2026-07-13)**. Ver detalle abajo.
7. Bloque 5 (PDF) — **listo (2026-07-13)**. Ver detalle abajo.

### Bloque 5 — Exportar rutina a PDF

Pedido 2026-07-13. Explícitamente **al final**, después de todos los demás bloques.

- Documento simple: cronograma semanal, día por día, con enfoque muscular, lista de ejercicios y series x reps de cada uno — pensado para verse como imagen/PDF de referencia rápida (no es parte de la app interactiva, es un export estático).
- Probable ruta server-side que genera el PDF a partir de `routine-data.ts` (misma fuente de verdad, no se duplica info a mano).
- Sin dependencias nuevas pesadas si se puede evitar — evaluar `@react-pdf/renderer` vs generar HTML y convertir con una librería liviana al momento de implementar.

**Implementación:** se optó por HTML + impresión nativa del navegador en vez de una librería de PDF — cero dependencias nuevas, funciona offline, y es el flujo mas natural en iPhone (Safari: Compartir → Imprimir → Guardar en Archivos como PDF).

- `src/app/rutina/page.tsx`: página nueva, renderiza directo desde `weeklySplit` (mismo dato que usa toda la app, cero duplicación a mano). Reglas generales arriba (descanso, intensidad, rango de reps, cardio, objetivo — copiadas de `ROUTINE.md`), despues una card por día con enfoque, duración, cardio y tabla de ejercicios (nombre / grupo muscular / series).
- Paleta propia clara (no ember/brass) porque es un documento pensado para leerse/imprimirse, no para la experiencia de la app — con overrides `print:` que fuerzan fondo blanco y ocultan el botón "Guardar como PDF" al imprimir.
- Botón "Ver rutina en PDF" agregado en el tab Perfil, abre `/rutina` en pestaña nueva.
- Verificado en navegador con Playwright, en vista normal y con `emulateMedia({ media: "print" })`: la tabla completa de los 7 días se ve correcta en ambas, sin errores de consola.

### Bloque 6 — Hábitos, tips y retos

Pedido 2026-07-13. Junta dos pedidos relacionados de Tín: contenido de referencia sobre qué evitar (comida chatarra, azúcar, alcohol) integrado a la app, y un sistema de retos diarios/semanales/mensuales tipo "no tomar cerveza", "no tomar soda", "no comer snacks", con puntos chicos que documenten el progreso.

Decisiones tomadas (2026-07-13):
- Los retos suman al mismo sistema de XP/nivel que ya existe (no un contador separado).
- Lista fija de retos definida junto con Tín en el momento de implementar (no hay editor de retos custom por ahora — se puede agregar después si hace falta).
- Contenido de tips: referencia estática basada en lo que Tín compartió (déficit calórico moderado, proteína alta, fibra, pasos diarios, agua, sueño, evitar ultra-procesados) — vive junto a los retos, no es contenido generado por IA.

**Implementación:**
- `src/lib/habits-data.ts`: lista fija de 9 retos (`Habit[]`) — 5 diarios (sin alcohol, sin comida chatarra, sin bebidas azucaradas, agua, pasos), 2 semanales (sueño, semana sin alcohol), 2 mensuales (mes sin alcohol, consistencia). Cada uno con su XP. También los 7 tips de nutrición/hábitos ahí mismo.
- `AppState.habitCompletions: Record<periodKey, string[]>` — mapa disperso, clave de periodo calculada con `getHabitPeriodKey` (fecha ISO para diario, lunes ISO de la semana para semanal, "YYYY-MM" para mensual). Mismo patrón disperso que `dayOverrides`.
- `getHabitXp(state)` suma el XP de todos los retos marcados y se integra directo en `getDerivedStats` — el nivel/XP que ya ves en Hoy y Perfil ahora incluye hábitos, no solo sesiones de entreno.
- UI: card "Hábitos" en el tab Hoy, visible todos los días (entrenamiento o descanso) ya que hábitos como "sin alcohol" no dependen de si hay gym ese día. Toggles agrupados por Hoy/Esta semana/Este mes. Los tips van en un `<details>` colapsado abajo (progressive disclosure, no satura la pantalla).
- El Coach (Groq) ahora también recibe los hábitos recientes en su contexto, para que las recomendaciones puedan hablar de eso también.
- Persistencia: `habitCompletions` agregado a `AppState`, threading en `normalizeAppState`, file store, y DB (columna nueva `UserProfile.habitCompletions`, JSON string, mismo patrón que `dayOverrides`).
- Verificado en navegador con Playwright: marcar 2 hábitos sumó el XP esperado (15+10=25) reflejado en Perfil, sin errores de consola. Se limpiaron los datos de prueba de la base real después.

### Bloque 7 — Modo de semana irregular

Pedido 2026-07-13. El más grande de los nuevos módulos, toca el modelo de datos central.

- Hoy la app resuelve el día de rutina por día de la semana fijo (`weekdayToDayId` en `musculit-state.ts`, `routine-data.ts`). Tín necesita poder marcar, para una semana puntual, qué días va a descansar (distintos a Lunes/Jueves default) y que la secuencia de tipos de entreno (Pull → Piernas → Cardio → Push → Piernas) se reacomode sobre los días que sí va a entrenar esa semana, sin romper el orden ni la separación entre grupos musculares.
- Caso real que lo disparó: esta semana descansa Martes y Jueves en vez de Lunes y Jueves (por tema personal), y quiere que la app corra la secuencia completa a partir de esos días libres.
- Constraint fija: Viernes/Sábado/Domingo normalmente va al gym con Cata (Cardio/Push/Piernas respectivamente) — si esos días *no* se tocan como descanso, se mantienen tal cual. Si Tín SÍ marca alguno de esos como descanso, la app debe preguntarle explícitamente cómo resolver esa combinación (no asumir en silencio).

Decisiones tomadas (2026-07-13):
- Flujo: Tín marca qué días descansa esa semana → la app calcula y muestra la secuencia reacomodada → Tín confirma antes de que se aplique (no se aplica solo).
- Es una excepción puntual: la semana siguiente vuelve sola al horario default (Lunes/Jueves descanso). No se guardan patrones reutilizables por ahora.
- Implica un nuevo concepto de "override semanal" en el estado persistido (fechas de esa semana ISO → dayId reasignado), separado del cálculo por defecto de `weekdayToDayId`.

**Implementación:**
- `AppState.dayOverrides: Record<isoDate, DayId>` — mapa disperso, solo tiene entradas para fechas explícitamente reacomodadas. Vacío = comportamiento default, sin migración de datos viejos necesaria.
- `getDayIdFromDate`/`getTrainingDayFromDate` (`musculit-state.ts`) ahora aceptan un segundo parámetro `overrides` opcional (default `{}`, retrocompatible). Se hizo threading a través de todos los call sites que ya tenían acceso a `state` (stats, streaks, calendario, `getNextTrainingDays`).
- `computeWeekReflow(weekStart, restIsoDates, skipDayTypes)`: toma la secuencia de tipos de entreno en orden default (derivada directamente de `weeklySplit`, no hardcodeada) y la redistribuye sobre los días disponibles esa semana, en orden cronológico. Si sobran días entrenables, la secuencia cicla (útil si Tín entrena 6-7 días); si faltan, se recorta.
- UI: card "Semana irregular" en el tab Perfil (`WeekOverridePanel`). Marca días de descanso con un grid de toggles, muestra la propuesta calculada en vivo, y si algún día con Cata (Vie/Sáb/Dom) queda marcado como descanso, pide explícitamente si ese entreno se reacomoda otro día o se salta esta semana. Confirmar aplica el override; "Volver al default" lo limpia.
- Persistencia: se agregó `dayOverrides` a `AppState`, se actualizó `normalizeAppState`, `loadFromFile`/`saveToFile`, y `loadFromDatabase`/`saveToDatabase`. En DB se guarda como JSON string en una columna nueva `UserProfile.dayOverrides` (`prisma/schema.prisma`).
- Verificado en navegador con Playwright usando el escenario real de Tín (descansar Martes y Jueves en vez de Lunes y Jueves): la propuesta calculó correctamente Lun=Pull, Mar=Descanso, Mié=Piernas, Jue=Descanso, Vie=Cardio, Sáb=Push, Dom=Piernas, y al confirmar el tab Hoy mostró los ejercicios de Pull en Lunes. Sin errores de consola. `tsc --noEmit` limpio.

**Supabase — resuelto (2026-07-13):** el proyecto estaba pausado (por inactividad, plan free). Tín lo reactivó. Se corrió `npx prisma db push` contra la `DATABASE_URL` real: sincronizó `dayOverrides` y también `weightUnit`, que faltaba en el modelo desde antes (no es algo que haya roto esta sesión, ya estaba así). Se conectó `loadFromDatabase`/`saveToDatabase` para leer y escribir `weightUnit` de verdad en vez de caer siempre al default. Verificado con Playwright: el tab Perfil ahora muestra "Guardado: Base de datos" (antes decía "Local"), y una sesión de prueba escrita se leyó de vuelta correctamente desde Supabase. La sesión y el override de prueba se limpiaron de la base real después de verificar (se usó "Reiniciar datos" y se confirmó por query directa que quedó en 0 sesiones).

Nota de Supabase al reactivar: la data se restauró al estado de antes de pausarse. Como toda la actividad de esta sesión corrió sobre el archivo local (`.musculit-dev-store.json`) mientras la DB estaba caída, no hubo nada real que se perdiera — el archivo local sigue teniendo el estado más reciente si Tín lo necesita, pero el store activo ahora es Supabase.

### Tech debt registrado

- `fetch({ keepalive: true })` tiene un límite de body de ~64KB en la mayoría de navegadores. Con meses de historial de sesiones el JSON de estado podría acercarse a ese límite. No es un problema ahora; si `AppState` crece mucho, evaluar paginar el estado que se envía en el flush de salida (solo la sesión de hoy) en vez de todo el historial.
