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
- Miercoles y Domingo comparten los mismos 9 ejercicios de piernas. El finisher de core (cable crunch + leg raises) ya NO esta fijo a dias especificos: se calcula dinamicamente en `getTrainingDayFromDate` (`musculit-state.ts`), hasta 2 dias de entreno por semana entre Lunes y Jueves. Ver "Finisher de core dinamico" mas abajo para el detalle completo.
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
| Frecuencia de abs | Dinámica: hasta 2 días de entreno por semana, siempre entre Lunes y Jueves, nunca en días con Cata (Vie/Sáb/Dom) | Cambiado 2026-07-13 (segunda vez) a pedido de Tín. Default cae en Martes+Miércoles. Se recalcula solo cuando la semana es irregular — ver "Finisher de core dinámico" abajo |
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

### Finisher de core — de estático a dinámico (2026-07-13, revisión 3)

El finisher de core pasó por 3 iteraciones en esta sesión: primero Miércoles+Sábado (2x/semana), después se agregó Domingo (3x/semana, a pedido de Tín), y finalmente Tín pidió que sea dinámico: **hasta 2 días de entreno por semana, siempre entre Lunes y Jueves, nunca en días con Cata (Vie/Sáb/Dom)** — y que se recalcule solo cuando la semana es irregular.

Esto ya no se puede resolver baqueando los ejercicios en días fijos de `weeklySplit` — depende de qué días son de descanso *esa semana*, que puede cambiar vía `dayOverrides` (Bloque 7). Se movió la lógica al resolver del día:

- `coreFinisherExercises` en `routine-data.ts` ahora se exporta (antes era interno) y ya no está pegado a Miércoles/Sábado/Domingo en `weeklySplit` — esos días volvieron a su lista de ejercicios original.
- `getTrainingDayFromDate(date, overrides)` en `musculit-state.ts` es ahora la única fuente de verdad de "qué ejercicios tiene este día". Internamente resuelve el día base (`getBaseTrainingDay`) y decide si ese día especifico es uno de los (hasta) 2 días de core de la semana (`isAbsFinisherDay`): mira los 4 días Lunes-Jueves de esa semana, filtra los que son de entreno real (respetando overrides), toma los primeros 2 en orden cronológico, y si la fecha consultada está en esa lista, le agrega el finisher.
- **Importante:** esto significa que `getDayById(dayId)` solo, sin pasar por `getTrainingDayFromDate`, ya NO alcanza para saber los ejercicios reales de un día — hay que usar siempre `getTrainingDayFromDate(date, overrides)` cuando se necesite la lista de ejercicios de una fecha concreta. Se corrigieron todos los call sites que hacían esto mal: `app-state-store.ts` (`saveToDatabase`, `normalizeSessionRecord` — ahora recibe `overrides` como parámetro), y en el cliente `normalizeLoadedState` y `getExerciseProgressSummaries`. La página `/rutina` (PDF) también se actualizó para generar la semana de referencia con `getTrainingDayFromDate` en vez de leer `weeklySplit` crudo.
- Bajo el horario default (Lunes/Jueves descanso), esto da Martes (Pull) + Miércoles (Piernas) — ya no Sábado/Domingo.
- Verificado en navegador con Playwright: horario default (Martes y Miércoles con abs, Sábado y Domingo sin abs), y el caso real de semana irregular de Tín (descansar Martes y Jueves) — el finisher se movió solo a Lunes (que pasa a ser Pull) y Miércoles, sin tocar código de nuevo. También se verificó que `/rutina` refleja la misma regla.

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

---

## Plan de Implementación — Pulido y hardening 2026-07-15

Rol: Solo Claude Code (continúa el rol confirmado en el overhaul anterior, no se repite la pregunta a Tín).

Pedido de Tín: pulir lo que ya está, tras una auditoría de código propia (no de skill `audit` corrida aparte) sobre los 14 archivos de `src/`. Confirmado por Tín: "arregla todo eso" sobre la lista completa. Único punto que se le devolvió a confirmar fue el nivel de auth de las rutas de API — eligió passcode simple.

### Hallazgos y decisiones

