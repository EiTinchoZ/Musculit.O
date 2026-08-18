import {
  DayId,
  TrainingDay,
  dayOrder,
  getDayById,
  weekdayToDayId,
  weeklySplit,
} from "@/lib/routine-data";
import { Habit, HabitCadence, habits } from "@/lib/habits-data";

export type UserProfile = {
  name: string;
  age: number;
  heightM: number;
  weightLb: number;
  goal: string;
  gym: string;
  experience: string;
};

export type Preferences = {
  showDetails: boolean;
  soundEnabled: boolean;
  calendarView: "day" | "week" | "month" | "year";
  weightUnit: "lb" | "kg";
};

export type SessionRecord = {
  date: string;
  dayId: DayId;
  completedExerciseIds: string[];
  completedCardio: boolean;
  journal: string;
  setWeights: Record<string, string[]>;
  weightUnit: "lb" | "kg";
  closedAt: string | null;
};

export type DayOverrides = Record<string, DayId>;

// clave de periodo (fecha ISO para diario, lunes ISO de la semana para semanal,
// "YYYY-MM" para mensual) -> ids de habitos completados en ese periodo
export type HabitCompletions = Record<string, string[]>;

export type BodySegments = {
  armR: number;
  armL: number;
  trunk: number;
  legR: number;
  legL: number;
};

export type InBodyReading = {
  id: string;
  date: string;
  weightKg: number;
  imc: number;
  bodyFatPercent: number;
  fatMassKg: number;
  leanMassKg: number;
  skeletalMuscleKg: number;
  bodyWaterL: number;
  visceralFat: number;
  bmr: number;
  appendicularIndex: number;
  idealWeightKg: number;
  weightControlKg: number;
  fatControlKg: number;
  leanControlKg: number;
  segmental: {
    lean: BodySegments;
    fat: BodySegments;
  };
};

export type NutritionSelection = {
  mealChoices: Record<string, number>;
  extrasSelected: string[];
};

export type AppState = {
  user: UserProfile;
  preferences: Preferences;
  sessions: Record<string, SessionRecord>;
  dayOverrides: DayOverrides;
  habitCompletions: HabitCompletions;
  inBodyReadings: InBodyReading[];
  nutritionLogs: Record<string, NutritionSelection>;
};

export type DerivedStats = {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  streak: number;
  fullCompletionStreak: number;
  maxStreak: number;
  completedDays: number;
  scheduledDaysSeen: number;
  consistency: number;
  thisWeekCompleted: number;
  thisWeekScheduled: number;
};

export const STORAGE_KEY = "musculit.v1";
export const SYNC_META_KEY = "musculit.v1.sync";

export const initialState: AppState = {
  user: {
    name: "Martin Bundy",
    age: 26,
    heightM: 1.74,
    weightLb: 150,
    goal: "Recomposicion corporal: subir musculo poco a poco, verte mas marcado y sostener consistencia real.",
    gym: "Smart Fit Panama",
    experience: "Primer ciclo serio entrenando por cuenta propia.",
  },
  preferences: {
    showDetails: false,
    soundEnabled: false,
    calendarView: "month",
    weightUnit: "lb",
  },
  sessions: {},
  dayOverrides: {},
  habitCompletions: {},
  inBodyReadings: [],
  nutritionLogs: {},
};

