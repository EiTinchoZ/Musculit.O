# Musculit.O — Especificación de actualización

> Documento fuente único para migrar el proyecto existente (`musculit-o.vercel.app`) a la rutina, composición corporal y plan nutricional vigentes.
> **Fecha de corte:** 18/08/2026
> **Reemplaza:** toda la data de rutina anterior (split Pull/Piernas/Push con Cata) y cualquier plan nutricional previo.

---

## 0. Resumen de cambios respecto a la versión anterior

| Área | Antes | Ahora |
|---|---|---|
| Split | Pull (mar) / Piernas (mié) / Push (sáb) / Piernas (dom) — 4 sesiones | Perfect Split — 5 sesiones de pesas + 1 de cardio |
| Frecuencia por grupo | Piernas 2x, pecho 1x, espalda 1x | Todos los grupos 2x |
| Días de descanso | Lunes y jueves | Solo lunes |
| Días con pareja | Vie / Sáb / Dom | Vie / Sáb / Dom (sin cambio) |
| Nombre pareja | "Cata" en la data anterior | **Angie** |
| InBody | No existía en la plataforma | Sección nueva completa |
| Nutrición | No existía | Sección nueva con menú interactivo |

### Ejercicios eliminados (NO deben aparecer en ninguna parte)

Estos estaban en la rutina anterior y el usuario **no los hace**. Buscar y eliminar todas las referencias:

- `Barbell cable rows` → reemplazado por **Seated row**
- `Upright single arm rows` → reemplazado por **Hiperextensión lumbar**
- `Dumbbell shrugs` → reemplazado por **Pull down brazos rectos**
- `Cable crunch` → reemplazado por **Crunch en máquina abdominal**
- `Reverse machine flyes` → renombrado a **Reverse pec deck** (mismo movimiento, nombre unificado)
- `Peso muerto discos en talones` → eliminado (sin reemplazo)
- `Smith machine squats` (en el día 2 de piernas) → eliminado de ese día
- `Bulgarian split squat` → eliminado
- `Romanian deadlift` → eliminado
- `Leg curl (biserie con calf raises)` → eliminado como biserie
- `Abductor machine` → reemplazado por **Abductores abiertos y cerrados** (alternando)

---

## 1. Perfil

```json
{
  "nombre": "Martín Alejandro Bundy Muñoz",
  "alias": "Tín",
  "edad": 26,
  "alturaCm": 174,
  "pesoKg": 69.2,
  "sexo": "masculino",
  "gimnasio": "Smart Fit Panamá",
  "pareja": "Angie",
  "objetivo": "Recomposición corporal: bajar grasa concentrada en tronco, ganar masa magra, subir de peso sin perder definición"
}
```

---

## 2. InBody / Bioimpedancia

**Fecha del examen:** 10/08/2026

### 2.1 Métricas principales

