import { InBodyReading } from "@/lib/musculit-state";

// Lectura real del examen del 10/08/2026, usada para sembrar el primer
// registro cuando todavia no hay ninguno en la base. Fuente: InBody, ver
// docs/actualizacion-2026-08/MUSCULITO_UPDATE_SPEC.md seccion 2.
export const SEEDED_INBODY_READING: InBodyReading = {
  id: "seed-2026-08-10",
  date: "2026-08-10",
  weightKg: 69.2,
  imc: 22.86,
  bodyFatPercent: 12.88,
  fatMassKg: 8.9,
  leanMassKg: 56.34,
  skeletalMuscleKg: 34.7,
  bodyWaterL: 41.24,
  visceralFat: 4,
  bmr: 1711.22,
  appendicularIndex: 9.18,
  idealWeightKg: 65.85,
  weightControlKg: -3.35,
  fatControlKg: 0.08,
  leanControlKg: 1.27,
  segmental: {
    lean: { armR: 3.53, armL: 3.54, trunk: 28.55, legR: 10.48, legL: 10.23 },
    fat: { armR: 0.3, armL: 0.28, trunk: 8.09, legR: 0.1, legL: 0.14 },
  },
};

export type MetricRange = { min: number; normalMin: number; normalMax: number; max: number };

export type BodyMetric = {
  id: string;
  label: string;
  unit: string;
  value: (reading: InBodyReading) => number;
  range: MetricRange | null;
  hint: string;
};

// Rangos de referencia del examen InBody de Martin. Viven aca (no en la DB)
// porque son la escala del instrumento para este perfil, no un dato que
// cambie de lectura en lectura.
export const bodyMetrics: BodyMetric[] = [
  {
    id: "grasaCorporal",
    label: "Grasa corporal",
    unit: "%",
    value: (r) => r.bodyFatPercent,
    range: { min: 5, normalMin: 8, normalMax: 19, max: 25 },
    hint: "Justo en medio del rango sano. No hace falta bajar de aqui — bajar mas costaria musculo.",
  },
  {
    id: "masaMagra",
    label: "Masa magra",
    unit: "kg",
    value: (r) => r.leanMassKg,
    range: { min: 37, normalMin: 54.0, normalMax: 61.3, max: 80 },
    hint: "Aca esta el margen real de mejora. Apenas entra al rango normal — hay espacio para crecer.",
  },
  {
    id: "grasaVisceral",
    label: "Grasa visceral",
    unit: "",
    value: (r) => r.visceralFat,
    range: { min: 1, normalMin: 1, normalMax: 9, max: 12 },
    hint: "La grasa que rodea los organos. La tuya esta baja — esto es lo que mas importa para salud.",
  },
  {
    id: "imc",
    label: "Indice de masa corporal",
    unit: "kg/m²",
    value: (r) => r.imc,
    range: { min: 13, normalMin: 18.6, normalMax: 24.9, max: 33 },
    hint: "Dato flojo por si solo: no distingue musculo de grasa. Usalo solo como referencia general.",
  },
  {
    id: "aguaCorporal",
    label: "Agua corporal",
    unit: "L",
    value: (r) => r.bodyWaterL,
    range: { min: 24, normalMin: 34.6, normalMax: 45.0, max: 59 },
    hint: "Meta diaria de agua: tu peso x 40 ml.",
  },
  {
    id: "masaMuscular",
    label: "Masa muscular esqueletica",
    unit: "kg",
    value: (r) => r.skeletalMuscleKg,
    range: null,
    hint: "Es el musculo real de brazos y piernas.",
  },
];

export type RangeStatus = "bajo" | "normal-bajo" | "ideal" | "normal-alto" | "alto";

export const rangeStatusLabel: Record<RangeStatus, string> = {
  bajo: "Bajo",
  "normal-bajo": "Normal, parte baja",
  ideal: "Ideal",
  "normal-alto": "Normal, parte alta",
  alto: "Alto",
};

export function classifyRange(value: number, range: MetricRange): RangeStatus {
  if (value < range.min) return "bajo";
  if (value > range.max) return "alto";
  if (value < range.normalMin) return "normal-bajo";
  if (value > range.normalMax) return "normal-alto";

  const span = range.normalMax - range.normalMin;
  if (span <= 0) return "ideal";

  const center = range.normalMin + span / 2;
  const distanceRatio = Math.abs(value - center) / (span / 2);

  if (distanceRatio <= 1 / 3) return "ideal";
  return value < center ? "normal-bajo" : "normal-alto";
}

