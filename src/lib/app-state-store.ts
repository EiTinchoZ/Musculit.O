import "server-only";

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { hasDatabaseConnection } from "@/lib/database-env";
import { prisma } from "@/lib/prisma";
import {
  AppState,
  DayId,
  DayOverrides,
  InBodyReading,
  NutritionSelection,
  ProgressCheckin,
  SessionRecord,
  createEmptySession,
  fromIsoDate,
  getDayIdFromDate,
  getTrainingDayFromDate,
  initialState,
  toIsoDate,
} from "@/lib/musculit-state";
import { SEEDED_INBODY_READING } from "@/lib/inbody-data";
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
      inBodyReadings: parsed.inBodyReadings ?? [],
      nutritionLogs: parsed.nutritionLogs ?? {},
      progressCheckins: parsed.progressCheckins ?? [],
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
      inBodyReadings: { orderBy: { date: "asc" } },
      nutritionLogs: { orderBy: { date: "asc" } },
      progressCheckins: { include: { photos: true }, orderBy: { date: "asc" } },
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
      weightUnit: normalizeWeightUnit(session.weightUnit),
      closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    };
  }

  const inBodyReadings: InBodyReading[] = user.inBodyReadings.map((row) => ({
    id: row.id,
    date: toIsoDate(row.date),
    weightKg: row.weightKg,
    imc: row.imc,
    bodyFatPercent: row.bodyFatPercent,
    fatMassKg: row.fatMassKg,
    leanMassKg: row.leanMassKg,
    skeletalMuscleKg: row.skeletalMuscleKg,
    bodyWaterL: row.bodyWaterL,
    visceralFat: row.visceralFat,
    bmr: row.bmr,
    appendicularIndex: row.appendicularIndex,
    idealWeightKg: row.idealWeightKg,
    weightControlKg: row.weightControlKg,
    fatControlKg: row.fatControlKg,
    leanControlKg: row.leanControlKg,
    segmental: {
      lean: { armR: row.leanArmR, armL: row.leanArmL, trunk: row.leanTrunk, legR: row.leanLegR, legL: row.leanLegL },
      fat: { armR: row.fatArmR, armL: row.fatArmL, trunk: row.fatTrunk, legR: row.fatLegR, legL: row.fatLegL },
    },
  }));

  const nutritionLogs: Record<string, NutritionSelection> = {};
  for (const row of user.nutritionLogs) {
    nutritionLogs[toIsoDate(row.date)] = {
      mealChoices: normalizeMealChoices(row.mealChoices),
      extrasSelected: normalizeExtrasSelected(row.extrasSelected),
    };
  }

  const progressCheckins: ProgressCheckin[] = user.progressCheckins.map((row) => ({
    id: row.id,
    date: toIsoDate(row.date),
    weightKg: row.weightKg,
    photos: row.photos.map((photo) => ({
      angle: photo.angle as ProgressCheckin["photos"][number]["angle"],
      imageData: photo.imageData,
    })),
  }));

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
    inBodyReadings,
    nutritionLogs,
    progressCheckins,
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
    // Solo se reescriben las sesiones cuyo contenido cambio de verdad (comparando
    // contra `contentHash`), en vez de borrar y recrear todo el historial en cada
    // autosave. Con meses de sesiones esto evita miles de escrituras redundantes.
    const existingSessions = await tx.workoutSession.findMany({
      where: { userId: user.id },
      select: { id: true, sessionDate: true, contentHash: true },
    });
    const existingByIso = new Map(
      existingSessions.map((row) => [toIsoDate(row.sessionDate), row]),
    );

    const incomingIsoDates = new Set(Object.keys(state.sessions));
    const staleIds = existingSessions
      .filter((row) => !incomingIsoDates.has(toIsoDate(row.sessionDate)))
      .map((row) => row.id);
    if (staleIds.length) {
      await tx.workoutSession.deleteMany({ where: { id: { in: staleIds } } });
    }

    const orderedDates = Object.keys(state.sessions).sort();

    for (const isoDate of orderedDates) {
      const session = normalizeSessionRecord(
        state.sessions[isoDate],
        isoDate,
        state.dayOverrides,
        state.preferences.weightUnit,
      );
      const contentHash = computeSessionContentHash(session);
      const existingRow = existingByIso.get(isoDate);

      if (existingRow && existingRow.contentHash === contentHash) {
        continue;
      }

      const day = getTrainingDayFromDate(fromIsoDate(isoDate), state.dayOverrides);
      const workout = await tx.workoutSession.upsert({
        where: { userId_sessionDate: { userId: user.id, sessionDate: fromIsoDate(isoDate) } },
        update: {
          dayId: session.dayId,
          completedCardio: session.completedCardio,
          journal: session.journal,
          weightUnit: session.weightUnit,
          closedAt: session.closedAt ? new Date(session.closedAt) : null,
          contentHash,
        },
        create: {
          userId: user.id,
          sessionDate: fromIsoDate(isoDate),
          dayId: session.dayId,
          completedCardio: session.completedCardio,
          journal: session.journal,
          weightUnit: session.weightUnit,
          closedAt: session.closedAt ? new Date(session.closedAt) : null,
          contentHash,
        },
      });

      // Esta sesion si cambio: se reescriben solo sus propios ejercicios/sets
      // (barato, es una sola sesion), no los del resto del historial.
      await tx.sessionExercise.deleteMany({ where: { workoutId: workout.id } });

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

    // InBody: coleccion chica (unas pocas mediciones en total). Diff completo
    // sin necesidad de hash de contenido, cada fila es plana y sin hijos.
    const existingReadings = await tx.inBodyReading.findMany({
      where: { userId: user.id },
      select: { id: true, date: true },
    });
    const incomingReadingIsoDates = new Set(state.inBodyReadings.map((reading) => reading.date));
    const staleReadingIds = existingReadings
      .filter((row) => !incomingReadingIsoDates.has(toIsoDate(row.date)))
      .map((row) => row.id);
    if (staleReadingIds.length) {
      await tx.inBodyReading.deleteMany({ where: { id: { in: staleReadingIds } } });
    }
    for (const reading of state.inBodyReadings) {
      const row = inBodyReadingRow(reading);
      await tx.inBodyReading.upsert({
        where: { userId_date: { userId: user.id, date: fromIsoDate(reading.date) } },
        update: row,
        create: { userId: user.id, date: fromIsoDate(reading.date), ...row },
      });
    }

    // Nutricion: filas planas, pero pueden crecer dia a dia como las sesiones
    // — solo se reescribe la fecha cuyo contenido cambio de verdad.
    const existingLogs = await tx.nutritionLog.findMany({
      where: { userId: user.id },
      select: { id: true, date: true, mealChoices: true, extrasSelected: true },
    });
    const existingLogsByIso = new Map(existingLogs.map((row) => [toIsoDate(row.date), row]));
    const incomingLogIsoDates = new Set(Object.keys(state.nutritionLogs));
    const staleLogIds = existingLogs
      .filter((row) => !incomingLogIsoDates.has(toIsoDate(row.date)))
      .map((row) => row.id);
    if (staleLogIds.length) {
      await tx.nutritionLog.deleteMany({ where: { id: { in: staleLogIds } } });
    }
    for (const [isoDate, selection] of Object.entries(state.nutritionLogs)) {
      const mealChoices = JSON.stringify(selection.mealChoices);
      const extrasSelected = JSON.stringify([...selection.extrasSelected].sort());
      const existingRow = existingLogsByIso.get(isoDate);
      if (existingRow && existingRow.mealChoices === mealChoices && existingRow.extrasSelected === extrasSelected) {
        continue;
      }
      await tx.nutritionLog.upsert({
        where: { userId_date: { userId: user.id, date: fromIsoDate(isoDate) } },
        update: { mealChoices, extrasSelected },
        create: { userId: user.id, date: fromIsoDate(isoDate), mealChoices, extrasSelected },
      });
    }

    // Chequeos de progreso: mismo patron que WorkoutSession — las fotos
    // (base64, varios cientos de KB cada una) solo se reescriben si el
    // contenido del chequeo cambio de verdad, para no resubirlas en cada
    // autosave disparado por un cambio en cualquier otra parte del estado.
    const existingCheckins = await tx.progressCheckin.findMany({
      where: { userId: user.id },
      select: { id: true, date: true, contentHash: true },
    });
    const existingCheckinsByIso = new Map(existingCheckins.map((row) => [toIsoDate(row.date), row]));
    const incomingCheckinIsoDates = new Set(state.progressCheckins.map((checkin) => checkin.date));
    const staleCheckinIds = existingCheckins
      .filter((row) => !incomingCheckinIsoDates.has(toIsoDate(row.date)))
      .map((row) => row.id);
    if (staleCheckinIds.length) {
      await tx.progressCheckin.deleteMany({ where: { id: { in: staleCheckinIds } } });
    }
    for (const checkin of state.progressCheckins) {
      const contentHash = computeCheckinContentHash(checkin);
      const existingRow = existingCheckinsByIso.get(checkin.date);
      if (existingRow && existingRow.contentHash === contentHash) {
        continue;
      }
      const row = await tx.progressCheckin.upsert({
        where: { userId_date: { userId: user.id, date: fromIsoDate(checkin.date) } },
        update: { weightKg: checkin.weightKg, contentHash },
        create: { userId: user.id, date: fromIsoDate(checkin.date), weightKg: checkin.weightKg, contentHash },
      });
      await tx.progressPhoto.deleteMany({ where: { checkinId: row.id } });
      if (checkin.photos.length) {
        await tx.progressPhoto.createMany({
          data: checkin.photos.map((photo) => ({
            checkinId: row.id,
            angle: photo.angle,
            imageData: photo.imageData,
          })),
        });
      }
    }
  });
}