```json
{
  "fecha": "2026-08-10",
  "metricas": [
    { "id": "peso",            "label": "Peso real",                  "valor": 69.2,    "unidad": "kg",     "estado": "normal", "rango": { "min": 37.2, "normalMin": 56.3, "normalMax": 75.4, "max": 132.6 } },
    { "id": "imc",             "label": "Índice de masa corporal",    "valor": 22.86,   "unidad": "kg/m²",  "estado": "normal", "rango": { "min": 13, "normalMin": 18.6, "normalMax": 24.9, "max": 33 } },
    { "id": "grasaCorporal",   "label": "Grasa corporal",             "valor": 12.88,   "unidad": "%",      "estado": "ideal",  "rango": { "min": 5, "normalMin": 8, "normalMax": 19, "max": 25 } },
    { "id": "masaGrasa",       "label": "Masa de grasa",              "valor": 8.9,     "unidad": "kg",     "estado": "normal", "rango": { "min": -2.0, "normalMin": 5.3, "normalMax": 12.7, "max": 34.7 } },
    { "id": "masaMagra",       "label": "Masa libre de grasa",        "valor": 56.34,   "unidad": "kg",     "estado": "normal-bajo", "rango": { "min": 37, "normalMin": 54.0, "normalMax": 61.3, "max": 80 } },
    { "id": "masaMuscular",    "label": "Masa muscular esquelética",  "valor": 34.7,    "unidad": "kg",     "estado": "normal", "rango": null },
    { "id": "aguaCorporal",    "label": "Agua corporal",              "valor": 41.24,   "unidad": "L",      "estado": "normal", "rango": { "min": 24, "normalMin": 34.6, "normalMax": 45.0, "max": 59 } },
    { "id": "grasaVisceral",   "label": "Grasa visceral",             "valor": 4,       "unidad": "",       "estado": "ideal",  "rango": { "min": 1, "normalMin": 1, "normalMax": 9, "max": 12 } },
    { "id": "tmb",             "label": "Tasa metabólica basal",      "valor": 1711.22, "unidad": "kcal",   "estado": "normal", "rango": null },
    { "id": "indiceApendicular","label": "Índice apendicular",        "valor": 9.18,    "unidad": "kg/m²",  "estado": "normal", "rango": null }
  ]
}
```

### 2.2 Control de peso (valores que da la máquina)

```json
{
  "pesoIdeal": 65.85,
  "controlPeso": -3.35,
  "controlGrasa": 0.08,
  "controlMasaMagra": 1.27
}
```

> **Nota importante para la UI:** el `controlPeso` de −3.35 kg **no debe presentarse como recomendación**. Ese número sale solo de la altura y no distingue músculo de grasa. Mostrarlo acompañado de la aclaración de que el control de grasa real es de apenas +0.08 kg y el de masa magra sugiere ganar +1.27 kg.

### 2.3 Análisis segmentario

```json
{
  "masaMagra": {
    "brazoDerecho": 3.53,
    "brazoIzquierdo": 3.54,
    "tronco": 28.55,
    "piernaDerecha": 10.48,
    "piernaIzquierda": 10.23,
    "unidad": "kg"
  },
  "grasa": {
    "brazoDerecho": 0.30,
    "brazoIzquierdo": 0.28,
    "tronco": 8.09,
    "piernaDerecha": 0.10,
    "piernaIzquierda": 0.14,
    "unidad": "kg"
  }
}
```

### 2.4 Impedancia (dato crudo, opcional)

| Frecuencia | BD | BE | TR | PD | PE |
|---|---|---|---|---|---|
| 5 kHz | 357 | 355 | 26 | 281 | 288 |
| 50 kHz | 312 | 309 | 22 | 240 | 247 |
| 250 kHz | 288 | 286 | 19 | 212 | 219 |

### 2.5 Lecturas / insights a mostrar

Textos que deben acompañar los datos:

1. **El 91% de la grasa está en el tronco.** De 8.9 kg de grasa total, 8.09 kg están ahí. Brazos y piernas prácticamente no tienen (0.3 kg y 0.1 kg). Esto explica la sensación de barriga pese a tener 12.9% de grasa corporal.
2. **Simetría perfecta.** Diferencia de 0.25 kg entre piernas y 0.01 kg entre brazos en masa magra. No hay desbalances que corregir.
3. **No necesita bajar de peso.** Grasa corporal y visceral ya en rango ideal. El margen de mejora está en masa magra, que apenas entró al rango normal (56.34 sobre un mínimo de 54.0).
4. **Estrategia correcta:** superávit calórico leve + proteína alta + entrenamiento. El músculo nuevo hace que la grasa del tronco se note menos.

---

## 3. Rutina — Perfect Split

### 3.1 Reglas generales

```json
{
  "descansoEntreSets": "2 minutos",
  "intensidad": "Cerca del fallo, sin romper técnica",
  "rangoDominante": "8-10 reps",
  "excepcionFallo": "Los dos días de piernas van con TODAS las series al fallo",
  "diaDescanso": "Lunes fijo",
  "objetivo": "Cada grupo muscular 2 veces por semana"
}
```

