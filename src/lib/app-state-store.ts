import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { hasDatabaseConnection } from "@/lib/database-env";
import { prisma } from "@/lib/prisma";
import {
  AppState,
  DayId,
  DayOverrides,
  SessionRecord,
  createEmptySession,
  fromIsoDate,
  getDayIdFromDate,
  getTrainingDayFromDate,
  initialState,
  toIsoDate,
} from "@/lib/musculit-state";
import { inferSetCount, normalizeSetWeights } from "@/lib/set-utils";

const DEV_STORE_PATH = path.join(process.cwd(), ".musculit-dev-store.json");
const USER_SLUG = "martin-bundy";

export type StorageMode = "database" | "local-fallback";

export async function loadPersistedAppState() {
  if (hasDatabaseConnection()) {
    try {
      const state = await loadFromDatabase();
      return { state, storageMode: "database" as const };
    } catch {
      const state = await loadFromFile();
      return { state, storageMode: "local-fallback" as const };
    }
  }

  const state = await loadFromFile();
  return { state, storageMode: "local-fallback" as const };
}

export async function savePersistedAppState(state: AppState) {
  const normalized = normalizeAppState(state);

  if (hasDatabaseConnection()) {
    try {
      await saveToDatabase(normalized);
      return { storageMode: "database" as const };
    } catch {
      await saveToFile(normalized);
      return { storageMode: "local-fallback" as const };
    }
  }

  await saveToFile(normalized);
  return { storageMode: "local-fallback" as const };
}

