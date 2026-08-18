import { describe, expect, it } from "vitest";
import {
  AppState,
  createEmptySession,
  fromIsoDate,
  getCurrentStreak,
  getDerivedStats,
  getHabitPeriodKey,
  getLevelFromXp,
  getTrainingDayFromDate,
  getXpForSession,
  initialState,
  markRestDays,
} from "./musculit-state";
import { getDayById, weeklySplit } from "./routine-data";

function buildState(sessions: AppState["sessions"] = {}, dayOverrides: AppState["dayOverrides"] = {}): AppState {
  return { ...initialState, sessions, dayOverrides };
}

// Semana de referencia: lunes 2026-07-13 a domingo 2026-07-19.
const MONDAY = fromIsoDate("2026-07-13");

describe("getTrainingDayFromDate - Perfect Split, horario default", () => {
  it("resuelve el enfoque correcto de cada dia de la semana", () => {
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-13")).focus).toBe("Descanso"); // Lunes
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-14")).focus).toBe("Full upper"); // Martes
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-15")).focus).toBe("Piernas 1"); // Miercoles
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-16")).focus).toBe("Espalda y biceps"); // Jueves
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-17")).focus).toBe("Cardio"); // Viernes
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-18")).focus).toBe("Pecho, hombro y triceps"); // Sabado
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-19")).focus).toBe("Piernas 2"); // Domingo
  });

  it("solo el lunes es descanso; jueves ahora es dia de entreno", () => {
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-13")).type).toBe("rest");
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-16")).type).toBe("training");
  });

  it("el finisher de abdomen vive fijo en el jueves, no en otros dias", () => {
    const thursday = getTrainingDayFromDate(fromIsoDate("2026-07-16"));
    expect(thursday.exercises.some((e) => e.id === "abs-crunch-machine")).toBe(true);
    expect(thursday.exercises.some((e) => e.id === "leg-raises")).toBe(true);

    const tuesday = getTrainingDayFromDate(fromIsoDate("2026-07-14"));
    const saturday = getTrainingDayFromDate(fromIsoDate("2026-07-18"));
    expect(tuesday.exercises.some((e) => e.id === "abs-crunch-machine")).toBe(false);
    expect(saturday.exercises.some((e) => e.id === "abs-crunch-machine")).toBe(false);
  });

  it("el viernes es cardio puro, sin ejercicios de pesas", () => {
    const friday = getTrainingDayFromDate(fromIsoDate("2026-07-17"));
    expect(friday.cardioOnly).toBe(true);
    expect(friday.exercises).toHaveLength(0);
  });
});

describe("routine-data - migracion Perfect Split", () => {
  const bannedExerciseIds = [
    "romanian-deadlift",
    "bulgarian-split-squat",
    "cable-crunch",
    "abductor-machine",
    "smith-squat",
    "barbell-cable-rows",
    "upright-single-arm-rows",
    "dumbbell-shrugs",
    "reverse-machine-flyes",
    "deadlift-heels",
  ];

  it("no queda ninguna referencia a los ejercicios eliminados por el spec", () => {
    const allIds = weeklySplit.flatMap((day) => day.exercises.map((e) => e.id));
    for (const banned of bannedExerciseIds) {
      expect(allIds.some((id) => id.startsWith(banned))).toBe(false);
    }
  });

  it("no queda ninguna mencion a Cata en la data de la rutina", () => {
    const raw = JSON.stringify(weeklySplit);
    expect(raw.includes("Cata")).toBe(false);
  });

  it("smith squats solo aparece en Piernas 1 (miercoles), no en Piernas 2 (domingo)", () => {
    const wednesday = getDayById("wednesday");
    const sunday = getDayById("sunday");
    expect(wednesday.exercises.some((e) => e.id === "squats-smith")).toBe(true);
    expect(sunday.exercises.some((e) => e.id === "squats-smith")).toBe(false);
  });
});

describe("markRestDays", () => {
  it("marca solo las fechas indicadas como descanso, sin tocar el resto de la semana", () => {
    const overrides = markRestDays(MONDAY, new Set(["2026-07-14"]));
    expect(overrides["2026-07-14"]).toBe("monday");
    expect(overrides["2026-07-15"]).toBeUndefined();
    expect(Object.keys(overrides)).toHaveLength(1);
  });

  it("el override aplicado hace que getTrainingDayFromDate resuelva ese dia como descanso", () => {
    const overrides = markRestDays(MONDAY, new Set(["2026-07-14"]));
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-14"), overrides).type).toBe("rest");
    // El resto de la semana sigue igual.
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-15"), overrides).focus).toBe("Piernas 1");
  });
});

