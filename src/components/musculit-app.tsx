"use client";

import { useEffect, useRef, useState } from "react";
import { getTrainingDayFromDate } from "@/lib/musculit-state";
import {
  AppState,
  DayId,
  STORAGE_KEY,
  SYNC_META_KEY,
  fromIsoDate,
  formatDisplayDate,
  getCompletionPercent,
  getDayIdFromDate,
  getDerivedStats,
  getHabitPeriodKey,
  getNextTrainingDays,
  getSessionForDate,
  getXpForSession,
  getCurrentStreak,
  initialState,
  toIsoDate,
} from "@/lib/musculit-state";
import { inferSetCount, normalizeSetWeights, convertWeight } from "@/lib/set-utils";
import { SEEDED_INBODY_READING } from "@/lib/inbody-data";
import { HabitCadence } from "@/lib/habits-data";
import { TodayTab } from "@/components/musculit/today-tab";
import { HistoryTab } from "@/components/musculit/history-tab";
import { BodyTab } from "@/components/musculit/body-tab";
import { KitchenTab } from "@/components/musculit/kitchen-tab";
import { ProfileTab } from "@/components/musculit/profile-tab";
import { CoachTab } from "@/components/musculit/coach-tab";

type TabId = "today" | "history" | "body" | "kitchen" | "profile" | "coach";

type Celebration = {
  title: string;
  body: string;
};

const tabs: { id: TabId; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "history", label: "Historial" },
  { id: "body", label: "Cuerpo" },
  { id: "kitchen", label: "Cocina" },
  { id: "profile", label: "Perfil" },
  { id: "coach", label: "Coach" },
];