export function getLatestInBodyReading(state: AppState): InBodyReading | null {
  if (!state.inBodyReadings.length) return null;
  return [...state.inBodyReadings].sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function getNutritionLogForDate(state: AppState, isoDate: string): NutritionSelection {
  return state.nutritionLogs[isoDate] ?? { mealChoices: {}, extrasSelected: [] };
}

// dayId "canonico" usado cuando un dia se marca como descanso puntual por un
// override semanal, sin importar de que dia de la semana vino originalmente.
export const OVERRIDE_REST_DAY_ID: DayId = "monday";

export function createEmptySession(
  date: string,
  dayId: DayId,
  weightUnit: "lb" | "kg" = "lb",
): SessionRecord {
  return {
    date,
    dayId,
    completedExerciseIds: [],
    completedCardio: false,
    journal: "",
    setWeights: {},
    weightUnit,
    closedAt: null,
  };
}

export function getLocalDateParts(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return { year, month, day };
}

export function toIsoDate(date: Date) {
  const { year, month, day } = getLocalDateParts(date);
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getDayIdFromDate(date: Date, overrides: DayOverrides = {}): DayId {
  return overrides[toIsoDate(date)] ?? weekdayToDayId(date.getDay());
}

function getBaseTrainingDay(date: Date, overrides: DayOverrides): TrainingDay {
  return getDayById(getDayIdFromDate(date, overrides));
}

// El Perfect Split ya no tiene un finisher de core dinamico: el abdomen vive
// fijo dentro de la rutina del Jueves (Crunch en maquina + Leg raises), como
// cualquier otro ejercicio. getTrainingDayFromDate sigue siendo el punto de
// entrada unico para resolver los ejercicios de una fecha (respeta overrides).
export function getTrainingDayFromDate(date: Date, overrides: DayOverrides = {}): TrainingDay {
  return getBaseTrainingDay(date, overrides);
}

export function getSessionForDate(state: AppState, isoDate: string) {
  const date = fromIsoDate(isoDate);
  const dayId = getDayIdFromDate(date, state.dayOverrides);
  return (
    state.sessions[isoDate] ?? createEmptySession(isoDate, dayId, state.preferences.weightUnit)
  );
}

export function getTrackableItemCount(day: TrainingDay) {
  if (day.type === "rest") {
    return 0;
  }
  return day.exercises.length + 1;
}

export function getCompletionRatio(day: TrainingDay, session: SessionRecord) {
  const total = getTrackableItemCount(day);
  if (!total) {
    return 0;
  }
  const completed = session.completedExerciseIds.length + (session.completedCardio ? 1 : 0);
  return completed / total;
}

export function getCompletionPercent(day: TrainingDay, session: SessionRecord) {
  return Math.round(getCompletionRatio(day, session) * 100);
}

export function getSessionStatus(day: TrainingDay, session: SessionRecord) {
  if (day.type === "rest") {
    return "rest";
  }
  const percent = getCompletionPercent(day, session);
  if (percent >= 100) {
    return "complete";
  }
  if (percent >= 50) {
    return "partial";
  }
  if (percent > 0) {
    return "started";
  }
  return "pending";
}

export function getXpForSession(day: TrainingDay, session: SessionRecord) {
  if (day.type === "rest") {
    return 0;
  }
  const ratio = getCompletionRatio(day, session);
  if (ratio >= 1) {
    return 300;
  }
  if (ratio >= 0.75) {
    return 210;
  }
  if (ratio >= 0.5) {
    return 120;
  }
  if (ratio >= 0.25) {
    return 60;
  }
  // Sin penalizacion bajo 25%: registrar poco es mejor que no registrar nada.
  return 0;
}

export function getLevelFromXp(totalXp: number) {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  let cost = 100;

  while (remaining >= cost) {
    remaining -= cost;
    level += 1;
    cost = level * 100;
  }

  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: cost,
  };
}

export function getDerivedStats(state: AppState, todayIso: string): DerivedStats {
  const sortedDates = Object.keys(state.sessions).sort();
  let totalXp = 0;
  let completedDays = 0;
  let scheduledDaysSeen = 0;

  for (const iso of sortedDates) {
    const day = getTrainingDayFromDate(fromIsoDate(iso), state.dayOverrides);
    const session = state.sessions[iso];
    totalXp += getXpForSession(day, session);
    if (day.type === "training") {
      scheduledDaysSeen += 1;
      if (getCompletionPercent(day, session) >= 50) {
        completedDays += 1;
      }
    }
  }

  totalXp += getHabitXp(state);

  const { level, currentLevelXp, nextLevelXp } = getLevelFromXp(totalXp);
  const streak = getCurrentStreak(state, todayIso);
  const fullCompletionStreak = getCurrentFullCompletionStreak(state, todayIso);
  const maxStreak = getMaxStreak(state);

  const weekDates = getWeekDates(fromIsoDate(todayIso));
  let thisWeekScheduled = 0;
  let thisWeekCompleted = 0;

  for (const date of weekDates) {
    const day = getTrainingDayFromDate(date, state.dayOverrides);
    if (day.type === "training") {
      thisWeekScheduled += 1;
      const iso = toIsoDate(date);
      const session = state.sessions[iso];
      if (session && getCompletionPercent(day, session) >= 50) {
        thisWeekCompleted += 1;
      }
    }
  }

  return {
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp,
    streak,
    fullCompletionStreak,
    maxStreak,
    completedDays,
    scheduledDaysSeen,
    consistency: scheduledDaysSeen ? Math.round((completedDays / scheduledDaysSeen) * 100) : 0,
    thisWeekCompleted,
    thisWeekScheduled,
  };
}

export function getCurrentStreak(state: AppState, todayIso: string) {
  let cursor = fromIsoDate(todayIso);
  let streak = 0;

  for (let guard = 0; guard < 366; guard += 1) {
    const day = getTrainingDayFromDate(cursor, state.dayOverrides);
    if (day.type === "rest") {
      cursor = shiftDate(cursor, -1);
      continue;
    }

    const iso = toIsoDate(cursor);
    const session = state.sessions[iso];

    if (session && getCompletionPercent(day, session) >= 50) {
      streak += 1;
      cursor = shiftDate(cursor, -1);
      continue;
    }

    break;
  }

  return streak;
}

export function getCurrentFullCompletionStreak(state: AppState, todayIso: string) {
  let cursor = fromIsoDate(todayIso);
  let streak = 0;

  for (let guard = 0; guard < 366; guard += 1) {
    const day = getTrainingDayFromDate(cursor, state.dayOverrides);
    if (day.type === "rest") {
      cursor = shiftDate(cursor, -1);
      continue;
    }

    const iso = toIsoDate(cursor);
    const session = state.sessions[iso];

    if (session && getCompletionPercent(day, session) >= 100) {
      streak += 1;
      cursor = shiftDate(cursor, -1);
      continue;
    }

    break;
  }

  return streak;
}

export function getMaxStreak(state: AppState) {
  const dates = Object.keys(state.sessions).sort();
  if (!dates.length) {
    return 0;
  }

  let best = 0;
  for (const iso of dates) {
    const streak = getCurrentStreak(state, iso);
    best = Math.max(best, streak);
  }
  return best;
}

export function getWeekDates(date: Date) {
  const mondayOffset = (date.getDay() + 6) % 7;
  const monday = shiftDate(date, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => shiftDate(monday, index));
}

export function shiftDate(date: Date, amount: number) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
}

