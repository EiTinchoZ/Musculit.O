export type DayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DayType = "training" | "rest";

export type Exercise = {
  id: string;
  name: string;
  sets: string;
  group: string;
  cue: string;
  setup: string;
  feel: string;
  alternative: string;
};

export type TrainingDay = {
  id: DayId;
  label: string;
  shortLabel: string;
  focus: string;
  type: DayType;
  companion: string;
  cardio: string;
  cardioOnly: boolean;
  duration: string;
  notes: string;
  warmup: string[];
  exercises: Exercise[];
};

const upperWarmup = [
  "10 retracciones escapulares lentas.",
  "10 elevaciones laterales sin peso o con peso muy ligero.",
  "1 serie ligera de press en maquina vacia.",
  "10 jumping jacks para subir el pulso antes de pecho.",
];

const legsWarmup = [
  "2 rounds de 10 bodyweight squats con pausa corta abajo.",
  "10 leg swings al frente y 10 laterales por pierna.",
  "8 hip hinges lentos para activar gluteo y femoral.",
  "20 segundos de estiramiento de tobillo y cadera por lado.",
];

const backWarmup = [
  "10 retracciones escapulares lentas.",
  "10 curls ligeros para calentar codo y antebrazo.",
  "1 serie suave de lat pulldown y 1 serie suave de seated row.",
  "20 segundos de movilidad de muneca y hombro por lado.",
];

const pushWarmup = [
  "5 min de cardio ligero.",
  "10 jumping jacks.",
  "10 elevaciones laterales sin peso o con peso muy ligero.",
  "1 serie ligera de press en maquina vacia.",
];

const angieLegsWarmup = [
  "5 min en escaladora a ritmo suave.",
  "2 rondas de 10 sumo squats con pausa abajo.",
  "8 hip hinges lentos para activar femoral y gluteo.",
];

type ExerciseContent = Omit<Exercise, "id" | "sets">;