describe("getXpForSession", () => {
  const trainingDay = getDayById("tuesday");

  it("no penaliza sesiones con poco progreso (ratio > 0 y < 25%)", () => {
    const session = createEmptySession("2026-07-14", "tuesday");
    session.completedExerciseIds = [trainingDay.exercises[0].id];
    expect(getXpForSession(trainingDay, session)).toBe(0);
  });

  it("da mas XP cuanto mayor el porcentaje completado", () => {
    const full = createEmptySession("2026-07-14", "tuesday");
    full.completedExerciseIds = trainingDay.exercises.map((e) => e.id);
    full.completedCardio = true;
    expect(getXpForSession(trainingDay, full)).toBe(300);
  });

  it("no da XP en dias de descanso", () => {
    const restDay = getDayById("monday");
    const session = createEmptySession("2026-07-13", "monday");
    expect(getXpForSession(restDay, session)).toBe(0);
  });
});

describe("getLevelFromXp", () => {
  it("arranca en nivel 1 con 0 xp", () => {
    expect(getLevelFromXp(0)).toEqual({ level: 1, currentLevelXp: 0, nextLevelXp: 100 });
  });

  it("sube de nivel cuando se alcanza el costo acumulado", () => {
    expect(getLevelFromXp(100)).toEqual({ level: 2, currentLevelXp: 0, nextLevelXp: 200 });
  });
});

describe("getCurrentStreak", () => {
  it("cuenta dias de entreno consecutivos con >=50%", () => {
    const tuesday = getTrainingDayFromDate(fromIsoDate("2026-07-14"));
    const sessionTue = createEmptySession("2026-07-14", "tuesday");
    sessionTue.completedExerciseIds = tuesday.exercises.map((e) => e.id);
    sessionTue.completedCardio = true;

    const wednesday = getTrainingDayFromDate(fromIsoDate("2026-07-15"));
    const sessionWed = createEmptySession("2026-07-15", "wednesday");
    sessionWed.completedExerciseIds = wednesday.exercises
      .slice(0, Math.ceil(wednesday.exercises.length / 2))
      .map((e) => e.id);
    sessionWed.completedCardio = true;

    const state = buildState({
      "2026-07-14": sessionTue,
      "2026-07-15": sessionWed,
    });

    expect(getCurrentStreak(state, "2026-07-15")).toBe(2);
  });

  it("el lunes de descanso no rompe una racha de 6 dias de entreno seguidos", () => {
    const isoDates = ["2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"];
    const sessions: AppState["sessions"] = {};

    for (const iso of isoDates) {
      const day = getTrainingDayFromDate(fromIsoDate(iso));
      const session = createEmptySession(iso, day.id);
      session.completedExerciseIds = day.exercises.map((e) => e.id);
      session.completedCardio = true;
      sessions[iso] = session;
    }

    const state = buildState(sessions);
    // 2026-07-20 es el lunes siguiente (descanso): no rompe la racha, solo la salta.
    expect(getCurrentStreak(state, "2026-07-20")).toBe(6);
  });

  it("se corta si un dia de entreno no llego al 50%", () => {
    const tuesday = getDayById("tuesday");
    const sessionTue = createEmptySession("2026-07-14", "tuesday");
    sessionTue.completedExerciseIds = [tuesday.exercises[0].id]; // muy por debajo del 50%

    const state = buildState({ "2026-07-14": sessionTue });
    expect(getCurrentStreak(state, "2026-07-14")).toBe(0);
  });
});

describe("getHabitPeriodKey", () => {
  it("diario usa la fecha ISO", () => {
    expect(getHabitPeriodKey(fromIsoDate("2026-07-15"), "daily")).toBe("2026-07-15");
  });

  it("semanal usa el lunes ISO de esa semana", () => {
    expect(getHabitPeriodKey(fromIsoDate("2026-07-16"), "weekly")).toBe("2026-07-13");
  });

  it("mensual usa YYYY-MM", () => {
    expect(getHabitPeriodKey(fromIsoDate("2026-07-16"), "monthly")).toBe("2026-07");
  });
});

describe("getDerivedStats", () => {
  it("incluye el XP de habitos completados en el total", () => {
    const state = buildState();
    state.habitCompletions["2026-07-15"] = ["water", "steps"];
    const stats = getDerivedStats(state, "2026-07-15");
    expect(stats.totalXp).toBe(20); // water(10) + steps(10)
  });
});