function computeCheckinContentHash(checkin: ProgressCheckin): string {
  const canonical = {
    weightKg: checkin.weightKg,
    photos: [...checkin.photos].sort((a, b) => a.angle.localeCompare(b.angle)),
  };
  return createHash("sha1").update(JSON.stringify(canonical)).digest("hex");
}

function inBodyReadingRow(reading: InBodyReading) {
  return {
    weightKg: reading.weightKg,
    imc: reading.imc,
    bodyFatPercent: reading.bodyFatPercent,
    fatMassKg: reading.fatMassKg,
    leanMassKg: reading.leanMassKg,
    skeletalMuscleKg: reading.skeletalMuscleKg,
    bodyWaterL: reading.bodyWaterL,
    visceralFat: reading.visceralFat,
    bmr: reading.bmr,
    appendicularIndex: reading.appendicularIndex,
    idealWeightKg: reading.idealWeightKg,
    weightControlKg: reading.weightControlKg,
    fatControlKg: reading.fatControlKg,
    leanControlKg: reading.leanControlKg,
    leanArmR: reading.segmental.lean.armR,
    leanArmL: reading.segmental.lean.armL,
    leanTrunk: reading.segmental.lean.trunk,
    leanLegR: reading.segmental.lean.legR,
    leanLegL: reading.segmental.lean.legL,
    fatArmR: reading.segmental.fat.armR,
    fatArmL: reading.segmental.fat.armL,
    fatTrunk: reading.segmental.fat.trunk,
    fatLegR: reading.segmental.fat.legR,
    fatLegL: reading.segmental.fat.legL,
  };
}