### 3.2 Estructura semanal

| Día | Sesión | Con Angie | Duración |
|---|---|---|---|
| Lunes | Descanso | — | — |
| Martes | Full upper | No | 75–85 min |
| Miércoles | Piernas 1 | No | 60–75 min |
| Jueves | Espalda + bíceps | No | 55–70 min |
| Viernes | Cardio | **Sí** | 20–30 min |
| Sábado | Pecho + hombro + tríceps | **Sí** | 55–70 min |
| Domingo | Piernas 2 | **Sí** | 60–75 min |

**Verificación de frecuencia:**
- Pecho: martes + sábado
- Espalda: martes (ligero) + jueves (pesado)
- Hombro: martes + sábado
- Tríceps: martes + sábado
- Bíceps: martes + jueves
- Piernas: miércoles + domingo
- Abdomen: jueves (+ el día que el usuario decida)

**Lógica del orden:** el día de piernas (miércoles) se coloca deliberadamente entre las dos sesiones de espalda para dar 48 h de recuperación en vez de 24 h.

### 3.3 MARTES — Full upper

`75–85 min · 11 ejercicios · 34 series`

| # | Ejercicio | Grupo | Series |
|---|---|---|---|
| 1 | Machine incline chest press | Pecho superior | 3 × 8-10 |
| 2 | Dumbbell flat chest press | Pecho | 3 × 8-10 |
| 3 | Machine chest flyes / Pecdec | Pecho | 2 × 10 |
| 4 | Dumbbell shoulder press | Hombro frontal | 3 × 8 |
| 5 | Cable lateral raises | Hombro lateral | 3 × 10 por brazo |
| 6 | Cable overhead tricep extension | Tríceps | 3 × 8 |
| 7 | Katana tricep extension | Tríceps | 2 × 8 |
| 8 | Lat pulldown | Espalda | 3 × 8 |
| 9 | Reverse pec deck | Deltoide posterior / Espalda alta | 2 × 10 |
| 10 | Dumbbell incline curl | Bíceps | 3 × 8 |
| 11 | Preacher curl | Bíceps | 2 × 8 |
| — | **Escaladora** | Cardio | **15 min** |

**Nota de la sesión:** push va completo porque su otra sesión es el sábado. Espalda y bíceps van ligeros porque tienen su día dedicado el jueves. Sin abdominales aquí. Pecho primero a propósito: es donde se busca el cambio visual y merece energía fresca.

### 3.4 MIÉRCOLES — Piernas 1

`60–75 min · énfasis cuádriceps · todas las series al fallo`

| # | Ejercicio | Grupo | Series |
|---|---|---|---|
| 1 | Squats en Smith | Cuádriceps / Glúteo | 3 al fallo |
| 2 | Leg extension | Cuádriceps | 3 al fallo |
| 3 | Lunges con mancuerna | Cuádriceps / Glúteo | 3 × pierna al fallo |
| 4 | Leg press | Cuádriceps / Glúteo | 3 al fallo |
| 5 | Hip thrust | Glúteo | 3 al fallo — **última con peso descendente** |
| 6 | Elevación de pantorrillas | Pantorrilla | 3 al fallo |
| — | **Escaladora** | Cardio | **20 min** |

### 3.5 JUEVES — Espalda + bíceps

`55–70 min · trabajo pesado · 48 h después del martes`

| # | Ejercicio | Grupo | Series |
|---|---|---|---|
| 1 | Pull-up / assisted pull-up | Espalda | 3 × 8 |
| 2 | Seated row | Espalda media | 3 × 8 |
| 3 | Lat pulldown | Espalda | 3 × 8-10 |
| 4 | Pull down brazos rectos | Espalda / Dorsal | 2 × 8 |
| 5 | Hiperextensión lumbar | Lumbar / Erectores | 2 × 10 |
| 6 | Reverse pec deck | Deltoide posterior / Espalda alta | 2 × 10 |
| 7 | Preacher curl | Bíceps | 3 × 8 |
| 8 | Dumbbell hammer curl | Bíceps / Braquial | 2 × 8 |
| 9 | Crunch en máquina abdominal | Abdomen | 3 × 10-15 al fallo |
| 10 | Leg raises | Abdomen inferior | 3 × 10-15 al fallo |