// Posicion (0-100) del valor dentro de [min, max], para dibujar la marca en
// la barra de rango.
export function rangePosition(value: number, range: MetricRange): number {
  const clamped = Math.min(range.max, Math.max(range.min, value));
  return ((clamped - range.min) / (range.max - range.min)) * 100;
}

export function rangeZone(range: MetricRange): { start: number; end: number } {
  return {
    start: rangePosition(range.normalMin, range),
    end: rangePosition(range.normalMax, range),
  };
}

// Formula de intensidad de color del mapa segmentario (spec seccion 5.2):
// t = 0.22 + 0.78 * (valor / maxDelModo) ^ 0.55
export function segmentIntensity(value: number, maxOfMode: number): number {
  if (maxOfMode <= 0) return 0.22;
  return 0.22 + 0.78 * Math.pow(Math.max(0, value) / maxOfMode, 0.55);
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// Mezcla el color base del diagrama con el color del modo activo, segun t (0..1).
export function mixSegmentColor(baseHex: string, targetHex: string, t: number): string {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);
  const mixed = base.map((channel, index) => Math.round(channel + (target[index] - channel) * t));
  return `rgb(${mixed.join(",")})`;
}

export type TrendMetricId = "weightKg" | "bodyFatPercent" | "leanMassKg";

export type TrendMetric = {
  id: TrendMetricId;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  value: (reading: InBodyReading) => number;
};

export const trendMetrics: TrendMetric[] = [
  { id: "weightKg", label: "Peso", shortLabel: "Peso", unit: "kg", color: "var(--ember)", value: (r) => r.weightKg },
  {
    id: "bodyFatPercent",
    label: "Grasa corporal",
    shortLabel: "Grasa",
    unit: "%",
    color: "var(--ember-strong)",
    value: (r) => r.bodyFatPercent,
  },
  {
    id: "leanMassKg",
    label: "Masa magra",
    shortLabel: "M. magra",
    unit: "kg",
    color: "var(--status-good)",
    value: (r) => r.leanMassKg,
  },
];

export type TrendPoint = { date: string; value: number };

export function buildTrendSeries(readings: InBodyReading[], metric: TrendMetric): TrendPoint[] {
  return [...readings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((reading) => ({ date: reading.date, value: metric.value(reading) }));
}

export type BodyInsight = { title: string; body: string };

// Los insights se calculan desde los numeros reales de la lectura, no se
// guardan como texto fijo — asi siguen siendo ciertos cuando se cargue una
// medicion nueva.
export function getBodyInsights(reading: InBodyReading): BodyInsight[] {
  const trunkFatShare = reading.fatMassKg > 0 ? reading.segmental.fat.trunk / reading.fatMassKg : 0;
  const limbsFatKg =
    reading.segmental.fat.armR + reading.segmental.fat.armL + reading.segmental.fat.legR + reading.segmental.fat.legL;
  const legDelta = Math.abs(reading.segmental.lean.legR - reading.segmental.lean.legL);
  const armDelta = Math.abs(reading.segmental.lean.armR - reading.segmental.lean.armL);
  const isSymmetric = legDelta < 0.5 && armDelta < 0.5;

  return [
    {
      title: "La grasa se concentra en el tronco",
      body: `El ${Math.round(trunkFatShare * 100)}% de tu grasa esta en el tronco. De ${reading.fatMassKg.toFixed(1)} kg de grasa total, ${reading.segmental.fat.trunk.toFixed(2)} kg estan ahi — brazos y piernas juntos apenas suman ${limbsFatKg.toFixed(2)} kg. Por eso sientes barriga aunque el porcentaje general sea bueno.`,
    },
    {
      title: isSymmetric ? "Simetria practicamente perfecta" : "Diferencia entre lados a vigilar",
      body: `Diferencia de ${legDelta.toFixed(2)} kg entre piernas y ${armDelta.toFixed(2)} kg entre brazos en masa magra. ${isSymmetric ? "No hay desbalances que corregir." : "Vale la pena seguir esto en las proximas mediciones."}`,
    },
    {
      title: "El -3.35 kg no es una recomendacion",
      body: `El InBody sugiere bajar ${Math.abs(reading.weightControlKg).toFixed(2)} kg, pero ese numero sale solo de tu altura y no distingue musculo de grasa. Tu control de grasa real es de ${reading.fatControlKg >= 0 ? "+" : ""}${reading.fatControlKg.toFixed(2)} kg — casi nada. Tu control de masa magra sugiere ganar ${reading.leanControlKg.toFixed(2)} kg.`,
    },
    {
      title: "La estrategia correcta",
      body: "Superavit calorico leve, proteina alta, entrenar duro. El musculo nuevo hace que la grasa del tronco se note menos, sin arriesgar volver a acumular ahi.",
    },
  ];
}