// Catalogo de ejercicios: cue/setup/feel/alternative viven una sola vez por
// ejercicio, aunque el mismo movimiento aparezca en mas de un dia con series
// distintas (ej. Lat pulldown en Martes y Jueves). `pick` arma el Exercise
// final con el id y las series correspondientes a ese dia.
const catalog: Record<string, ExerciseContent> = {
  "machine-incline-chest-press": {
    name: "Machine incline chest press",
    group: "Pecho superior",
    cue: "Escapulas atras, empuje parejo y sin dejar caer los codos.",
    setup: "Asiento ajustado para que las asas queden a la linea media del pecho alto.",
    feel: "Pecho superior y algo de hombro frontal.",
    alternative: "Press inclinado con mancuernas.",
  },
  "dumbbell-flat-chest-press": {
    name: "Dumbbell flat chest press",
    group: "Pecho",
    cue: "Baja hasta sentir estiramiento y sube sin golpear mancuernas.",
    setup: "Banco plano, pies firmes y hombros retraidos antes de iniciar.",
    feel: "Pecho medio y triceps.",
    alternative: "Machine chest press para mayor estabilidad.",
  },
  "machine-chest-flyes": {
    name: "Machine chest flyes / Pecdec",
    group: "Pecho",
    cue: "Cierra como abrazando y vuelve sin dejar caer el peso.",
    setup: "Asiento ajustado para que codos y manos salgan a la altura del pecho.",
    feel: "Pecho en estiramiento y cierre.",
    alternative: "Fly con mancuernas en banco plano.",
  },
  "dumbbell-shoulder-press": {
    name: "Dumbbell shoulder press",
    group: "Hombro frontal",
    cue: "Empuja vertical con abdomen firme y sin arquear la espalda.",
    setup: "Sentado con respaldo, mancuernas a la altura de la oreja.",
    feel: "Hombro frontal y algo de tricep.",
    alternative: "Press militar en maquina.",
  },
  "cable-lateral-raises": {
    name: "Cable lateral raises",
    group: "Hombro lateral",
    cue: "Brazo semirrigido y subida limpia hasta la altura del hombro.",
    setup: "Polea baja con agarre simple, de lado a la torre.",
    feel: "Parte lateral del hombro, no el cuello.",
    alternative: "Elevaciones laterales con mancuerna.",
  },
  "front-raises": {
    name: "Elevaciones frontales",
    group: "Hombro frontal",
    cue: "Sube hasta la altura del hombro y baja controlado, sin columpio.",
    setup: "De pie con mancuernas o disco, brazos ligeramente flexionados.",
    feel: "Deltoide frontal.",
    alternative: "Cable frontal raise.",
  },
  "cable-overhead-tricep-extension": {
    name: "Cable overhead tricep extension",
    group: "Triceps",
    cue: "Codos quietos y extension completa.",
    setup: "Cuerda en polea alta, espaldas a la maquina, codos fijos arriba.",
    feel: "Triceps cabeza larga.",
    alternative: "Overhead tricep extension con mancuerna.",
  },
  "katana-tricep-extension": {
    name: "Katana tricep extension",
    group: "Triceps",
    cue: "Manten el codo alto y evita girar el torso.",
    setup: "Polea alta con agarre simple, brazo por encima de la cabeza, recorrido diagonal.",
    feel: "Triceps en extension larga.",
    alternative: "Kickback con mancuerna.",
  },
  "lat-pulldown": {
    name: "Lat pulldown",
    group: "Espalda",
    cue: "Codos hacia abajo y pecho arriba, sin jalar solo con biceps.",
    setup: "Soporte de muslos ajustado, barra un poco mas ancho que hombros.",
    feel: "Dorsal ancho y espalda alta.",
    alternative: "Assisted pull-up o seated row.",
  },
  "reverse-pec-deck": {
    name: "Reverse pec deck",
    group: "Deltoide posterior / Espalda alta",
    cue: "Abre con hombro trasero, no con trapecio.",
    setup: "Sentado mirando al respaldo, configuracion de deltoide posterior.",
    feel: "Hombro trasero y parte alta de la espalda.",
    alternative: "Rear delt fly con mancuernas ligeras.",
  },
  "dumbbell-incline-curl": {
    name: "Dumbbell incline curl",
    group: "Biceps",
    cue: "Sube limpio, con codo atras y sin columpio.",
    setup: "Banco inclinado, espalda apoyada y brazos cayendo a los lados.",
    feel: "Biceps con mucho estiramiento abajo.",
    alternative: "Curl alterno de pie.",
  },
  "preacher-curl": {
    name: "Preacher curl",
    group: "Biceps",
    cue: "No despegues el brazo del apoyo.",
    setup: "Soporte ajustado para que la axila quede fijada arriba del pad.",
    feel: "Biceps aislado en la parte media del recorrido.",
    alternative: "Curl spider o curl alterno sentado.",
  },
  "dumbbell-hammer-curl": {
    name: "Dumbbell hammer curl",
    group: "Biceps / Braquial",
    cue: "Muneca neutra y codo pegado al torso.",
    setup: "De pie o sentado con mancuernas a los lados.",
    feel: "Braquial, antebrazo y biceps.",
    alternative: "Hammer curl en cuerda.",
  },
  "squats-smith": {
    name: "Squats en Smith",
    group: "Cuadriceps / Gluteo",
    cue: "Baja con control hasta pasar de paralelo y empuja parejo con todo el pie.",
    setup: "Barra a la altura del pecho, pies un poco adelante de la barra para que el riel guie el recorrido.",
    feel: "Cuadriceps al frente, con el riel quitandole trabajo al balance.",
    alternative: "Squat libre con barra si el Smith no esta disponible.",
  },
  "leg-extension": {
    name: "Leg extension",
    group: "Cuadriceps",
    cue: "Aprieta arriba un instante y no rebotes en la bajada.",
    setup: "Respaldo y rodillo ajustados, rodilla alineada al eje.",
    feel: "Aislamiento del cuadriceps en la parte frontal del muslo.",
    alternative: "Goblet squat con tempo lento.",
  },
  "lunges-dumbbell": {
    name: "Lunges con mancuerna",
    group: "Cuadriceps / Gluteo",
    cue: "Paso largo, baja recto hacia abajo y empuja con el talon delantero para volver.",
    setup: "Una mancuerna en cada mano, torso erguido, paso hacia adelante o caminando segun el espacio disponible.",
    feel: "Cuadriceps y gluteo de la pierna de adelante, con estiramiento en la de atras.",
    alternative: "Bulgarian split squat con banco si buscas mas aislamiento.",
  },
  "leg-press": {
    name: "Leg press",
    group: "Cuadriceps / Gluteo",
    cue: "Baja hasta 90 grados y empuja parejo con todo el pie.",
    setup: "Pies al ancho de hombros en la plataforma, espalda pegada al respaldo.",
    feel: "Cuadriceps y gluteo al empujar.",
    alternative: "Smith machine squats si la prensa no esta libre.",
  },
  "hip-thrust": {
    name: "Hip thrust",
    group: "Gluteo",
    cue: "Sube con cadera, bloquea arriba con gluteo y no hiperextiendas la espalda.",
    setup: "Espalda apoyada en el banco o usa la maquina, pies firmes.",
    feel: "El gluteo debe llevarse casi todo el trabajo.",
    alternative: "Glute bridge pesado en el piso o en banco.",
  },
  "calf-raises": {
    name: "Elevacion de pantorrillas",
    group: "Pantorrilla",
    cue: "Sube todo lo que puedas, aprieta arriba un instante y baja controlado hasta sentir el estiramiento.",
    setup: "Maquina de pantorrillas o prensa adaptada, metatarso apoyado y talon libre.",
    feel: "Pantorrilla con contraccion arriba y estiramiento abajo.",
    alternative: "Calf raises de pie con mancuerna o en Smith.",
  },
  "pull-up": {
    name: "Pull-up / assisted pull-up",
    group: "Espalda",
    cue: "Jala con el codo hacia la cadera, pecho arriba, y baja con control total sin caer en peso muerto.",
    setup: "Agarre un poco mas ancho que los hombros. Si no llegas a las reps limpias, usa la maquina asistida con el contrapeso minimo necesario.",
    feel: "Dorsal ancho de punta a punta del recorrido.",
    alternative: "Lat pulldown con agarre ancho si no hay maquina asistida disponible.",
  },
  "seated-row": {
    name: "Seated row",
    group: "Espalda media",
    cue: "Jala hacia el abdomen, aprieta la escapula atras y vuelve con control sin dejar caer el peso de golpe.",
    setup: "Pies firmes en la plataforma, rodillas ligeramente flexionadas, torso estable durante todo el recorrido.",
    feel: "Espalda media y dorsal, sin balanceo de torso.",
    alternative: "Remo con mancuerna apoyado en banco.",
  },
  "straight-arm-pulldown": {
    name: "Pull down brazos rectos",
    group: "Espalda / Dorsal",
    cue: "Brazos casi rectos, baja la barra en arco hasta el muslo apretando el dorsal, sin usar el hombro.",
    setup: "Polea alta con barra recta o cuerda, torso ligeramente inclinado al frente.",
    feel: "Dorsal aislado, sin trabajo de biceps.",
    alternative: "Pullover con mancuerna en banco.",
  },
  "lumbar-hyperextension": {
    name: "Hiperextension lumbar",
    group: "Lumbar / Erectores",
    cue: "Baja con control hasta sentir el estiramiento y sube solo hasta alinear el torso, sin hiperextender.",
    setup: "Banco romano ajustado a la altura de la cadera, tobillos fijos bajo los rodillos.",
    feel: "Zona lumbar y gluteo trabajando juntos.",
    alternative: "Superman en el piso si no hay banco romano.",
  },
  "abs-crunch-machine": {
    name: "Crunch en maquina abdominal",
    group: "Abdomen",
    cue: "Flexiona la columna llevando el pecho hacia la cadera, aprieta arriba y vuelve con control.",
    setup: "Maquina de abdomen ajustada al torso, pies fijos bajo los pads.",
    feel: "Contraccion abdominal completa, no en la espalda baja.",
    alternative: "Crunch con disco en banco declinado si no hay maquina.",
  },
  "leg-raises": {
    name: "Leg raises",
    group: "Abdomen inferior",
    cue: "Sube y baja con control total, sin balancear el cuerpo para tomar impulso.",
    setup: "Colgado de la barra o acostado en banco, piernas extendidas o semi flexionadas.",
    feel: "Abdomen inferior trabajando toda la bajada, no solo la subida.",
    alternative: "Rodillas al pecho colgado si el rango extendido es muy dificil todavia.",
  },
  "deadlift-free-bar": {
    name: "Peso muerto barra libre",
    group: "Femoral / Gluteo",
    cue: "Cadera hacia atras, barra pegada a la pierna, y sube empujando el piso sin redondear la espalda.",
    setup: "Barra frente a las espinillas, agarre justo afuera de las piernas, pecho orgulloso antes de iniciar.",
    feel: "Estiramiento en femoral y tension fuerte en gluteo al bloquear arriba.",
    alternative: "Romanian deadlift con mancuernas si la barra no esta disponible.",
  },
  "lying-leg-curl": {
    name: "Femoral acostado",
    group: "Femoral",
    cue: "Flexiona la rodilla llevando el talon hacia el gluteo, aprieta arriba y baja lento.",
    setup: "Acostado boca abajo en la maquina, rodillo justo encima del talon.",
    feel: "Parte de atras del muslo, sin ayuda de cadera.",
    alternative: "Leg curl sentado si la version acostada no esta libre.",
  },
  "abductor-alternating": {
    name: "Abductores abiertos y cerrados",
    group: "Abductores / Gluteo medio",
    cue: "Alterna entre abrir contra resistencia y cerrar contra resistencia, con control en ambas direcciones, sin usar impulso.",
    setup: "Maquina de abductor/aductor, torso inclinado hacia adelante para mas activacion de gluteo medio en la apertura.",
    feel: "Cadera externa en la apertura, interna de muslo en el cierre.",
    alternative: "Banda de resistencia en clamshells si no hay maquina doble.",
  },
};