| # | Hallazgo | Decisión |
|---|---|---|
| 1 | `saveToDatabase` borra y recrea *todas* las sesiones en cada autosave (cada 700ms tras un cambio) | Pasar a upsert por sesión usando los `@@unique` que ya existen en el schema (`[userId, sessionDate]`, `[workoutId, exerciseId]`, `[sessionExerciseId, setIndex]`) — solo tocar lo que cambió, borrar solo lo que ya no está en `state.sessions` |
| 2 | Cambiar lb/kg no convierte historial ni etiqueta en qué unidad quedó cada sesión | Agregar `weightUnit` a `SessionRecord` (se fija al crear la sesión, no se retro-convierte), mostrar la unidad junto a los pesos en Historial |
| 3 | "Reiniciar datos" sin confirmación | Patrón de doble tap in-place ("Reiniciar datos" → "¿Seguro? Sí, borrar todo"), sin dependencia nueva ni `window.confirm` nativo (no encaja con el estándar visual editorial) |
| 4 | Rutas `/api/*` sin auth | Passcode simple: `middleware.ts` + cookie firmada, variable `MUSCULIT_PASSCODE` en `.env.local`. Confirmado por Tín |
| 5 | Sin manifest ni iconos propios, `public/` con SVGs default de Next.js | `app/manifest.ts` + `app/icon.tsx` + `app/apple-icon.tsx` generados con `next/og` (sin depender de un editor de imágenes externo), paleta ember/brass |
| 6 | XP de -75 por sesión con <25% de progreso | Cambiar a 0 — no tiene sentido penalizar el registro parcial cuando el objetivo es que Tín anote aunque sea poco |
| 7 | Botones toggle sin `aria-pressed`/`aria-current` | Agregar a hábitos, checkbox de ejercicio, toggle de cardio, tabs de nav |
| 8 | Timer de descanso fijo a 2:00 | Chips de preset (90s / 120s / 180s) en vez de un solo valor fijo |
| 9 | `musculit-app.tsx` en 1640 líneas, todo en un solo client component | Partir en `src/components/musculit/` por tab (`today-tab.tsx`, `history-tab.tsx`, `profile-tab.tsx`, `coach-tab.tsx`, `week-override-panel.tsx`) + un archivo raíz que orquesta estado/efectos |
| 10 | Cero tests | Agregar `vitest` (sin dependencias pesadas) y cubrir las funciones puras más delicadas de `musculit-state.ts`: `computeWeekReflow`, `isAbsFinisherDay` (vía `getTrainingDayFromDate`), streaks, XP, `getHabitPeriodKey` |

### Orden de ejecución

1. Split de `musculit-app.tsx` en componentes por tab (base para todo lo demás)
2. Confirmación en "Reiniciar datos"
3. `aria-pressed`/`aria-current`
4. Presets de timer de descanso
5. Fix XP negativo
6. `weightUnit` por sesión (toca `musculit-state.ts`, schema, `app-state-store.ts`, UI de Historial)
7. Guardado incremental en DB (upsert por sesión)
8. Passcode gate
9. Manifest + iconos PWA
10. Tests con vitest

Cada bloque se verifica con `tsc --noEmit` y, donde aplica, Playwright en navegador antes de pasar al siguiente.

### Estado — listo (2026-07-15)

Los 10 puntos se implementaron y verificaron en orden. Notas relevantes que no estaban previstas en el plan original:

- **Next.js 16 renombró `middleware.ts` a `proxy.ts`** (con `export function proxy` en vez de `export function middleware`) — el dev server lo marcó como deprecado apenas se creó, así que el passcode gate vive en `src/proxy.ts`, no `middleware.ts`. Confirmado contra `node_modules/next/dist/docs` del propio proyecto.
- El guardado incremental (#7) originalmente se planeó como upsert por sesión; en la implementación real se resolvió con un hash de contenido (`contentHash`, columna nueva en `WorkoutSession`) que compara contra lo ya guardado y solo reescribe la sesión que cambió — evita tanto el borrado total como recorrer con upserts el historial completo en cada autosave.
- `buildDeltaLabel` en Progreso de cargas tenía un bug preexistente no listado originalmente: el label de "+X lb promedio" estaba hardcodeado a "lb" sin importar la unidad real, y comparaba pesos de distinta unidad como si fueran la misma. Se corrigió de paso junto con el trabajo de `weightUnit` por sesión, ya que compartía la misma causa raíz.
- Se eliminaron los SVGs default de Next.js (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) y el `favicon.ico` genérico de `public/` y `src/app/` — no se usaban en ningún lado (confirmado con grep) y los reemplaza `icon.tsx`/`apple-icon.tsx`.
- Se agregaron `vitest` y `playwright` como devDependencies (no estaban declaradas antes, aunque Playwright ya se usaba de facto en sesiones previas). `npm run test` corre los 16 tests de `musculit-state.ts`.
- Verificado end-to-end con Playwright contra el dev server real: toggle de ejercicio (`aria-pressed` + glyph), presets de timer, unidad lb/kg, tabs Historial/Coach, doble-tap de "Reiniciar datos", y el flujo completo del passcode gate (redirect a `/candado`, 401 en `/api/*` sin cookie, error con passcode incorrecto, desbloqueo y cookie con el correcto). Sin errores de consola. `tsc --noEmit`, `eslint` y `npm run build` limpios.
- La base de datos real (Supabase) seguía vacía (`sessions: []`) antes y después de las pruebas — no hizo falta limpiar datos de prueba.
- **Pendiente de Tín:** definir `MUSCULIT_PASSCODE` en `.env.local` (no se inventó un valor) y en las variables de entorno de Vercel para que el candado quede activo en producción. Sin esa variable, el candado queda desactivado (comportamiento intencional para no romper el dev local).

---

## Plan de Implementación — Migración Perfect Split / InBody / Nutrición 2026-08-18

Rol: **Solo Claude Code** (confirmado por Tín — pregunta obligatoria respondida al inicio de esta sesión).

### Origen

Tín trajo 5 archivos generados en otra conversación con Claude, en `C:\Users\mbund\Downloads\update gym tin\`:

- `MUSCULITO_UPDATE_SPEC.md` — fuente de verdad de la data nueva (perfil, InBody, rutina, nutrición, requisitos de UI, checklist de migración).
- `Panel_Musculito_Martin_Bundy.html` — spec ejecutable, un solo archivo, implementa el mapa segmentario y el constructor de menú funcionando.
- `Rutina_PerfectSplit_Martin_Bundy.pdf` y `Plan_Alimentacion_Calibrado_Martin_Bundy.pdf` — versión imprimible de rutina y nutrición.

Los tres se leyeron completos. La rutina y el HTML coinciden en todo. Había una discrepancia entre el PDF de nutrición (proteína 150g / grasas 85g / carbos ~445g) y el spec.md + HTML (155g / 90g / 425g) — **Tín confirmó usar lo del spec+HTML sin darle más vueltas al PDF de la nutricionista**, así que la sección Cocina se construye con 155/90/425 y el resto de la data de `MUSCULITO_UPDATE_SPEC.md` sección 4.

### Qué cambia respecto a lo que hay hoy

| Área | Hoy en el código | Pasa a ser |
|---|---|---|
| Split semanal | Pull (mar) / Piernas (mié) / Descanso (jue) / Cardio (vie) / Push (sáb) / Piernas (dom) — Lun y Jue descanso | Full upper (mar) / Piernas 1 (mié) / Espalda+bíceps (jue) / Cardio (vie) / Pecho+hombro+tríceps (sáb) / Piernas 2 (dom) — **solo lunes descanso** |
| Compañera | "Cata" (`routine-data.ts`, comentarios de `musculit-state.ts`, `week-override-panel.tsx`) | "Angie" |
| Finisher de core | Sistema dinámico (`isAbsFinisherDay`, hasta 2 días/semana entre Lun-Jue, se recalcula solo) | Fijo: Crunch en máquina + Leg raises dentro de la rutina del Jueves, como cualquier otro ejercicio |
| Ejercicios | Ver lista de eliminados en la sección 0 del spec (Romanian deadlift, Bulgarian split squat, Barbell cable rows, Cable crunch, Abductor machine, etc.) | Reemplazados uno a uno por los del Perfect Split |
| Secciones de la app | Hoy / Historial / Perfil / Coach (4 tabs) | + **Cuerpo** (InBody) y **Cocina** (nutrición) — 6 tabs, decisión ya confirmada con Tín |
| InBody | No existe | Trackeable: tabla nueva en Postgres, se siembra con la lectura del 10/08/2026, preparada para futuras mediciones |
| Nutrición | No existe (solo tips genéricos de déficit en `habits-data.ts`, que ahora **contradicen** el objetivo de superávit — hay que corregirlos) | Constructor de menú persistido por día (tabla nueva) |

### Decisiones ya tomadas con Tín

1. **Rol:** Solo Claude Code.
2. **Navegación:** se agregan 2 tabs nuevos (Cuerpo, Cocina) a los 4 que ya funcionan. No se toca la estructura de Hoy/Historial/Perfil/Coach.
3. **InBody:** trackeable desde ya — tabla nueva en Postgres, no un valor hardcodeado. Pensado para cargar mediciones futuras y mostrar evolución.
4. **Nutrición:** el constructor de menú persiste la elección del día (tabla nueva), igual que ya se hace con las sesiones de gym — no es una herramienta que se resetea al recargar.

### Decisiones que quedan a mi criterio salvo que Tín las corrija al aprobar este plan

- **Se retira `computeWeekReflow`** (el ciclado automático de secuencia Pull→Piernas→Cardio→Push→Piernas sobre días disponibles). Con el split nuevo cada día de la semana tiene un tipo de sesión distinto y con un orden pensado a propósito (miércoles piernas metido a propósito entre los dos días de espalda para dar 48h de recuperación) — ciclar automáticamente rompería esa lógica. Se mantiene `dayOverrides` como mecanismo simple de "marcar un día puntual como descanso", pero sin el reacomodo automático de secuencia. El panel de "Semana irregular" en Perfil se simplifica en consecuencia.
- **El finisher de abdomen queda fijo al Jueves** (dentro de Espalda+bíceps), tal como está en el spec y el HTML. El spec menciona "+ el día que el usuario decida" pero no define ese segundo día — se deja para un pedido futuro en vez de inventar una regla nueva no confirmada.
- Los insights de InBody ("el 91% de tu grasa está en el tronco", etc.) se **calculan desde los números reales** de cada lectura en vez de guardarse como texto fijo — así siguen siendo ciertos cuando se cargue una medición nueva.
- Los ejercicios que se mantienen sin cambios (Lat pulldown, Preacher curl, Machine incline chest press, Cable lateral raises, etc.) conservan su `cue`/`setup`/`feel`/`alternative` ya escritos. Los que son nuevos (Squats en Smith, Pull-up, Seated row, Hiperextensión lumbar, Peso muerto barra libre, Femoral acostado, Abductores abiertos y cerrados, Crunch en máquina abdominal, Lunges con mancuerna) se escriben desde cero, mismo estándar de calidad que los existentes.
- Cero dependencias nuevas — mismo criterio que el resto del proyecto. El mapa segmentario se hace con SVG + React (como en el HTML de referencia), el constructor de menú con estado de React normal.
- La paleta del spec (`--lean`/`--fat`/etc.) **no se trae en paralelo** — se adapta a los tokens ya existentes del proyecto (`--ember`, `--status-good`, `--ink-strong`...) para no partir la identidad visual en dos sistemas de color.

### Riesgo detectado: trabajo pendiente sin commitear

`git status` muestra que **todo el bloque de "Pulido y hardening 2026-07-15"** (split de componentes, passcode gate, guardado incremental, manifest/iconos, tests) sigue sin commitear desde hace más de un mes, aunque ya está verificado y funcionando (`tsc`, `vitest`, `eslint`, `build` limpios ahora mismo). Antes de empezar la migración se recomienda un commit de ese trabajo por separado, para no mezclar un diff de refactor+hardening con el de la migración de rutina/InBody/nutrición en un solo commit gigante difícil de revisar o revertir.

### Bloques de ejecución

**Bloque 0 — Housekeeping**
- Commit del trabajo pendiente de hardening (aparte, antes de tocar nada nuevo).
- Copiar los 5 archivos de referencia a `docs/actualizacion-2026-08/` dentro del repo, mismo patrón que ya usa el proyecto para documentos fuente de verdad (`ROUTINE.md`, etc.), para que queden versionados y no dependan de la carpeta Downloads.

**Bloque 1 — Rutina (fuente de verdad primero)**
- Reescribir `ROUTINE.md` completo con el Perfect Split, reglas nuevas (fallo en piernas, lunes fijo, Angie).
- Reescribir `routine-data.ts`: los 7 días (`weeklySplit`), ejercicios nuevos con `cue`/`setup`/`feel`/`alternative`, se retira `coreFinisherExercises`.
- Simplificar `musculit-state.ts`: quitar `isAbsFinisherDay` y el uso de `coreFinisherExercises`; `getTrainingDayFromDate` vuelve a ser un lookup directo. Se retira `computeWeekReflow` (ver decisión arriba).
- Reescribir `musculit-state.test.ts` con fixtures del split nuevo.
- Verificar: `tsc --noEmit`, `vitest run`.

**Bloque 2 — Angie / limpieza de nombre**
- Grep final de "Cata" en todo `/src` tras el Bloque 1 (ya cubre `routine-data.ts` y los comentarios de `musculit-state.ts`; falta revisar `week-override-panel.tsx` y strings de UI) — cero resultados antes de cerrar el bloque, tal como pide el checklist del spec.

**Bloque 3 — Esquema de datos (InBody + Nutrición)**
- `prisma/schema.prisma`: modelo `InBodyReading` (todas las métricas de la sección 2 del spec + análisis segmentario + control de peso) y modelo `NutritionLog` (`userId` + `date` único, elección de comida por tiempo, extras activados — mismo patrón sparse/JSON que `dayOverrides`).
- `npx prisma db push` contra Supabase.
- `app-state-store.ts` y `AppState`: cargar/guardar `inBodyReadings` y `nutritionLogs`, con el mismo fallback a archivo local que ya existe. Sembrar la lectura real del 10/08/2026 como primer registro.
- Verificar con Playwright que la lectura sembrada carga bien.

**Bloque 4 — Tab Cuerpo**
- `src/lib/inbody-data.ts`: tipos, rangos de referencia, fórmula de intensidad de color, generación de insights desde los números reales.
- `src/components/musculit/body-tab.tsx`: mapa segmentario SVG con toggle masa magra/grasa, grid de indicadores con barras de rango, sección de lectura.
- Integrar a la nav (6 tabs).
- Verificar contraste WCAG AA con la paleta del proyecto y ausencia de solapamiento a 375px con Playwright.

**Bloque 5 — Tab Cocina**
- `src/lib/nutrition-data.ts`: comidas, opciones, macros, extras, metas (con los números del spec+HTML: 155/90/425).
- `src/components/musculit/kitchen-tab.tsx`: selector por tiempo de comida con botón "Cambiar" y contador X/N, chips de extras, barra de totales sticky con progreso en vivo — persistido contra `NutritionLog`.
- Corregir `habits-data.ts`: el tip de "déficit calórico moderado" contradice el superávit nuevo — se reemplaza por contenido coherente con la sección 4.3 del spec.
- Verificar con Playwright: elegir opciones, totales correctos, recarga y confirma que persiste.

**Bloque 6 — Coach (Groq) con contexto ampliado**
- `src/app/api/coach/route.ts`: sumar al contexto la última lectura de InBody y las metas nutricionales del día.
- Verificar que el resumen/análisis sigue respondiendo sin errores.

**Bloque 7 — PDF, limpieza final y cierre**
- Verificar que `/rutina` refleja el Perfect Split y "Angie" automáticamente (lee de `weeklySplit`); ajustar layout si hace falta por el mayor número de ejercicios en Martes.
- Grep repo-wide final de los ejercicios eliminados (checklist del spec, sección 0) — cero resultados.
- Actualizar `README.md` (tabla de split semanal) y este archivo con el estado final.
- `tsc --noEmit`, `eslint`, `npm run build`, `vitest run` limpios. Playwright end-to-end de las 6 pantallas.

### Estado

Plan escrito, pendiente de aprobación explícita de Tín antes de tocar código.