### 3.6 VIERNES — Cardio (con Angie)

`20–30 min · sin pesas`

Escaladora, o caminadora inclinada al 10–12% a 5–6 km/h.

### 3.7 SÁBADO — Pecho + hombro + tríceps (con Angie)

`55–70 min · 8 ejercicios`

| # | Ejercicio | Grupo | Series |
|---|---|---|---|
| 1 | Machine incline chest press | Pecho superior | 3 × 8-10 |
| 2 | Machine chest flyes / Pecdec | Pecho | 3 × 8-10 |
| 3 | Dumbbell flat chest press | Pecho | 3 × 8-10 |
| 4 | Dumbbell shoulder press | Hombro frontal | 3 × 8 |
| 5 | Cable lateral raises | Hombro lateral | 3 × 10 por brazo |
| 6 | Elevaciones frontales | Hombro frontal | 3 × 10 |
| 7 | Cable overhead tricep extension | Tríceps | 3 × 8 |
| 8 | Katana tricep extension | Tríceps | 2 × 8 |

### 3.8 DOMINGO — Piernas 2 (con Angie)

`60–75 min · énfasis femoral y glúteo · todas las series al fallo`

| # | Ejercicio | Grupo | Series |
|---|---|---|---|
| 1 | Peso muerto barra libre | Femoral / Glúteo | 3 al fallo |
| 2 | Femoral acostado | Femoral | 3 al fallo |
| 3 | Leg press | Cuádriceps / Glúteo | 3 al fallo |
| 4 | Hip thrust | Glúteo | 3 al fallo — **última drop set** |
| 5 | Abductores abiertos y cerrados | Abductores / Glúteo medio | 3 sets alternando al fallo |
| — | **Escaladora** | Cardio | **20 min** |

### 3.9 Cardio — resumen

| Día | Máquina | Duración | Intensidad |
|---|---|---|---|
| Martes | Escaladora | 15 min | 60–70 escalones/min (nivel 5–7) |
| Miércoles | Escaladora | 20 min | 60–70 escalones/min |
| Viernes | Escaladora o caminadora inclinada | 20–30 min | Inclinación 10–12% a 5–6 km/h |
| Domingo | Escaladora | 20 min | 60–70 escalones/min |

**Total semanal:** ~75–85 min.

**Aviso a mostrar en la UI:** el cardio mantiene condición cardiovascular mientras se gana masa, no quema grasa de forma agresiva — eso lo controla la alimentación. Si roba energía para las pesas, bajarlo antes que subirlo.

### 3.10 Aviso sobre el trabajo al fallo

Debe aparecer visible en la sección de piernas:

> Los dos días de piernas van con todas las series al fallo, tal como fueron definidos. Es mucha carga acumulada. Si el rendimiento baja semana a semana, cuesta arrancar, o las agujetas no se van — bajar el fallo a solo la última serie de cada ejercicio durante una semana. No es retroceder: es dejar que el músculo se repare para poder crecer.

---

## 4. Plan nutricional

### 4.1 Cálculo y objetivos

```json
{
  "tmb": 1711,
  "factorActividad": 1.7,
  "mantenimiento": 2910,
  "superavit": 250,
  "metaCalorica": 3150,
  "proteinaG": 155,
  "grasasG": 90,
  "carbohidratosG": 425,
  "aguaLitros": 2.8,
  "formulaAgua": "peso × 40 ml"
}
```

**Justificación del superávit leve (mostrar en UI):** grasa visceral (4) y grasa corporal (12.9%) ya en rango ideal, y el 91% de la grasa se acumula en el tronco. Un superávit agresivo mandaría ese exceso justo ahí.