function pick(id: string, sets: string): Exercise {
  const content = catalog[id];
  if (!content) {
    throw new Error(`Ejercicio no encontrado en el catalogo: ${id}`);
  }
  return { id, sets, ...content };
}

export const weeklySplit: TrainingDay[] = [
  {
    id: "monday",
    label: "Lunes",
    shortLabel: "Lun",
    focus: "Descanso",
    type: "rest",
    companion: "Libre",
    cardio: "No",
    cardioOnly: false,
    duration: "Recuperacion",
    notes: "Descansa bien. Manana arranca la semana con Full upper.",
    warmup: [],
    exercises: [],
  },
  {
    id: "tuesday",
    label: "Martes",
    shortLabel: "Mar",
    focus: "Full upper",
    type: "training",
    companion: "Solo",
    cardio: "15 min de escaladora al terminar",
    cardioOnly: false,
    duration: "75-85 min + cardio",
    notes:
      "Push va completo porque el sabado se repite. Espalda y biceps van ligeros: tienen su dia dedicado el jueves. Pecho primero, a proposito: es donde buscas el cambio visual y merece energia fresca.",
    warmup: upperWarmup,
    exercises: [
      pick("machine-incline-chest-press", "3 x 8-10"),
      pick("dumbbell-flat-chest-press", "3 x 8-10"),
      pick("machine-chest-flyes", "2 x 10"),
      pick("dumbbell-shoulder-press", "3 x 8"),
      pick("cable-lateral-raises", "3 x 10 por brazo"),
      pick("cable-overhead-tricep-extension", "3 x 8"),
      pick("katana-tricep-extension", "2 x 8"),
      pick("lat-pulldown", "3 x 8"),
      pick("reverse-pec-deck", "2 x 10"),
      pick("dumbbell-incline-curl", "3 x 8"),
      pick("preacher-curl", "2 x 8"),
    ],
  },
  {
    id: "wednesday",
    label: "Miercoles",
    shortLabel: "Mie",
    focus: "Piernas 1",
    type: "training",
    companion: "Solo",
    cardio: "20 min de escaladora",
    cardioOnly: false,
    duration: "60-75 min + cardio",
    notes:
      "Enfasis en cuadriceps. Todas las series van al fallo, tal como las definiste: es mucha carga acumulada, respeta los 2 minutos de descanso entre sets.",
    warmup: legsWarmup,
    exercises: [
      pick("squats-smith", "3 al fallo"),
      pick("leg-extension", "3 al fallo"),
      pick("lunges-dumbbell", "3 x pierna al fallo"),
      pick("leg-press", "3 al fallo"),
      pick("hip-thrust", "3 al fallo (ultima descendente)"),
      pick("calf-raises", "3 al fallo"),
    ],
  },
  {
    id: "thursday",
    label: "Jueves",
    shortLabel: "Jue",
    focus: "Espalda y biceps",
    type: "training",
    companion: "Solo",
    cardio: "No",
    cardioOnly: false,
    duration: "55-70 min",
    notes:
      "Trabajo pesado de espalda, 48 horas despues del martes para llegar recuperado (el dia de piernas del miercoles se metio a proposito entre los dos). Cierra con el finisher de abdomen.",
    warmup: backWarmup,
    exercises: [
      pick("pull-up", "3 x 8"),
      pick("seated-row", "3 x 8"),
      pick("lat-pulldown", "3 x 8-10"),
      pick("straight-arm-pulldown", "2 x 8"),
      pick("lumbar-hyperextension", "2 x 10"),
      pick("reverse-pec-deck", "2 x 10"),
      pick("preacher-curl", "3 x 8"),
      pick("dumbbell-hammer-curl", "2 x 8"),
      pick("abs-crunch-machine", "3 x 10-15 al fallo"),
      pick("leg-raises", "3 x 10-15 al fallo"),
    ],
  },
  {
    id: "friday",
    label: "Viernes",
    shortLabel: "Vie",
    focus: "Cardio",
    type: "training",
    companion: "Con Angie",
    cardio: "20-30 min de escaladora o caminadora inclinada",
    cardioOnly: true,
    duration: "20-30 min",
    notes:
      "Cardio puro con Angie, sin pesas. Escaladora, o caminadora inclinada al 10-12% a 5-6 km/h.",
    warmup: [],
    exercises: [],
  },
  {
    id: "saturday",
    label: "Sabado",
    shortLabel: "Sab",
    focus: "Pecho, hombro y triceps",
    type: "training",
    companion: "Con Angie",
    cardio: "No",
    cardioOnly: false,
    duration: "55-70 min",
    notes: "Con Angie. Sigues su orden, mismos ejercicios, tus pesos.",
    warmup: pushWarmup,
    exercises: [
      pick("machine-incline-chest-press", "3 x 8-10"),
      pick("machine-chest-flyes", "3 x 8-10"),
      pick("dumbbell-flat-chest-press", "3 x 8-10"),
      pick("dumbbell-shoulder-press", "3 x 8"),
      pick("cable-lateral-raises", "3 x 10 por brazo"),
      pick("front-raises", "3 x 10"),
      pick("cable-overhead-tricep-extension", "3 x 8"),
      pick("katana-tricep-extension", "2 x 8"),
    ],
  },
  {
    id: "sunday",
    label: "Domingo",
    shortLabel: "Dom",
    focus: "Piernas 2",
    type: "training",
    companion: "Con Angie",
    cardio: "20 min de escaladora",
    cardioOnly: false,
    duration: "60-75 min + cardio",
    notes:
      "Con Angie, enfasis femoral y gluteo. Todas las series al fallo, sigues tu propio ritmo de peso.",
    warmup: angieLegsWarmup,
    exercises: [
      pick("deadlift-free-bar", "3 al fallo"),
      pick("lying-leg-curl", "3 al fallo"),
      pick("leg-press", "3 al fallo"),
      pick("hip-thrust", "3 al fallo (ultima drop set)"),
      pick("abductor-alternating", "3 sets alternando al fallo"),
    ],
  },
];

export const dayOrder: DayId[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function getDayById(dayId: DayId) {
  return weeklySplit.find((day) => day.id === dayId)!;
}

export function weekdayToDayId(weekday: number): DayId {
  return dayOrder[(weekday + 6) % 7];
}
