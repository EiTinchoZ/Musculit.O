# Prompt para Claude Code

> Copiar desde la línea divisoria hacia abajo y pegarlo en Claude Code, con los archivos de referencia ya colocados en el repo (sugerencia: carpeta `/docs/actualizacion-2026-08/`).

---

Voy a actualizar Musculit.O, mi plataforma de entrenamiento. La rutina, los datos de composición corporal y el plan nutricional cambiaron por completo y necesito migrar el proyecto a la versión vigente.

**Archivos de referencia** (en `docs/actualizacion-2026-08/`):

- `MUSCULITO_UPDATE_SPEC.md` — la especificación completa. Es la fuente de verdad para toda la data.
- `Panel_Musculito_Martin_Bundy.html` — implementación de referencia funcional, en un solo archivo sin build. Sirve como spec ejecutable: si hay duda sobre cómo debe verse o comportarse algo, ábrelo.
- Los PDFs de rutina, plan alimentario y los dos reportes de InBody, como respaldo.

**Antes de escribir código, quiero que hagas esto:**

1. Lee `MUSCULITO_UPDATE_SPEC.md` completo.
2. Abre el HTML de referencia y estudia cómo está resuelto el mapa segmentario y el constructor de menú.
3. Explora el proyecto actual: stack, estructura de carpetas, dónde vive la data de la rutina, cómo se renderiza, si hay backend o base de datos involucrada, y si existe una vista de impresión.
4. Escribe un `agents.md` en la raíz que documente: el análisis del proyecto actual, qué encontraste, las tecnologías involucradas, el plan de migración por pasos con estimaciones, los riesgos que veas y las decisiones que haya que tomar.
5. Preséntame el plan y **espera mi aprobación** antes de tocar nada.

**Contexto que me importa que tengas presente:**

La versión anterior de la plataforma tenía dos problemas que no quiero repetir: texto que se solapaba en móvil, y combinaciones de color donde el texto se confundía con el fondo. La sección 5 del spec tiene la paleta ya verificada contra WCAG AA y las reglas de layout. Respétalas.

La data anterior tiene ejercicios que ya no hago y una persona que aparece con el nombre equivocado. La sección 0 del spec lista exactamente qué eliminar y qué reemplazar. Quiero que hagas una búsqueda exhaustiva por todo el repo, no solo en el archivo obvio de la rutina — pueden estar en tests, en seeds, en un CMS, en la vista de impresión.

Si el proyecto tiene backend o base de datos, necesito saber si la migración requiere cambios de esquema antes de empezar.

Mantén `agents.md` actualizado durante toda la sesión con las decisiones que tomemos y lo que vayas implementando.

**Preferencias de trabajo:** sin emojis. Respuestas directas y objetivas. Código limpio y documentado. Si algo en el spec no te cuadra o ves un problema con lo que te pido, dímelo antes de implementarlo.