export function MusculitApp() {
  const today = new Date();
  const todayIso = toIsoDate(today);

  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [storageMode, setStorageMode] = useState<"checking" | "database" | "local-fallback">(
    "checking",
  );
  const [remoteReady, setRemoteReady] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    writeSyncMeta({ lastLocalWriteAt: Date.now() });
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteState() {
      try {
        const response = await fetch("/api/app-state", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as {
          state: AppState;
          storageMode: "database" | "local-fallback";
        };
        if (cancelled) return;

        const meta = readSyncMeta();
        const hasUnsyncedLocalChanges = meta.lastLocalWriteAt > meta.lastConfirmedSyncAt;

        if (hasUnsyncedLocalChanges) {
          // El estado local es mas reciente que el ultimo guardado confirmado en DB
          // (ej. Safari mato la pestana antes de que el guardado disparara). No lo pisamos.
          setStorageMode(payload.storageMode);
          void persistState(stateRef.current, { keepalive: false }).catch(() => {});
        } else {
          setState(normalizeLoadedState(payload.state));
          setStorageMode(payload.storageMode);
        }
      } catch {
        if (!cancelled) setStorageMode("local-fallback");
      } finally {
        if (!cancelled) setRemoteReady(true);
      }
    }

    void loadRemoteState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!remoteReady) return;

    const timeout = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        const payload = await persistState(state);
        setStorageMode(payload.storageMode);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [state, remoteReady]);

  useEffect(() => {
    function flushOnHide() {
      if (document.visibilityState !== "hidden") return;
      void persistState(stateRef.current, { keepalive: true }).catch(() => {});
    }

    function flushOnPageHide() {
      void persistState(stateRef.current, { keepalive: true }).catch(() => {});
    }

    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushOnPageHide);

    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushOnPageHide);
    };
  }, []);

  const todayDay = getTrainingDayFromDate(today, state.dayOverrides);
  const todaySession = getSessionForDate(state, todayIso);
  const todayPercent = getCompletionPercent(todayDay, todaySession);
  const stats = getDerivedStats(state, todayIso);
  const nextTrainingDays = getNextTrainingDays(today, 3, state.dayOverrides);

  function updateTodaySession(
    updater: (current: ReturnType<typeof getSessionForDate>) => ReturnType<typeof getSessionForDate>,
  ) {
    setState((current) => {
      const base = getSessionForDate(current, todayIso);
      const next = updater(base);
      return { ...current, sessions: { ...current.sessions, [todayIso]: next } };
    });
  }

  function toggleExercise(exerciseId: string) {
    if (todayDay.type === "rest") return;
    updateTodaySession((session) => {
      const alreadyDone = session.completedExerciseIds.includes(exerciseId);
      return {
        ...session,
        completedExerciseIds: alreadyDone
          ? session.completedExerciseIds.filter((id) => id !== exerciseId)
          : [...session.completedExerciseIds, exerciseId],
      };
    });
  }

  function updateSetWeight(exerciseId: string, setIndex: number, value: string) {
    if (todayDay.type === "rest") return;
    updateTodaySession((session) => {
      const currentWeights = session.setWeights[exerciseId] ?? [];
      const nextWeights = [...currentWeights];
      nextWeights[setIndex] = value;
      return { ...session, setWeights: { ...session.setWeights, [exerciseId]: nextWeights } };
    });
  }

  function setJournal(value: string) {
    if (todayDay.type === "rest") return;
    updateTodaySession((session) => ({ ...session, journal: value }));
  }

  function toggleCardio() {
    if (todayDay.type === "rest") return;
    updateTodaySession((session) => ({ ...session, completedCardio: !session.completedCardio }));
  }

  function toggleHabit(habitId: string, cadence: HabitCadence) {
    const periodKey = getHabitPeriodKey(today, cadence);
    setState((current) => {
      const existing = new Set(current.habitCompletions[periodKey] ?? []);
      if (existing.has(habitId)) {
        existing.delete(habitId);
      } else {
        existing.add(habitId);
      }
      return {
        ...current,
        habitCompletions: { ...current.habitCompletions, [periodKey]: Array.from(existing) },
      };
    });
  }

  function closeSession() {
    if (todayDay.type === "rest") return;
    const percent = getCompletionPercent(todayDay, todaySession);
    const xp = getXpForSession(todayDay, todaySession);

    updateTodaySession((session) => ({ ...session, closedAt: new Date().toISOString() }));

    const nextStreak = getCurrentStreak(
      {
        ...state,
        sessions: {
          ...state.sessions,
          [todayIso]: { ...todaySession, closedAt: new Date().toISOString() },
        },
      },
      todayIso,
    );

    setCelebration({
      title: percent >= 100 ? "Sesion al 100%" : percent >= 50 ? "Sesion guardada" : "Anotado",
      body: `${percent}% completado · ${xp} XP · Racha ${nextStreak}`,
    });
  }

  function switchWeightUnit(newUnit: "lb" | "kg") {
    const currentUnit = state.preferences.weightUnit;
    if (newUnit === currentUnit) return;
    updateTodaySession((session) => {
      const convertedWeights = Object.fromEntries(
        Object.entries(session.setWeights).map(([exerciseId, weights]) => [
          exerciseId,
          (weights as string[]).map((w) => convertWeight(w, currentUnit, newUnit) || w),
        ]),
      );
      return { ...session, setWeights: convertedWeights, weightUnit: newUnit };
    });
    setState((current) => ({
      ...current,
      preferences: { ...current.preferences, weightUnit: newUnit },
    }));
  }

  function updateUserField<K extends keyof AppState["user"]>(field: K, value: AppState["user"][K]) {
    setState((current) => ({
      ...current,
      user: { ...current.user, [field]: value },
    }));
  }

  function resetAllData() {
    // Las mediciones de InBody son historial biometrico, no datos de entreno —
    // "Reiniciar datos" borra sesiones/habitos/nutricion pero las preserva.
    setState((current) => ({ ...initialState, inBodyReadings: current.inBodyReadings }));
    setCelebration({ title: "Datos reiniciados", body: "La app volvio al estado base." });
  }

  const isCardioDay = todayDay.type === "training" && todayDay.cardioOnly;
  const isTrainingDay = todayDay.type === "training" && !todayDay.cardioOnly;

  return (
    <main className="relative min-h-screen bg-[var(--page-background)] text-[var(--ink-strong)] [overscroll-behavior-y:contain]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(247,127,0,0.12),_transparent_30%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-[calc(5.5rem+var(--safe-bottom))] pt-[calc(1.25rem+var(--safe-top))]">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--ink-soft)]">Musculit.O</p>
          <div className="flex items-center gap-2">
            {saveState === "saving" && (
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                guardando
              </span>
            )}
            {saveState === "saved" && (
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--status-good)]">
                guardado
              </span>
            )}
            <p className="text-xs text-[var(--ink-soft)] capitalize">{formatDisplayDate(today)}</p>
          </div>
        </header>

        {/* Celebration */}
        {celebration ? (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-[var(--ember-soft)] bg-[rgba(245,121,32,0.12)] px-4 py-3">
            <div>
              <p className="text-sm font-medium">{celebration.title}</p>
              <p className="text-xs text-[var(--ink-soft)]">{celebration.body}</p>
            </div>
            <button
              type="button"
              onClick={() => setCelebration(null)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--ink-soft)]"
            >
              Ok
            </button>
          </div>
        ) : null}

        {activeTab === "today" ? (
          <TodayTab
            state={state}
            today={today}
            todayDay={todayDay}
            todaySession={todaySession}
            todayPercent={todayPercent}
            stats={stats}
            nextTrainingDays={nextTrainingDays}
            isCardioDay={Boolean(isCardioDay)}
            isTrainingDay={Boolean(isTrainingDay)}
            onToggleExercise={toggleExercise}
            onUpdateSetWeight={updateSetWeight}
            onSetJournal={setJournal}
            onToggleCardio={toggleCardio}
            onToggleHabit={toggleHabit}
            onCloseSession={closeSession}
            onSwitchWeightUnit={switchWeightUnit}
          />
        ) : null}

        {activeTab === "history" ? <HistoryTab state={state} today={today} todayIso={todayIso} /> : null}

        {activeTab === "body" ? <BodyTab state={state} setState={setState} /> : null}

        {activeTab === "kitchen" ? <KitchenTab state={state} setState={setState} todayIso={todayIso} /> : null}

        {activeTab === "profile" ? (
          <ProfileTab
            state={state}
            setState={setState}
            stats={stats}
            today={today}
            storageMode={storageMode}
            onUpdateUserField={updateUserField}
            onResetAllData={resetAllData}
          />
        ) : null}

        {activeTab === "coach" ? <CoachTab /> : null}
      </div>

      {/* Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line-soft)] bg-[rgba(11,10,10,0.9)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-6 gap-1 px-2 pb-[calc(0.75rem+var(--safe-bottom))] pt-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-11 rounded-2xl px-0.5 py-3 text-center text-[9.5px] uppercase leading-tight tracking-[0.03em] transition sm:text-[11px] sm:tracking-[0.1em] ${
                activeTab === tab.id ? "bg-[var(--ember)] text-white" : "text-[var(--ink-soft)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

type SyncMeta = {
  lastLocalWriteAt: number;
  lastConfirmedSyncAt: number;
};

function readSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return { lastLocalWriteAt: 0, lastConfirmedSyncAt: 0 };
    return JSON.parse(raw) as SyncMeta;
  } catch {
    return { lastLocalWriteAt: 0, lastConfirmedSyncAt: 0 };
  }
}

function writeSyncMeta(patch: Partial<SyncMeta>) {
  const current = readSyncMeta();
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...current, ...patch }));
}

async function persistState(state: AppState, options?: { keepalive?: boolean }) {
  const response = await fetch("/api/app-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
    keepalive: options?.keepalive ?? false,
  });
  if (!response.ok) throw new Error();
  const payload = (await response.json()) as {
    ok: boolean;
    storageMode: "database" | "local-fallback";
  };
  writeSyncMeta({ lastConfirmedSyncAt: Date.now() });
  return payload;
}

function loadInitialState() {
  if (typeof window === "undefined") return initialState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...initialState, inBodyReadings: [SEEDED_INBODY_READING] };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return normalizeLoadedState({
      user: { ...initialState.user, ...(parsed.user ?? {}) },
      preferences: { ...initialState.preferences, ...(parsed.preferences ?? {}) },
      sessions: parsed.sessions ?? {},
      dayOverrides: parsed.dayOverrides ?? {},
      habitCompletions: parsed.habitCompletions ?? {},
      inBodyReadings: parsed.inBodyReadings?.length ? parsed.inBodyReadings : [SEEDED_INBODY_READING],
      nutritionLogs: parsed.nutritionLogs ?? {},
    });
  } catch {
    return { ...initialState, inBodyReadings: [SEEDED_INBODY_READING] };
  }
}

function normalizeLoadedState(raw: AppState) {
  const dayOverrides = raw.dayOverrides ?? {};
  const preferences = { ...initialState.preferences, ...(raw.preferences ?? {}) };
  const normalizedSessions = Object.fromEntries(
    Object.entries(raw.sessions ?? {}).map(([isoDate, session]) => {
      const dayId = (session?.dayId as DayId | undefined) ?? getDayIdFromDate(fromIsoDate(isoDate), dayOverrides);
      const day = getTrainingDayFromDate(fromIsoDate(isoDate), dayOverrides);

      const setWeights = Object.fromEntries(
        day.exercises.map((exercise) => [
          exercise.id,
          Array.from(
            { length: inferSetCount(exercise.sets) },
            (_, setIndex) => normalizeSetWeights(session?.setWeights?.[exercise.id])[setIndex] ?? "",
          ),
        ]),
      );

      const weightUnit =
        session?.weightUnit === "lb" || session?.weightUnit === "kg"
          ? session.weightUnit
          : preferences.weightUnit;

      return [
        isoDate,
        {
          ...session,
          date: isoDate,
          dayId,
          setWeights,
          weightUnit,
        },
      ];
    }),
  );

  return {
    user: { ...initialState.user, ...(raw.user ?? {}) },
    preferences,
    sessions: normalizedSessions,
    dayOverrides,
    habitCompletions: raw.habitCompletions ?? {},
    inBodyReadings: raw.inBodyReadings?.length ? raw.inBodyReadings : [SEEDED_INBODY_READING],
    nutritionLogs: raw.nutritionLogs ?? {},
  } satisfies AppState;
}