### 4.2 Comidas y opciones

Estructura de datos sugerida: cada tiempo de comida tiene N opciones rotables. Macros en orden `[kcal, proteína, grasa, carbohidratos]`.

```json
{
  "comidas": [
    {
      "id": "desayuno",
      "nombre": "Desayuno",
      "opciones": [
        { "items": ["3 huevos revueltos con espinaca y tomate", "2 tostadas de pan integral", "1 banano pequeño"], "macros": [460, 27, 17, 47] },
        { "items": ["2-3 huevos revueltos con tomate, espinaca y hongos", "1 tortilla de maíz amarillo asada"], "macros": [390, 24, 21, 25] },
        { "items": ["Omelet de 2 huevos con jamón de pavo y vegetales", "2 tostadas de pan integral"], "macros": [440, 28, 19, 35] },
        { "items": ["½ taza de avena con leche de almendras, chía y 4 almendras", "3 huevos cocidos", "Blueberries"], "macros": [530, 31, 23, 48] },
        { "items": ["1 arepa rellena de huevo revuelto con hongos", "Rebanadas de tomate y aguacate"], "macros": [470, 20, 24, 42] }
      ]
    },
    {
      "id": "merienda-manana",
      "nombre": "Merienda de la mañana",
      "opciones": [
        { "items": ["1 yogur griego", "10 almendras"], "macros": [250, 20, 12, 14] },
        { "items": ["Batido de fruta con 250 ml de leche de proteína", "1 cdita de chía"], "macros": [320, 25, 8, 38] },
        { "items": ["2 galletas de arroz con mantequilla de maní", "Jalea sin azúcar"], "macros": [280, 8, 14, 32] },
        { "items": ["1 manzana verde con mantequilla de maní pura"], "macros": [290, 7, 16, 30] },
        { "items": ["1 tortilla de trigo con jamón de pavo y aguacate"], "macros": [330, 16, 17, 28] }
      ]
    },
    {
      "id": "almuerzo",
      "nombre": "Almuerzo",
      "opciones": [
        { "items": ["1½ taza de arroz", "250 g de pechuga de pollo a la plancha", "Ensalada verde con ½ aguacate", "½ taza de frijoles"], "macros": [845, 73, 20, 94] },
        { "items": ["1 taza de arroz o quinoa", "¼ de plátano maduro hervido", "Filete de salmón a la plancha", "Pico de gallo con aguacate y lechuga", "½ chayote hervido"], "macros": [880, 60, 32, 85] },
        { "items": ["2 tortillas de trigo", "200 g de fajitas de res con cebolla y chile dulce", "Ensalada de repollo con tomate, culantro y limón", "Coliflor hervida"], "macros": [780, 58, 28, 70] },
        { "items": ["1 taza de puré de papa", "200 g de filete de pescado a la plancha", "Ensalada verde con limón", "½ taza de brócoli al vapor"], "macros": [700, 55, 18, 72] },
        { "items": ["2 trozos de yuca hervida", "¼ de plátano maduro", "200 g de pollo en salsa de tomate natural", "Ensalada de espinacas con pepino y fresas"], "macros": [850, 58, 16, 110] }
      ]
    },
    {
      "id": "post-entreno",
      "nombre": "Post-entreno",
      "opciones": [
        { "items": ["Batido: 1 scoop de proteína + 1 banano + leche descremada"], "macros": [300, 33, 2, 38] },
        { "items": ["1 taza de yogur griego con fruta picada y chía"], "macros": [260, 24, 6, 28] },
        { "items": ["2 huevos duros con aguacate majado y mostaza", "1 galleta de arroz"], "macros": [290, 16, 18, 16] },
        { "items": ["1 leche de proteína", "1 galleta de arroz con queso cottage y arándanos"], "macros": [280, 28, 6, 28] }
      ]
    },
    {
      "id": "cena",
      "nombre": "Cena",
      "opciones": [
        { "items": ["200 g de carne molida magra con salsa de tomate natural", "3 tortillas de maíz", "2 tazas de ensalada verde con aceite de oliva y limón"], "macros": [680, 51, 33, 48] },
        { "items": ["Quesadillas de pollo mechado en tortilla integral", "Ensalada encima", "2 huevos cocidos"], "macros": [720, 48, 34, 52] },
        { "items": ["1 lata de atún con huevo cocido, tomate, apio, aguacate y poca mayonesa light", "2 paquetes de salmas"], "macros": [620, 45, 32, 30] },
        { "items": ["2 tazas de pasta con atún en agua, maíz dulce y salsa de tomate", "2 huevos hervidos", "1 taza de ensalada"], "macros": [830, 55, 22, 95] },
        { "items": ["Ensalada grande con 200 g de pollo, aguacate, cottage, garbanzos, maíz y zanahoria", "Aderezo de yogur griego con limón, ajo y culantro"], "macros": [700, 58, 30, 45] }
      ]
    }
  ],
  "extras": [
    { "nombre": "1 taza extra de arroz", "macros": [200, 4, 0, 44] },
    { "nombre": "½ aguacate", "macros": [160, 2, 15, 8] },
    { "nombre": "Puñado de nueces mixtas", "macros": [190, 5, 17, 6] },
    { "nombre": "2 tostadas con mantequilla de maní", "macros": [290, 10, 15, 30] },
    { "nombre": "1 batido de proteína con leche", "macros": [240, 30, 4, 20] },
    { "nombre": "1 taza de avena cocida", "macros": [160, 6, 3, 28] },
    { "nombre": "2 huevos cocidos", "macros": [145, 13, 10, 1] },
    { "nombre": "1 banano + 1 manzana", "macros": [190, 2, 1, 48] }
  ]
}
```

