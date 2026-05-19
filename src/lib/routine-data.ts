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

const legsWarmup = [
  "2 rounds de 10 bodyweight squats con pausa corta abajo.",
  "10 leg swings al frente y 10 laterales por pierna.",
  "8 hip hinges lentos para activar gluteo y femoral.",
  "20 segundos de estiramiento de tobillo y cadera por lado.",
];

const pullWarmup = [
  "10 retracciones escapulares lentas.",
  "10 curls ligeros para calentar codo y antebrazo.",
  "1 serie suave de lat pulldown y 1 serie suave de cable row.",
  "20 segundos de movilidad de muneca y hombro por lado.",
];

const pushWarmup = [
  "5 min de cardio ligero.",
  "10 jumping jacks.",
  "10 elevaciones laterales sin peso o con peso muy ligero.",
  "1 serie ligera de press en maquina vacia.",
];

const cataLegsWarmup = [
  "5 min en escaladora a ritmo suave.",
  "2 rondas de 10 sumo squats con pausa abajo.",
  "8 hip hinges lentos para activar femoral y gluteo.",
];

const legsExercises = (suffix: string): Exercise[] => [
  {
    id: `romanian-deadlift-${suffix}`,
    name: "Romanian deadlift",
    sets: "3 x 8",
    group: "Femoral / Gluteo",
    cue: "Cadera hacia atras, pecho orgulloso y recorrido corto pero limpio.",
    setup: "Toma dos mancuernas o la barra, pies al ancho de cadera y rodillas ligeramente flexionadas.",
    feel: "Estiramiento en femoral y tension en gluteo, no dolor en espalda baja.",
    alternative: "Back extension enfocada en gluteo y femoral.",
  },
  {
    id: `leg-curl-${suffix}`,
    name: "Leg curl (biserie con calf raises)",
    sets: "3 x 8-10",
    group: "Femoral",
    cue: "Sube fuerte, baja lento. Al terminar cada set, pasas directo a pantorrillas.",
    setup: "Ajusta la maquina para que el rodillo quede justo encima del talon.",
    feel: "Trabajo en la parte de atras del muslo.",
    alternative: "Femoral con mancuerna sujetada entre los pies.",
  },
  {
    id: `calf-raises-${suffix}`,
    name: "Calf raises (biserie con leg curl)",
    sets: "3 x 10",
    group: "Pantorrilla",
    cue: "Sube todo lo que puedas, aprieta arriba y baja controlado. Va pegado al leg curl.",
    setup: "Maquina de calf raises o prensa adaptada, metatarso apoyado y talon libre.",
    feel: "Pantorrilla con estiramiento abajo y contraccion arriba.",
    alternative: "Calf raises de pie con mancuerna o en Smith.",
  },
  {
    id: `leg-press-${suffix}`,
    name: "Leg press",
    sets: "3 x 10",
    group: "Cuadriceps / Gluteo",
    cue: "Baja hasta 90 grados y empuja parejo con todo el pie.",
    setup: "Pies al ancho de hombros en la plataforma, espalda pegada al respaldo.",
    feel: "Cuadriceps y gluteo al empujar.",
    alternative: "Smith machine squats si la prensa no esta libre.",
  },
  {
    id: `smith-squat-${suffix}`,
    name: "Smith machine squats",
    sets: "3 x 8",
    group: "Cuadriceps / Gluteo",
    cue: "Baja con control y empuja el piso con todo el pie.",
    setup: "Barra a la altura del pecho, pies un poco delante de la barra y abdomen firme.",
    feel: "Principalmente cuadriceps y gluteo; espalda estable, no cargada.",
    alternative: "Leg press pesada como reemplazo.",
  },
  {
    id: `bulgarian-split-squat-${suffix}`,
    name: "Bulgarian split squat",
    sets: "2 x 8 por pierna",
    group: "Cuadriceps / Gluteo",
    cue: "Paso estable, torso firme y rodilla siguiendo la punta del pie.",
    setup: "Empeine trasero en un banco bajo, pierna de trabajo suficientemente adelantada.",
    feel: "Quema fuerte en cuadriceps y gluteo de la pierna de adelante.",
    alternative: "Split squat sin banco o zancada estatica.",
  },
  {
    id: `deadlift-heels-${suffix}`,
    name: "Peso muerto discos en talones",
    sets: "3 x 10",
    group: "Femoral / Gluteo",
    cue: "Talones elevados en discos, caderas atras y tension en femoral durante todo el recorrido.",
    setup: "Coloca dos discos bajo los talones, toma la barra y mantén espalda recta.",
    feel: "Estiramiento profundo de femoral con mas rango que el RDL convencional.",
    alternative: "Romanian deadlift con mayor inclinacion de torso.",
  },
  {
    id: `leg-extension-${suffix}`,
    name: "Leg extension",
    sets: "2 x 8-10",
    group: "Cuadriceps",
    cue: "Aprieta arriba un instante y no rebotes en la bajada.",
    setup: "Respaldo y rodillo ajustados, rodilla alineada al eje.",
    feel: "Aislamiento del cuadriceps en la parte frontal del muslo.",
    alternative: "Goblet squat con tempo lento.",
  },
  {
    id: `hip-thrust-${suffix}`,
    name: "Hip thrust",
    sets: "3 x 8-10",
    group: "Gluteo",
    cue: "Sube con cadera, bloquea arriba con gluteo y no hiperextiendas la espalda.",
    setup: "Espalda apoyada en el banco o usa la maquina, pies firmes.",
    feel: "El gluteo debe llevarse casi todo el trabajo.",
    alternative: "Glute bridge pesado en el piso o en banco.",
  },
  {
    id: `abductor-${suffix}`,
    name: "Abductor machine finisher",
    sets: "1 x fallo",
    group: "Abductores / Gluteo medio",
    cue: "Abre con control, sostén un instante y lleva ese ultimo set hasta el fallo tecnico.",
    setup: "Asiento ajustado, espalda pegada y rodillas empujando los pads.",
    feel: "Quema en la parte lateral del gluteo y cadera externa.",
    alternative: "Abducciones con banda como finisher.",
  },
];

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
    notes: "Descansa bien. Hoy es la recuperacion del domingo de piernas con Cata.",
    warmup: [],
    exercises: [],
  },
  {
    id: "tuesday",
    label: "Martes",
    shortLabel: "Mar",
    focus: "Pull",
    type: "training",
    companion: "Solo",
    cardio: "20 min de escaladora a baja intensidad",
    cardioOnly: false,
    duration: "55-70 min + cardio",
    notes: "Espalda, trapecios y biceps. Dia de tirón completo.",
    warmup: pullWarmup,
    exercises: [
      {
        id: "lat-pulldown",
        name: "Lat pulldown",
        sets: "2 x 8",
        group: "Espalda",
        cue: "Codos hacia abajo y pecho arriba, sin jalar solo con biceps.",
        setup: "Soporte de muslos ajustado, barra un poco mas ancho que hombros.",
        feel: "Dorsal ancho y espalda alta.",
        alternative: "Assisted pull-up o high row.",
      },
      {
        id: "cable-rows",
        name: "Cable rows",
        sets: "2 x 8 por brazo",
        group: "Espalda media",
        cue: "Jala hacia la cadera y aprieta la escapula atras.",
        setup: "Polea media o baja con agarre individual, torso estable.",
        feel: "Espalda media, dorsal y algo de biceps.",
        alternative: "Remo con mancuerna apoyado en banco.",
      },
      {
        id: "barbell-cable-rows",
        name: "Barbell cable rows",
        sets: "2 x 8",
        group: "Espalda",
        cue: "Recorrido firme, torso quieto y sin impulso.",
        setup: "Barra recta a polea baja, pies firmes y pecho alto.",
        feel: "Espalda media y dorsal.",
        alternative: "Seated row en maquina.",
      },
      {
        id: "upright-single-arm-rows",
        name: "Upright single arm rows",
        sets: "2 x 8",
        group: "Espalda alta / Trapecio",
        cue: "Sube con control y no encogas el hombro de golpe.",
        setup: "Polea o mancuerna, brazo por delante del cuerpo y subida controlada.",
        feel: "Trapecio alto, deltoide lateral y parte alta de la espalda.",
        alternative: "High pull ligero con mancuerna o cable.",
      },
      {
        id: "reverse-machine-flyes",
        name: "Reverse machine flyes",
        sets: "2 x 10",
        group: "Deltoide posterior",
        cue: "Abre con hombro trasero, no con trapecio.",
        setup: "Sentado mirando al respaldo, configuracion de deltoide posterior.",
        feel: "Hombro trasero y parte alta de la espalda.",
        alternative: "Rear delt fly con mancuernas ligeras.",
      },
      {
        id: "dumbbell-shrugs",
        name: "Dumbbell shrugs",
        sets: "2 x 8",
        group: "Trapecio",
        cue: "Eleva recto hacia arriba, sin rodar los hombros.",
        setup: "De pie con mancuernas a los lados y cuello largo.",
        feel: "Trapecio superior.",
        alternative: "Shrugs en Smith si no hay mancuernas.",
      },
      {
        id: "dumbbell-incline-curl",
        name: "Dumbbell incline curl",
        sets: "2 x 8",
        group: "Biceps",
        cue: "Sube limpio, con codo atras y sin columpio.",
        setup: "Banco inclinado, espalda apoyada y brazos cayendo a los lados.",
        feel: "Biceps con mucho estiramiento abajo.",
        alternative: "Curl alterno de pie.",
      },
      {
        id: "preacher-curl",
        name: "Preacher curl en maquina o mancuerna",
        sets: "2 x 8",
        group: "Biceps",
        cue: "No despegues el brazo del apoyo.",
        setup: "Soporte ajustado para que la axila quede fijada arriba del pad.",
        feel: "Biceps aislado en la parte media del recorrido.",
        alternative: "Curl spider o curl alterno sentado.",
      },
      {
        id: "dumbbell-hammer-curl",
        name: "Dumbbell hammer curl",
        sets: "2 x 8",
        group: "Biceps / Braquial",
        cue: "Muneca neutra y codo pegado al torso.",
        setup: "De pie o sentado con mancuernas a los lados.",
        feel: "Braquial, antebrazo y biceps.",
        alternative: "Hammer curl en cuerda.",
      },
    ],
  },
  {
    id: "wednesday",
    label: "Miercoles",
    shortLabel: "Mie",
    focus: "Piernas",
    type: "training",
    companion: "Solo",
    cardio: "20 min de escaladora a baja intensidad",
    cardioOnly: false,
    duration: "60-75 min + cardio",
    notes: "Misma rutina de piernas que el domingo. Dia solo, tu ritmo.",
    warmup: legsWarmup,
    exercises: legsExercises("wednesday"),
  },
  {
    id: "thursday",
    label: "Jueves",
    shortLabel: "Jue",
    focus: "Descanso",
    type: "rest",
    companion: "Libre",
    cardio: "No",
    cardioOnly: false,
    duration: "Recuperacion",
    notes: "Descansa. Manana empieza el bloque del fin de semana con Cata.",
    warmup: [],
    exercises: [],
  },
  {
    id: "friday",
    label: "Viernes",
    shortLabel: "Vie",
    focus: "Cardio",
    type: "training",
    companion: "Con Cata",
    cardio: "30 min de escaladora",
    cardioOnly: true,
    duration: "30 min",
    notes: "Cardio puro con Cata. Escaladora 30 minutos a ritmo sostenido.",
    warmup: [],
    exercises: [],
  },
  {
    id: "saturday",
    label: "Sabado",
    shortLabel: "Sab",
    focus: "Push",
    type: "training",
    companion: "Con Cata",
    cardio: "20-30 min de escaladora",
    cardioOnly: false,
    duration: "60-75 min + cardio",
    notes: "Push con Cata. Sigues su orden. Mismos ejercicios, tus pesos.",
    warmup: pushWarmup,
    exercises: [
      {
        id: "machine-incline-chest-press",
        name: "Machine incline chest press",
        sets: "3 x 8-10",
        group: "Pecho superior",
        cue: "Escapulas atras, empuje parejo y sin dejar caer los codos.",
        setup: "Asiento ajustado para que las asas queden a la linea media del pecho alto.",
        feel: "Pecho superior y algo de hombro frontal.",
        alternative: "Press inclinado con mancuernas.",
      },
      {
        id: "machine-chest-flyes",
        name: "Machine chest flyes / Pecdec",
        sets: "3 x 8-10",
        group: "Pecho",
        cue: "Cierra como abrazando y vuelve sin dejar caer el peso.",
        setup: "Asiento ajustado para que codos y manos salgan a la altura del pecho.",
        feel: "Pecho en estiramiento y cierre.",
        alternative: "Fly con mancuernas en banco plano.",
      },
      {
        id: "dumbbell-flat-chest-press",
        name: "Dumbbell flat chest press",
        sets: "3 x 8-10",
        group: "Pecho",
        cue: "Baja hasta sentir estiramiento y sube sin golpear mancuernas.",
        setup: "Banco plano, pies firmes y hombros retraidos antes de iniciar.",
        feel: "Pecho medio y triceps.",
        alternative: "Machine chest press para mayor estabilidad.",
      },
      {
        id: "dumbbell-shoulder-press",
        name: "Dumbbell shoulder press",
        sets: "3 x 8",
        group: "Hombro frontal",
        cue: "Empuja vertical con abdomen firme y sin arquear la espalda.",
        setup: "Sentado con respaldo, mancuernas a la altura de la oreja.",
        feel: "Hombro frontal y algo de tricep.",
        alternative: "Press militar en maquina.",
      },
      {
        id: "cable-lateral-raises",
        name: "Cable lateral raises",
        sets: "3 x 10 por brazo",
        group: "Hombro lateral",
        cue: "Brazo semirrigido y subida limpia hasta la altura del hombro.",
        setup: "Polea baja con agarre simple, de lado a la torre.",
        feel: "Parte lateral del hombro, no el cuello.",
        alternative: "Elevaciones laterales con mancuerna.",
      },
      {
        id: "front-raises",
        name: "Elevaciones frontales",
        sets: "3 x 10",
        group: "Hombro frontal",
        cue: "Sube hasta la altura del hombro y baja controlado, sin columpio.",
        setup: "De pie con mancuernas o disco, brazos ligeramente flexionados.",
        feel: "Deltoide frontal.",
        alternative: "Cable frontal raise.",
      },
      {
        id: "cable-overhead-tricep-extension",
        name: "Cable overhead tricep extension",
        sets: "2 x 8",
        group: "Triceps",
        cue: "Codos quietos y extension completa.",
        setup: "Cuerda en polea alta, espaldas a la maquina, codos fijos arriba.",
        feel: "Triceps cabeza larga.",
        alternative: "Overhead tricep extension con mancuerna.",
      },
      {
        id: "katana-tricep-extension",
        name: "Katana tricep extension",
        sets: "2 x 8",
        group: "Triceps",
        cue: "Mantén el codo alto y evita girar el torso.",
        setup: "Polea alta con agarre simple, brazo por encima de la cabeza, recorrido diagonal.",
        feel: "Triceps en extension larga.",
        alternative: "Kickback con mancuerna.",
      },
    ],
  },
  {
    id: "sunday",
    label: "Domingo",
    shortLabel: "Dom",
    focus: "Piernas",
    type: "training",
    companion: "Con Cata",
    cardio: "20 min de escaladora",
    cardioOnly: false,
    duration: "60-75 min + cardio",
    notes: "Piernas con Cata. Sigues su orden con tus ejercicios integrados. Mismos ejercicios, tus pesos.",
    warmup: cataLegsWarmup,
    exercises: legsExercises("sunday"),
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
