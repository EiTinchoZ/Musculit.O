# ROUTINE.md

Rutina fuente de verdad de Musculit.O. Esta es la version que se debe modelar en la app salvo que el usuario confirme un cambio.

## Reglas generales

- Descanso entre sets: `2 minutos`
- Intensidad: cerca del fallo, sin romper tecnica
- Rango dominante: `8-10 reps`
- Cardio post-entreno: `20 minutos de escaladora a baja intensidad` en todos los dias de entrenamiento de fuerza
- Objetivo: recomposicion corporal con foco en ganar algo de masa, verte mas marcado y sostener consistencia real

## Estructura semanal

| Dia | Enfoque | Cardio | Con Cata | Observacion |
| --- | --- | --- | --- | --- |
| Lunes | Descanso | No | No | Recuperacion tras piernas del domingo |
| Martes | Pull | 20 min | No | Espalda, trapecios y biceps |
| Miercoles | Piernas | 20 min | No | Misma rutina que el domingo |
| Jueves | Descanso | No | No | Recuperacion antes del bloque de fin de semana |
| Viernes | Cardio | 30 min escaladora | Si | Cardio puro con Cata |
| Sabado | Push | 20-30 min | Si | Pecho, hombros y triceps siguiendo la rutina de Cata |
| Domingo | Piernas | 20 min | Si | Piernas siguiendo el orden de Cata, con ejercicios de Tin anadidos |

## Martes - Pull

1. `Lat pulldown` — `2 x 8`
2. `Cable rows` — `2 x 8 por brazo`
3. `Barbell cable rows` — `2 x 8`
4. `Upright single arm rows` — `2 x 8`
5. `Reverse machine flyes` — `2 x 10`
6. `Dumbbell shrugs` — `2 x 8`
7. `Dumbbell incline curl` — `2 x 8`
8. `Preacher curl en maquina o mancuerna` — `2 x 8`
9. `Dumbbell hammer curl` — `2 x 8`

## Miercoles y Domingo - Piernas

La misma rutina aplica a ambos dias. El domingo sigue el orden de Cata con los ejercicios de Tin integrados.

1. `Romanian deadlift` — `3 x 8`
2. `Leg curl + Calf raises` — `3 x 8-10` en biserie
3. `Leg press` — `3 x 10`
4. `Smith machine squats` — `3 x 8`
5. `Bulgarian split squat` — `2 x 8 por pierna`
6. `Peso muerto discos en talones` — `3 x 10`
7. `Leg extension` — `3 x 8-10`
8. `Hip thrust` — `3 x 8-10`
9. `Abductor machine` — `2 x 8` (inclinarse hacia adelante al sentarse, para mayor activacion de gluteo medio)

## Finisher de core — dinamico, Lunes a Jueves

Cambiado 2026-07-13 a pedido de Tin: el finisher de core ya NO esta fijo a dias especificos. La regla ahora es dinamica:

- Se agrega en hasta **2 dias de entreno por semana**, siempre dentro de la ventana **Lunes a Jueves** (nunca en Viernes, Sabado o Domingo, que son los dias con Cata).
- Los 2 dias se calculan automaticamente: son los primeros 2 dias de entreno reales de esa semana dentro de Lunes-Jueves, en orden cronologico.
- Bajo el horario default (Lunes y Jueves descanso), esto cae en **Martes (Pull) y Miercoles (Piernas)**.
- Si la semana es irregular (ver seccion "Semana irregular" en `AGENTS.md`) y los dias de descanso cambian, el finisher se mueve solo junto con el resto de la rutina — sigue cayendo en los dias de entreno dentro de Lunes-Jueves, nunca en Viernes/Sabado/Domingo.
- Como Tin siempre descansa 2 dias por semana y esos 2 descansos suelen caer dentro de Lunes-Jueves, esto da naturalmente 2 dias de abs por semana con al menos algo de separacion entre ellos (a diferencia de la version anterior, que a veces caia en dias seguidos).

1. `Cable crunch` (o disco con peso acostado en banco declinado si no hay polea) — `3 x 10-15 al fallo`
2. `Leg raises` controladas, sin balanceo — `3 x 10-15 al fallo`

Regla de sobrecarga progresiva: si se completan las 15 reps limpias en ambas series, subir peso o reps la siguiente sesion.

## Viernes - Cardio con Cata

- Escaladora 30 minutos a ritmo sostenido

## Sabado - Push (con Cata)

Warm up: 5 min cardio + 10 jumping jacks

1. `Machine incline chest press` — `3 x 8-10`
2. `Machine chest flyes / Pecdec` — `3 x 8-10`
3. `Dumbbell flat chest press` — `3 x 8-10`
4. `Dumbbell shoulder press` — `3 x 8`
5. `Cable lateral raises` — `3 x 10 por brazo`
6. `Elevaciones frontales` — `3 x 10` *(ejercicio de Cata)*
7. `Cable overhead tricep extension` — `3 x 8`
8. `Katana tricep extension` — `2 x 8`

## Notas operativas

- `Pull` toma entre `55-70 minutos`.
- `Piernas` toma entre `60-75 minutos`.
- `Push con Cata` toma entre `60-75 minutos`.
- En piernas, `Leg curl + Calf raises` se hacen en biserie segun la rutina.
- Si un peso permite mas de `10 reps` limpias, hay margen para subirlo.
- El domingo con Cata, los parametros de Tin (8-10 reps, mas peso) son independientes de los de ella (mas reps, menos peso). Mismos ejercicios, pesos propios.
- La app debe permitir registrar pesos por `set` para ver aumento semanal y mensual real.
- La app debe incluir journal post-sesion para anotar sensaciones, tecnica, energia y observaciones.