### 4.3 Tips de vegetales

Provenientes de la guía de la nutricionista. Mostrar como tarjetas:

- **Porciona al comprar:** lavar y separar en bolsitas lo de toda la semana el mismo día.
- **Cocina por lote:** un solo día a la semana dejar los vegetales listos.
- **Salteado rápido:** tomate, brócoli, hongos, mostaza china, repollo y cebolla con 1 cda de aceite de oliva. Acompaña cualquier proteína.
- **Aderezos libres de calorías:** vinagre de manzana, aceite de oliva con especias, limón con sal y pimienta, vinagre balsámico.
- **Congelados válidos:** cuando no hay frescos de buena calidad. Enjuagar bien antes de preparar.

### 4.4 Reajuste

Mostrar como nota al pie de la sección:

> Los macros de cada opción son estimados de referencia, no medidas de laboratorio. Reevaluar cada 3–4 semanas: si el peso no sube ni baja y se quiere más ganancia muscular, subir 100–150 kcal. Si el abdomen gana grasa más rápido de lo deseado, bajar el superávit antes de eliminarlo del todo.

---

## 5. Requisitos de UI

### 5.1 Estructura de navegación

Tres secciones principales:

1. **Cuerpo** — datos del InBody
2. **Entreno** — rutina semanal
3. **Cocina** — plan nutricional

### 5.2 Componente firma: mapa segmentario

El elemento más característico. Silueta del cuerpo con:

- Toggle entre **Masa magra** y **Grasa**
- Los cinco segmentos (2 brazos, tronco, 2 piernas) cambian de color según la intensidad del valor relativo al máximo del modo activo
- Los valores numéricos por segmento se muestran en columnas laterales (no encima de la figura)
- Texto de lectura que cambia según el modo: en "masa magra" habla de la simetría; en "grasa" señala que 8.09 de 8.9 kg están en el tronco

Fórmula de intensidad de color usada actualmente:

```js
const t = 0.22 + 0.78 * Math.pow(valor / maxDelModo, 0.55);
// interpolar desde el color base (#1A2C3C) hasta el color del modo
// masa magra: #4FD6C5 · grasa: #FF8A5C
```

