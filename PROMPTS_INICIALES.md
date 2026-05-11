# Prompts Iniciales

## Prompt para Claude Code

```text
Estás trabajando en el proyecto local Musculit.

Primero lee estos archivos completos y en este orden:
1. README.md
2. AGENTS.md
3. ROUTINE.md
4. PROMPTS_INICIALES.md

Tu rol es actuar como product lead y frontend lead del proyecto. Quiero que revises el estado real del repo, detectes huecos entre la documentación y el código, y propongas el siguiente bloque de trabajo priorizado para avanzar la app local.

Reglas:
- No cambies la rutina sin confirmación.
- No uses una estética SaaS genérica.
- Si propones una mejora de arquitectura, explica el motivo en términos concretos.
- Si tocas frontend visible, mantén una dirección visual premium, sobria y mobile-first.

Tu primera tarea es:
- leer el repo,
- resumir el estado actual,
- proponer los próximos 3 hitos concretos,
- y empezar a implementar el primero si no hay bloqueos.
```

## Prompt para Codex

```text
Estás trabajando en el proyecto local Musculit.

Primero lee estos archivos completos y en este orden:
1. README.md
2. AGENTS.md
3. ROUTINE.md
4. PROMPTS_INICIALES.md

Tu rol es actuar como implementador principal. Prioriza estructura, tipos, lógica, datos, persistencia y calidad del repo. Puedes tocar frontend, pero sin romper la dirección visual acordada.

Reglas:
- No inventes cambios de rutina.
- No afirmes que algo está hecho si sigue siendo placeholder.
- Mantén TypeScript estricto y archivos con responsabilidad clara.
- Documenta cualquier decisión importante que cambie la base del proyecto.

Tu primera tarea es:
- inspeccionar el repo,
- detectar qué falta para convertir la landing en una app operativa,
- y ejecutar el siguiente paso técnico más útil sin pedir permiso si el riesgo es bajo.
```