async function loadFromFile() {
  try {
    const raw = await fs.readFile(DEV_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return normalizeAppState({
      user: { ...initialState.user, ...(parsed.user ?? {}) },
      preferences: {
        ...initialState.preferences,
        ...(parsed.preferences ?? {}),
      },
      sessions: parsed.sessions ?? {},
      dayOverrides: parsed.dayOverrides ?? {},
      habitCompletions: parsed.habitCompletions ?? {},
    });
  } catch {
    return initialState;
  }
}

async function saveToFile(state: AppState) {
  await fs.writeFile(DEV_STORE_PATH, JSON.stringify(state, null, 2), "utf8");
}

async function loadFromDatabase() {
  const user = await prisma.userProfile.upsert({
    where: { slug: USER_SLUG },
    update: {},
    create: {
      slug: USER_SLUG,
      name: initialState.user.name,
      age: initialState.user.age,
      heightM: initialState.user.heightM,
      weightLb: initialState.user.weightLb,
      goal: initialState.user.goal,
      gym: initialState.user.gym,
      experience: initialState.user.experience,
      showDetails: initialState.preferences.showDetails,
      soundEnabled: initialState.preferences.soundEnabled,
      calendarView: initialState.preferences.calendarView,
      weightUnit: initialState.preferences.weightUnit,
      dayOverrides: JSON.stringify(initialState.dayOverrides),
      habitCompletions: JSON.stringify(initialState.habitCompletions),
    },
    include: {
      sessions: {
        include: {
          exercises: {
            include: {
              sets: {
                orderBy: { setIndex: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sessionDate: "asc" },
      },
    },
  });

  const sessions: Record<string, SessionRecord> = {};

  for (const session of user.sessions) {
    const isoDate = toIsoDate(session.sessionDate);
    sessions[isoDate] = {
      date: isoDate,
      dayId: session.dayId as DayId,
      completedExerciseIds: session.exercises
        .filter((exercise) => exercise.completed)
        .map((exercise) => exercise.exerciseId),
      completedCardio: session.completedCardio,
      journal: session.journal,
      setWeights: Object.fromEntries(
        session.exercises.map((exercise) => [
          exercise.exerciseId,
          exercise.sets.map((entry) => entry.weightUsed),
        ]),
      ),
      closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    };
  }

  return normalizeAppState({
    user: {
      name: user.name,
      age: user.age,
      heightM: user.heightM,
      weightLb: user.weightLb,
      goal: user.goal,
      gym: user.gym,
      experience: user.experience,
    },
    preferences: {
      showDetails: user.showDetails,
      soundEnabled: user.soundEnabled,
      calendarView: normalizeCalendarView(user.calendarView),
      weightUnit: normalizeWeightUnit(user.weightUnit),
    },
    sessions,
    dayOverrides: normalizeDayOverrides(user.dayOverrides),
    habitCompletions: normalizeHabitCompletions(user.habitCompletions),
  });
}

async function saveToDatabase(state: AppState) {
  const user = await prisma.userProfile.upsert({
    where: { slug: USER_SLUG },
    update: {
      name: state.user.name,
      age: state.user.age,
      heightM: state.user.heightM,
      weightLb: state.user.weightLb,
      goal: state.user.goal,
      gym: state.user.gym,
      experience: state.user.experience,
      showDetails: state.preferences.showDetails,
      soundEnabled: state.preferences.soundEnabled,
      calendarView: state.preferences.calendarView,
      weightUnit: state.preferences.weightUnit,
      dayOverrides: JSON.stringify(state.dayOverrides),
      habitCompletions: JSON.stringify(state.habitCompletions),
    },
    create: {
      slug: USER_SLUG,
      name: state.user.name,
      age: state.user.age,
      heightM: state.user.heightM,
      weightLb: state.user.weightLb,
      goal: state.user.goal,
      gym: state.user.gym,
      experience: state.user.experience,
      showDetails: state.preferences.showDetails,
      soundEnabled: state.preferences.soundEnabled,
      calendarView: state.preferences.calendarView,
      weightUnit: state.preferences.weightUnit,
      dayOverrides: JSON.stringify(state.dayOverrides),
      habitCompletions: JSON.stringify(state.habitCompletions),
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.sessionExerciseSet.deleteMany({
      where: {
        sessionExercise: {
          workout: { userId: user.id },
        },
      },
    });
    await tx.sessionExercise.deleteMany({
      where: {
        workout: { userId: user.id },
      },
    });
    await tx.workoutSession.deleteMany({
      where: { userId: user.id },
    });

    const orderedDates = Object.keys(state.sessions).sort();

    for (const isoDate of orderedDates) {
      const session = normalizeSessionRecord(state.sessions[isoDate], isoDate, state.dayOverrides);
      const day = getTrainingDayFromDate(fromIsoDate(isoDate), state.dayOverrides);
      const workout = await tx.workoutSession.create({
        data: {
          userId: user.id,
          sessionDate: fromIsoDate(isoDate),
          dayId: session.dayId,
          completedCardio: session.completedCardio,
          journal: session.journal,
          closedAt: session.closedAt ? new Date(session.closedAt) : null,
        },
      });

      for (const [index, exercise] of day.exercises.entries()) {
        const setWeights = normalizeWeightArray(
          session.setWeights[exercise.id],
          inferSetCount(exercise.sets),
        );
        const exerciseRow = await tx.sessionExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            groupName: exercise.group,
            sortOrder: index,
            completed: session.completedExerciseIds.includes(exercise.id),
          },
        });

        if (setWeights.length) {
          await tx.sessionExerciseSet.createMany({
            data: setWeights.map((weightUsed, setIndex) => ({
              sessionExerciseId: exerciseRow.id,
              setIndex,
              targetLabel: exercise.sets,
              weightUsed,
            })),
          });
        }
      }
    }
  });
}

function normalizeAppState(state: AppState): AppState {
  const normalizedSessions: Record<string, SessionRecord> = {};

  const overridesForNormalization = state.dayOverrides ?? {};

  for (const [isoDate, rawSession] of Object.entries(state.sessions ?? {})) {
    normalizedSessions[isoDate] = normalizeSessionRecord(rawSession, isoDate, overridesForNormalization);
  }

  return {
    user: {
      ...initialState.user,
      ...state.user,
    },
    preferences: {
      ...initialState.preferences,
      ...state.preferences,
    },
    sessions: normalizedSessions,
    dayOverrides: { ...initialState.dayOverrides, ...(state.dayOverrides ?? {}) },
    habitCompletions: { ...initialState.habitCompletions, ...(state.habitCompletions ?? {}) },
  };
}

function normalizeSessionRecord(
  raw: Partial<SessionRecord>,
  isoDate: string,
  overrides: DayOverrides = {},
): SessionRecord {
  const date = fromIsoDate(isoDate);
  const dayId = (raw.dayId as DayId | undefined) ?? getDayIdFromDate(date, overrides);
  const base = createEmptySession(isoDate, dayId);
  const day = getTrainingDayFromDate(date, overrides);

  const setWeights = Object.fromEntries(
    day.exercises.map((exercise) => [
      exercise.id,
      normalizeWeightArray(
        normalizeSetWeights(raw.setWeights?.[exercise.id]),
        inferSetCount(exercise.sets),
      ),
    ]),
  );

  return {
    ...base,
    ...raw,
    date: isoDate,
    dayId,
    completedExerciseIds: Array.isArray(raw.completedExerciseIds)
      ? raw.completedExerciseIds.filter((id): id is string => typeof id === "string")
      : [],
    completedCardio: Boolean(raw.completedCardio),
    journal: typeof raw.journal === "string" ? raw.journal : "",
    setWeights,
    closedAt: typeof raw.closedAt === "string" ? raw.closedAt : null,
  };
}

function normalizeWeightArray(weights: string[], setCount: number) {
  return Array.from({ length: setCount }, (_, index) => weights[index] ?? "");
}

function normalizeCalendarView(value: string) {
  if (value === "day" || value === "week" || value === "month" || value === "year") {
    return value;
  }

  return initialState.preferences.calendarView;
}

function normalizeWeightUnit(value: unknown): "lb" | "kg" {
  if (value === "lb" || value === "kg") return value;
  return initialState.preferences.weightUnit;
}

function normalizeDayOverrides(value: unknown): AppState["dayOverrides"] {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const result: AppState["dayOverrides"] = {};
    for (const [isoDate, dayId] of Object.entries(parsed)) {
      if (typeof dayId === "string") {
        result[isoDate] = dayId as DayId;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function normalizeHabitCompletions(value: unknown): AppState["habitCompletions"] {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const result: AppState["habitCompletions"] = {};
    for (const [periodKey, ids] of Object.entries(parsed)) {
      if (Array.isArray(ids)) {
        result[periodKey] = ids.filter((id): id is string => typeof id === "string");
      }
    }
    return result;
  } catch {
    return {};
  }
}