### 5.3 Componente: constructor de menú

- Cada tiempo de comida muestra una opción a la vez, con botón **Cambiar** que cicla entre las opciones
- Contador visible del tipo `2 / 5`
- Chips de extras que se activan/desactivan
- Barra de totales **sticky al fondo** que suma en vivo: kcal, proteína, grasa, carbos — cada una con barra de progreso contra su meta

### 5.4 Reglas de contraste (crítico)

La versión anterior tenía problemas de legibilidad. Requisitos:

- `<html>` y `<body>` deben tener fondo oscuro explícito, más `color-scheme: dark` y `<meta name="theme-color">`, para evitar que el rebote de scroll en móvil muestre blanco
- **Todas** las combinaciones texto/fondo deben pasar WCAG AA (≥ 4.5:1)
- Los botones con fondo de color de acento llevan texto muy oscuro (`#06101A`), no blanco
- Los estados inactivos (pestañas, chips) deben seguir siendo legibles, no casi invisibles

Paleta verificada:

```css
--ink:#0C1219;        /* fondo global */
--panel:#141E2A;      /* tarjetas */
--panel-2:#1B2836;    /* controles */
--line:#27394B;
--line-soft:#1E2E3E;
--text:#EDF3F9;       /* 15.04:1 sobre panel */
--text-dim:#A9BCCD;   /* 8.62:1 */
--text-faint:#8A9DAF; /* 6.02:1 */
--lean:#4FD6C5;       /* masa magra — 9.41:1 */
--fat:#FF8A5C;        /* grasa — 7.24:1 */
--warn:#FFD470;
```

### 5.5 Tipografía

- Títulos: **Barlow Condensed** (500/600/700), mayúsculas
- Cuerpo: **IBM Plex Sans** (400/500/600)
- **Todos los datos numéricos:** IBM Plex Mono (400/500/600) — para que las cifras alineen

### 5.6 Layout

- Grid y flexbox exclusivamente. Sin posicionamiento absoluto sobre texto (era la causa del solapamiento anterior)
- Breakpoint móvil en 640px: el mapa segmentario pasa de 3 columnas a apilado, con la figura primero
- `prefers-reduced-motion` respetado

---

## 6. Checklist de migración

- [ ] Eliminar toda referencia a los ejercicios listados en la sección 0
- [ ] Reemplazar "Cata" por "Angie" en toda la data
- [ ] Actualizar la estructura semanal de 4 a 6 sesiones
- [ ] Crear sección Cuerpo con las métricas de InBody
- [ ] Implementar el mapa segmentario con toggle
- [ ] Crear sección Cocina con el constructor de menú
- [ ] Verificar contraste de todas las combinaciones texto/fondo
- [ ] Verificar que no haya solapamiento de texto en móvil (probar en 375px de ancho)
- [ ] Actualizar la vista de impresión/PDF si el proyecto la tiene
- [ ] Revisar que las rutas existentes (`/rutina`) sigan funcionando o redirigir

---

## 7. Archivos de referencia adjuntos

Estos archivos deben subirse junto con este spec:

| Archivo | Contenido |
|---|---|
| `Panel_Musculito_Martin_Bundy.html` | Implementación de referencia completa y funcional — usar como fuente de verdad para markup, estilos y lógica JS |
| `Rutina_PerfectSplit_Martin_Bundy.pdf` | Rutina en formato imprimible |
| `Plan_Alimentacion_Calibrado_Martin_Bundy.pdf` | Plan nutricional en formato imprimible |
| `Examen_inbody_martin_bundy.pdf` | Reporte crudo del InBody |
| `Analisis_in_body_martin_bundy.pdf` | Reporte interpretado del InBody |

> El HTML de referencia es autocontenido (un solo archivo, sin build). Sirve como especificación ejecutable: si hay duda sobre cómo debe comportarse algo, abrirlo y verificar.