export function getMonthMatrix(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const startDate = shiftDate(monthStart, -startOffset);
  const totalCells = Math.ceil((startOffset + monthEnd.getDate()) / 7) * 7;
  return Array.from({ length: totalCells }, (_, index) => shiftDate(startDate, index));
}

export function getYearMonths(date: Date) {
  return Array.from({ length: 12 }, (_, index) => new Date(date.getFullYear(), index, 1));
}

export function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-PA", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortLabel(date: Date) {
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "short",
    day: "numeric",
  }).format(date);
}

export function getNextTrainingDays(fromDate: Date, count = 3, overrides: DayOverrides = {}) {
  const result: TrainingDay[] = [];
  let cursor = shiftDate(fromDate, 1);

  while (result.length < count) {
    const day = getTrainingDayFromDate(cursor, overrides);
    if (day.type === "training") {
      result.push(day);
    }
    cursor = shiftDate(cursor, 1);
  }

  return result;
}

/**
 * Marca un set de fechas ISO, dentro de la semana de `weekStart`, como descanso
 * puntual. A diferencia del sistema anterior, no reacomoda el resto de la semana:
 * el Perfect Split tiene un tipo de sesion distinto y con un orden pensado a
 * proposito para cada dia (ej. el miercoles de piernas separa a proposito los
 * dos dias de espalda por 48h), asi que ciclar automaticamente otras rutinas
 * sobre los dias libres rompería esa logica. Solo se salta la sesion de ese dia.
 */
export function markRestDays(weekStart: Date, restIsoDates: Set<string>): DayOverrides {
  const overrides: DayOverrides = {};
  for (const date of getWeekDates(weekStart)) {
    const iso = toIsoDate(date);
    if (restIsoDates.has(iso)) {
      overrides[iso] = OVERRIDE_REST_DAY_ID;
    }
  }
  return overrides;
}

export function getHabitPeriodKey(date: Date, cadence: HabitCadence): string {
  if (cadence === "daily") {
    return toIsoDate(date);
  }
  if (cadence === "weekly") {
    return toIsoDate(getWeekDates(date)[0]);
  }
  const { year, month } = getLocalDateParts(date);
  return `${year}-${month}`;
}

export function getHabitsByCadence(cadence: HabitCadence): Habit[] {
  return habits.filter((habit) => habit.cadence === cadence);
}

export function getHabitXp(state: AppState): number {
  let total = 0;
  for (const ids of Object.values(state.habitCompletions)) {
    for (const id of ids) {
      const habit = habits.find((item) => item.id === id);
      if (habit) total += habit.xp;
    }
  }
  return total;
}

export function getStatusTone(status: string) {
  if (status === "complete") {
    return "var(--status-good)";
  }
  if (status === "partial") {
    return "var(--status-warn)";
  }
  if (status === "started") {
    return "var(--status-soft)";
  }
  if (status === "rest") {
    return "var(--status-rest)";
  }
  return "transparent";
}

export function listTrainingDays() {
  return weeklySplit.filter((day) => day.type === "training");
}

export { dayOrder };
export type { DayId };