function computeSessionContentHash(session: SessionRecord): string {
  const canonical = {
    dayId: session.dayId,
    completedCardio: session.completedCardio,
    journal: session.journal,
    weightUnit: session.weightUnit,
    closedAt: session.closedAt,
    completedExerciseIds: [...session.completedExerciseIds].sort(),
    setWeights: Object.fromEntries(
      Object.entries(session.setWeights).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  return createHash("sha1").update(JSON.stringify(canonical)).digest("hex");
}

function normalizeAppState(state: AppState): AppState {
  const preferences = { ...initialState.preferences, ...state.preferences };
  const normalizedSessions: Record<string, SessionRecord> = {};

  const overridesForNormalization = state.dayOverrides ?? {};

  for (const [isoDate, rawSession] of Object.entries(state.sessions ?? {})) {
    normalizedSessions[isoDate] = normalizeSessionRecord(
      rawSession,
      isoDate,
      overridesForNormalization,
      preferences.weightUnit,
    );
  }

  const inBodyReadings = state.inBodyReadings?.length ? state.inBodyReadings : [SEEDED_INBODY_READING];

  return {
    user: {
      ...initialState.user,
      ...state.user,
    },
    preferences,
    sessions: normalizedSessions,
    dayOverrides: { ...initialState.dayOverrides, ...(state.dayOverrides ?? {}) },
    habitCompletions: { ...initialState.habitCompletions, ...(state.habitCompletions ?? {}) },
    inBodyReadings,
    nutritionLogs: { ...initialState.nutritionLogs, ...(state.nutritionLogs ?? {}) },
    progressCheckins: state.progressCheckins ?? [],
  };
}

function normalizeSessionRecord(
  raw: Partial<SessionRecord>,
  isoDate: string,
  overrides: DayOverrides = {},
  fallbackWeightUnit: "lb" | "kg" = "lb",
): SessionRecord {
  const date = fromIsoDate(isoDate);
  const dayId = (raw.dayId as DayId | undefined) ?? getDayIdFromDate(date, overrides);
  const base = createEmptySession(isoDate, dayId, fallbackWeightUnit);
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
    weightUnit: normalizeWeightUnit(raw.weightUnit ?? fallbackWeightUnit),
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

function normalizeMealChoices(value: unknown): NutritionSelection["mealChoices"] {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const result: NutritionSelection["mealChoices"] = {};
    for (const [mealId, optionIndex] of Object.entries(parsed)) {
      if (typeof optionIndex === "number") {
        result[mealId] = optionIndex;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function normalizeExtrasSelected(value: unknown): NutritionSelection["extrasSelected"] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}
