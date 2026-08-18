import { describe, expect, it } from "vitest";
import {
  AppState,
  computeWeekReflow,
  createEmptySession,
  fromIsoDate,
  getCurrentStreak,
  getDerivedStats,
  getHabitPeriodKey,
  getLevelFromXp,
  getTrainingDayFromDate,
  getXpForSession,
  initialState,
} from "./musculit-state";
import { getDayById } from "./routine-data";

function buildState(sessions: AppState["sessions"] = {}, dayOverrides: AppState["dayOverrides"] = {}): AppState {
  return { ...initialState, sessions, dayOverrides };
}

// Semana de referencia: lunes 2026-07-13 a domingo 2026-07-19.
const MONDAY = fromIsoDate("2026-07-13");

describe("getTrainingDayFromDate - horario default", () => {
  it("pone Pull el martes y Piernas el miercoles, sin finisher de core en sabado/domingo", () => {
    const tuesday = getTrainingDayFromDate(fromIsoDate("2026-07-14"));
    const wednesday = getTrainingDayFromDate(fromIsoDate("2026-07-15"));
    const saturday = getTrainingDayFromDate(fromIsoDate("2026-07-18"));
    const sunday = getTrainingDayFromDate(fromIsoDate("2026-07-19"));

    expect(tuesday.focus).toBe("Pull");
    expect(tuesday.exercises.some((e) => e.id.startsWith("cable-crunch"))).toBe(true);

    expect(wednesday.focus).toBe("Piernas");
    expect(wednesday.exercises.some((e) => e.id.startsWith("cable-crunch"))).toBe(true);

    expect(saturday.exercises.some((e) => e.id.startsWith("cable-crunch"))).toBe(false);
    expect(sunday.exercises.some((e) => e.id.startsWith("cable-crunch"))).toBe(false);
  });

  it("Lunes y Jueves son descanso por default", () => {
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-13")).type).toBe("rest");
    expect(getTrainingDayFromDate(fromIsoDate("2026-07-16")).type).toBe("rest");
  });
});

describe("computeWeekReflow - semana irregular", () => {
  it("reacomoda la secuencia cuando el descanso cae Martes y Jueves en vez de Lunes y Jueves", () => {
    const restIsoDates = new Set(["2026-07-14", "2026-07-16"]); // Martes y Jueves
    const overrides = computeWeekReflow(MONDAY, restIsoDates);

    expect(getDayById(overrides["2026-07-13"]).focus).toBe("Pull"); // Lunes -> Pull
    expect(overrides["2026-07-14"]).toBe("monday"); // Martes -> descanso (canonico)
    expect(getDayById(overrides["2026-07-15"]).focus).toBe("Piernas"); // Miercoles -> Piernas
    expect(overrides["2026-07-16"]).toBe("monday"); // Jueves -> descanso
    expect(getDayById(overrides["2026-07-17"]).focus).toBe("Cardio"); // Viernes intacto
    expect(getDayById(overrides["2026-07-18"]).focus).toBe("Push"); // Sabado intacto
    expect(getDayById(overrides["2026-07-19"]).focus).toBe("Piernas"); // Domingo intacto
  });

  it("el finisher de core sigue a la secuencia reacomodada (se mueve a Lunes y Miercoles)", () => {
    const restIsoDates = new Set(["2026-07-14", "2026-07-16"]);
    const overrides = computeWeekReflow(MONDAY, restIsoDates);

    const monday = getTrainingDayFromDate(fromIsoDate("2026-07-13"), overrides);
    const wednesday = getTrainingDayFromDate(fromIsoDate("2026-07-15"), overrides);
    const saturday = getTrainingDayFromDate(fromIsoDate("2026-07-18"), overrides);

    expect(monday.exercises.some((e) => e.id.startsWith("cable-crunch"))).toBe(true);
    expect(wednesday.exercises.some((e) => e.id.startsWith("cable-crunch"))).toBe(true);
    expect(saturday.exercises.some((e) => e.id.startsWith("cable-crunch"))).toBe(false);
  });

  it("respeta skipDayTypes: si se salta el Push de la semana, no aparece en la propuesta", () => {
    const restIsoDates = new Set(["2026-07-18"]); // Sabado (dia de Push) como descanso
    const overrides = computeWeekReflow(MONDAY, restIsoDates, new Set(["saturday"]));

    const focuses = Object.entries(overrides)
      .filter(([iso]) => iso !== "2026-07-18")
      .map(([, dayId]) => getDayById(dayId).focus);

    expect(focuses).not.toContain("Push");
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
  it("cuenta dias de entreno consecutivos con >=50% e ignora los dias de descanso", () => {
    // Martes y Miercoles son dias de finisher de core por default: hay que resolver
    // con getTrainingDayFromDate (no getDayById) para contar los ejercicios reales.
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

    // Jueves (2026-07-16) es descanso, no rompe la racha.
    expect(getCurrentStreak(state, "2026-07-16")).toBe(2);
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
