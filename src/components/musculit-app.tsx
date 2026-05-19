"use client";

import { useEffect, useRef, useState } from "react";
import { getDayById, weeklySplit } from "@/lib/routine-data";
import {
  AppState,
  DayId,
  STORAGE_KEY,
  formatDisplayDate,
  formatMonthLabel,
  fromIsoDate,
  getCompletionPercent,
  getCurrentStreak,
  getDayIdFromDate,
  getDerivedStats,
  getMonthMatrix,
  getNextTrainingDays,
  getSessionForDate,
  getSessionStatus,
  getStatusTone,
  getTrackableItemCount,
  getTrainingDayFromDate,
  getWeekDates,
  getXpForSession,
  initialState,
  shiftDate,
  toIsoDate,
} from "@/lib/musculit-state";
import { inferSetCount, normalizeSetWeights } from "@/lib/set-utils";

type TabId = "today" | "history" | "profile";

type Celebration = {
  title: string;
  body: string;
};

const tabs: { id: TabId; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "history", label: "Historial" },
  { id: "profile", label: "Perfil" },
];

export function MusculitApp() {
  const today = new Date();
  const todayIso = toIsoDate(today);

  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [historyDate, setHistoryDate] = useState(todayIso);
  const [historyCursor, setHistoryCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [storageMode, setStorageMode] = useState<"checking" | "database" | "local-fallback">(
    "checking",
  );
  const [remoteReady, setRemoteReady] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [restSecondsLeft, setRestSecondsLeft] = useState(120);
  const [restRunning, setRestRunning] = useState(false);
  const [restLabel, setRestLabel] = useState("Descanso entre sets");
  const [timerBurst, setTimerBurst] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
        setState(normalizeLoadedState(payload.state));
        setStorageMode(payload.storageMode);
      } catch {
        if (!cancelled) setStorageMode("local-fallback");
      } finally {
        if (!cancelled) setRemoteReady(true);
      }
    }

    void loadRemoteState();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!remoteReady) return;

    const timeout = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        const response = await fetch("/api/app-state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as {
          ok: boolean;
          storageMode: "database" | "local-fallback";
        };
        setStorageMode(payload.storageMode);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [state, remoteReady]);

  useEffect(() => {
    if (!timerBurst) return;
    const timeout = window.setTimeout(() => setTimerBurst(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [timerBurst]);

  useEffect(() => {
    if (!restRunning) return;

    const interval = window.setInterval(() => {
      setRestSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setRestRunning(false);
          setTimerBurst(true);
          playTimerSound(audioContextRef);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [restRunning]);

  const todayDay = getTrainingDayFromDate(today);
  const todaySession = getSessionForDate(state, todayIso);
  const todayPercent = getCompletionPercent(todayDay, todaySession);
  const stats = getDerivedStats(state, todayIso);
  const nextTrainingDays = getNextTrainingDays(today, 3);

  function updateTodaySession(
    updater: (
      current: ReturnType<typeof getSessionForDate>,
    ) => ReturnType<typeof getSessionForDate>,
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

  function startRestTimer(label = "Descanso entre sets") {
    primeAudio(audioContextRef);
    setRestLabel(label);
    setRestSecondsLeft(120);
    setRestRunning(true);
    setTimerBurst(false);
  }

  function toggleRestTimer() {
    if (!restRunning && restSecondsLeft === 0) {
      startRestTimer(restLabel);
      return;
    }
    if (!restRunning) primeAudio(audioContextRef);
    setRestRunning((current) => !current);
  }

  function resetRestTimer() {
    setRestRunning(false);
    setRestSecondsLeft(120);
    setRestLabel("Descanso entre sets");
    setTimerBurst(false);
  }

  function convertWeight(value: string, from: "lb" | "kg", to: "lb" | "kg"): string {
    if (from === to) return "";
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return "";
    const converted = from === "lb" ? num * 0.453592 : num * 2.20462;
    return String(Math.round(converted * 10) / 10);
  }

  function switchWeightUnit(newUnit: "lb" | "kg") {
    const currentUnit = state.preferences.weightUnit;
    if (newUnit === currentUnit) return;
    updateTodaySession((session) => {
      const convertedWeights = Object.fromEntries(
        Object.entries(session.setWeights).map(([exerciseId, weights]) => [
          exerciseId,
          (weights as string[]).map((w) => {
            const num = parseFloat(w);
            if (isNaN(num) || w === "") return w;
            const converted = currentUnit === "lb" ? num * 0.453592 : num * 2.20462;
            return String(Math.round(converted * 10) / 10);
          }),
        ]),
      );
      return { ...session, setWeights: convertedWeights };
    });
    setState((current) => ({
      ...current,
      preferences: { ...current.preferences, weightUnit: newUnit },
    }));
  }

  function updateUserField<K extends keyof AppState["user"]>(
    field: K,
    value: AppState["user"][K],
  ) {
    setState((current) => ({
      ...current,
      user: { ...current.user, [field]: value },
    }));
  }

  function resetAllData() {
    setState(initialState);
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
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--ink-soft)]">
            Musculit.O
          </p>
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
            <p className="text-xs text-[var(--ink-soft)] capitalize">
              {formatDisplayDate(today)}
            </p>
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

        {/* Tab: Hoy */}
        {activeTab === "today" ? (
          <section className="flex flex-col gap-4">

            {/* Card principal del día */}
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--ink-soft)]">
                    {todayDay.label}
                    {todayDay.companion !== "Solo" && todayDay.companion !== "Libre"
                      ? ` · ${todayDay.companion}`
                      : ""}
                  </p>
                  <h2 className="mt-1 font-serif text-[clamp(2.4rem,10vw,3.6rem)] leading-none">
                    {todayDay.focus}
                  </h2>
                </div>
                {todayDay.type === "training" && (
                  <div className="text-right">
                    <p className="font-serif text-3xl">{todayPercent}%</p>
                    <p className="text-xs text-[var(--ink-soft)]">completado</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--ink-soft)]">
                <span>Racha {stats.streak}</span>
                <span>·</span>
                <span>Semana {stats.thisWeekCompleted}/{stats.thisWeekScheduled}</span>
                <span>·</span>
                <span>Nivel {stats.level}</span>
              </div>

              {todayDay.type === "training" && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--ember),var(--brass))]"
                    style={{ width: `${todayPercent}%` }}
                  />
                </div>
              )}
            </div>

            {/* Dia de descanso */}
            {todayDay.type === "rest" ? (
              <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
                <p className="text-sm leading-7 text-[var(--ink-soft)]">{todayDay.notes}</p>
                <div className="mt-4 grid gap-2">
                  {nextTrainingDays.map((day) => (
                    <div
                      key={day.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3"
                    >
                      <p className="text-sm text-[var(--ink-soft)]">{day.label}</p>
                      <p className="text-sm font-medium">{day.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Dia de cardio puro (Viernes) */}
            {isCardioDay ? (
              <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
                <p className="text-sm leading-7 text-[var(--ink-soft)]">{todayDay.notes}</p>
                <button
                  type="button"
                  onClick={toggleCardio}
                  className={`mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                    todaySession.completedCardio
                      ? "border-[var(--status-good)] bg-[rgba(69,179,114,0.12)]"
                      : "border-[var(--line-soft)] bg-[var(--panel-strong)]"
                  }`}
                >
                  <div>
                    <p className="font-medium">Escaladora</p>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">{todayDay.cardio}</p>
                  </div>
                  <span className="text-lg">
                    {todaySession.completedCardio ? "✓" : "○"}
                  </span>
                </button>

                {todaySession.completedCardio && (
                  <button
                    type="button"
                    onClick={closeSession}
                    className="mt-4 w-full rounded-full bg-[var(--ember)] py-3 text-sm font-medium text-white"
                  >
                    Guardar sesion
                  </button>
                )}
              </div>
            ) : null}

            {/* Dia de entrenamiento con ejercicios */}
            {isTrainingDay ? (
              <>
                {/* Timer */}
                <div
                  className={`rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-4 ${timerBurst ? "timer-burst" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                        {restLabel}
                      </p>
                      <p className="mt-1 font-serif text-4xl leading-none">
                        {formatSeconds(restSecondsLeft)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startRestTimer()}
                        className="rounded-full bg-[var(--ember)] px-4 py-2 text-sm font-medium text-white"
                      >
                        2:00
                      </button>
                      <button
                        type="button"
                        onClick={toggleRestTimer}
                        className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-2 text-sm text-[var(--ink-soft)]"
                      >
                        {restRunning ? "Pausar" : "Seguir"}
                      </button>
                      <button
                        type="button"
                        onClick={resetRestTimer}
                        className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-2 text-sm text-[var(--ink-soft)]"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toggle de unidad + ejercicios */}
                <div className="flex items-center justify-between rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                    Unidad de peso
                  </p>
                  <div className="flex gap-1">
                    {(["lb", "kg"] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => switchWeightUnit(unit)}
                        className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.16em] transition ${
                          state.preferences.weightUnit === unit
                            ? "bg-[var(--ember)] text-white"
                            : "border border-[var(--line-soft)] text-[var(--ink-soft)]"
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {todayDay.exercises.map((exercise) => {
                    const checked = todaySession.completedExerciseIds.includes(exercise.id);
                    const setCount = inferSetCount(exercise.sets);
                    const setWeights = normalizeSetWeights(todaySession.setWeights[exercise.id]);
                    const unit = state.preferences.weightUnit;
                    const otherUnit = unit === "lb" ? "kg" : "lb";

                    return (
                      <div
                        key={exercise.id}
                        className={`rounded-2xl border bg-[var(--panel-strong)] p-4 transition ${
                          checked ? "border-[var(--status-good)]" : "border-[var(--line-soft)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleExercise(exercise.id)}
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg transition ${
                              checked
                                ? "border-[var(--status-good)] bg-[rgba(69,179,114,0.16)] text-[var(--status-good)]"
                                : "border-[var(--line-soft)] text-[var(--ink-soft)]"
                            }`}
                          >
                            {checked ? "✓" : "○"}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{exercise.name}</p>
                            <p className="text-xs text-[var(--ink-soft)]">{exercise.group}</p>
                          </div>
                          <p className="shrink-0 font-mono text-sm text-[var(--ink-soft)]">
                            {exercise.sets}
                          </p>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {Array.from({ length: setCount }, (_, setIndex) => {
                            const raw = setWeights[setIndex] ?? "";
                            const converted = convertWeight(raw, unit, otherUnit);
                            return (
                              <div key={`${exercise.id}-s${setIndex}`} className="flex flex-col gap-1">
                                <p className="text-center text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                                  Set {setIndex + 1}
                                </p>
                                <div className="flex items-center gap-1 rounded-lg border border-[var(--line-soft)] bg-[var(--panel)] px-2 py-2 focus-within:border-[var(--ember)]">
                                  <input
                                    value={raw}
                                    onChange={(e) => updateSetWeight(exercise.id, setIndex, e.target.value)}
                                    placeholder="0"
                                    inputMode="decimal"
                                    className="min-w-0 flex-1 bg-transparent text-center text-sm text-[var(--ink-strong)] outline-none placeholder:text-[var(--ink-soft)]"
                                  />
                                  <span className="shrink-0 text-[11px] text-[var(--ink-soft)]">
                                    {unit}
                                  </span>
                                </div>
                                {converted !== "" && (
                                  <p className="text-center text-[10px] text-[var(--ink-soft)]">
                                    ≈ {converted} {otherUnit}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => startRestTimer(`${exercise.name} · S${setIndex + 1}`)}
                                  className="rounded-lg border border-[rgba(255,181,72,0.2)] bg-[rgba(199,100,45,0.08)] py-1 text-[10px] uppercase tracking-[0.14em] text-[#ffd39e]"
                                >
                                  Timer
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cardio y cierre */}
                <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
                  <button
                    type="button"
                    onClick={toggleCardio}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      todaySession.completedCardio
                        ? "border-[var(--status-good)] bg-[rgba(69,179,114,0.12)]"
                        : "border-[var(--line-soft)] bg-[var(--panel-strong)]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">Cardio final</p>
                      <p className="text-xs text-[var(--ink-soft)]">{todayDay.cardio}</p>
                    </div>
                    <span>{todaySession.completedCardio ? "✓" : "○"}</span>
                  </button>

                  <label className="mt-4 grid gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                      Journal
                    </span>
                    <textarea
                      value={todaySession.journal}
                      onChange={(e) => setJournal(e.target.value)}
                      rows={4}
                      placeholder="Como te sentiste, que peso te costo, energia, molestias..."
                      className="rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm leading-7 text-[var(--ink-strong)] outline-none transition placeholder:text-[var(--ink-soft)] focus:border-[var(--ember)]"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={closeSession}
                    className="mt-4 w-full rounded-full bg-[var(--ember)] py-3 text-sm font-medium text-white transition hover:bg-[var(--ember-strong)]"
                  >
                    Guardar sesion · {todayPercent}%
                  </button>
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {/* Tab: Historial */}
        {activeTab === "history" ? (
          <section className="flex flex-col gap-4">
            {/* Semana actual */}
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">
                Esta semana
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {getWeekDates(today).map((date) => {
                  const day = getTrainingDayFromDate(date);
                  const iso = toIsoDate(date);
                  const session = getSessionForDate(state, iso);
                  const status = getSessionStatus(day, session);
                  const isToday = iso === todayIso;
                  const isSelected = iso === historyDate;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setHistoryDate(iso)}
                      className={`rounded-xl border py-2 text-center transition ${
                        isSelected
                          ? "border-[var(--ember)] bg-[var(--panel-highlight)]"
                          : isToday
                            ? "border-[var(--ember-soft)] bg-[var(--panel-strong)]"
                            : "border-[var(--line-soft)] bg-[var(--panel-strong)]"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        {day.shortLabel}
                      </p>
                      <div
                        className="mx-auto mt-2 h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: getStatusTone(status) || "rgba(255,255,255,0.06)",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendario mensual */}
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setHistoryCursor(
                      new Date(historyCursor.getFullYear(), historyCursor.getMonth() - 1, 1),
                    )
                  }
                  className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--ink-soft)]"
                >
                  ←
                </button>
                <p className="font-serif text-xl capitalize">{formatMonthLabel(historyCursor)}</p>
                <button
                  type="button"
                  onClick={() =>
                    setHistoryCursor(
                      new Date(historyCursor.getFullYear(), historyCursor.getMonth() + 1, 1),
                    )
                  }
                  className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--ink-soft)]"
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {["L", "M", "X", "J", "V", "S", "D"].map((label) => (
                  <p
                    key={label}
                    className="pb-1 text-center text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"
                  >
                    {label}
                  </p>
                ))}
                {getMonthMatrix(historyCursor).map((date) => {
                  const iso = toIsoDate(date);
                  const day = getTrainingDayFromDate(date);
                  const session = getSessionForDate(state, iso);
                  const status = getSessionStatus(day, session);
                  const isCurrentMonth = date.getMonth() === historyCursor.getMonth();
                  const isSelected = iso === historyDate;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setHistoryDate(iso)}
                      className={`aspect-square rounded-lg border transition ${
                        isSelected
                          ? "border-[var(--ember)] bg-[var(--panel-highlight)]"
                          : "border-transparent bg-[var(--panel-strong)]"
                      } ${isCurrentMonth ? "opacity-100" : "opacity-25"}`}
                    >
                      <p className="text-center text-xs">{date.getDate()}</p>
                      <div
                        className="mx-auto mt-1 h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: getStatusTone(status) || "transparent",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dia seleccionado */}
            <HistoryDayView state={state} isoDate={historyDate} />
          </section>
        ) : null}

        {/* Tab: Perfil */}
        {activeTab === "profile" ? (
          <section className="flex flex-col gap-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Racha" value={`${stats.streak}`} hint={`Max ${stats.maxStreak}`} />
              <StatCard label="Nivel" value={`${stats.level}`} hint={`${stats.totalXp} XP`} />
              <StatCard
                label="Consistencia"
                value={`${stats.consistency}%`}
                hint={`${stats.completedDays} sesiones`}
              />
              <StatCard
                label="Esta semana"
                value={`${stats.thisWeekCompleted}/${stats.thisWeekScheduled}`}
                hint="dias completados"
              />
            </div>

            {/* Progreso de cargas */}
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">
                Progreso de cargas
              </p>
              <div className="mt-4 grid gap-3">
                {getExerciseProgressSummaries(state).length ? (
                  getExerciseProgressSummaries(state)
                    .slice(0, 6)
                    .map((item) => (
                      <div
                        key={item.key}
                        className="rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-[var(--ink-soft)]">{item.latestDate}</p>
                        </div>
                        <p className="mt-1 text-xs text-[var(--ink-soft)]">{item.deltaLabel}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-[var(--ink-soft)]">
                    Cuando registres pesos por set, el progreso aparecera aqui.
                  </p>
                )}
              </div>
            </div>

            {/* Datos personales */}
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">
                Perfil
              </p>
              <div className="mt-4 grid gap-3">
                <ProfileField
                  label="Nombre"
                  value={state.user.name}
                  onChange={(v) => updateUserField("name", v)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <ProfileField
                    label="Peso (lb)"
                    value={String(state.user.weightLb)}
                    onChange={(v) => updateUserField("weightLb", Number(v) || 0)}
                  />
                  <ProfileField
                    label="Altura (m)"
                    value={String(state.user.heightM)}
                    onChange={(v) => updateUserField("heightM", Number(v) || 0)}
                  />
                </div>
                <ProfileField
                  label="Gym"
                  value={state.user.gym}
                  onChange={(v) => updateUserField("gym", v)}
                />
              </div>
            </div>

            {/* Sistema */}
            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">
                Sistema
              </p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-[var(--ink-soft)]">Guardado</span>
                <span className="capitalize">
                  {storageMode === "database"
                    ? "base de datos"
                    : storageMode === "checking"
                      ? "verificando"
                      : "local"}
                </span>
              </div>
              <button
                type="button"
                onClick={resetAllData}
                className="mt-4 w-full rounded-full border border-[rgba(255,95,87,0.4)] bg-[rgba(255,95,87,0.08)] py-3 text-sm text-[var(--danger)] transition hover:bg-[rgba(255,95,87,0.14)]"
              >
                Reiniciar datos
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {/* Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line-soft)] bg-[rgba(11,10,10,0.9)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2 px-4 pb-[calc(0.75rem+var(--safe-bottom))] pt-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-3 py-3 text-center text-sm uppercase tracking-[0.18em] transition ${
                activeTab === tab.id
                  ? "bg-[var(--ember)] text-white"
                  : "text-[var(--ink-soft)]"
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

function HistoryDayView({
  state,
  isoDate,
}: {
  state: AppState;
  isoDate: string;
}) {
  const date = fromIsoDate(isoDate);
  const day = getTrainingDayFromDate(date);
  const session = getSessionForDate(state, isoDate);
  const percent = getCompletionPercent(day, session);
  const status = getSessionStatus(day, session);

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            {formatDisplayDate(date)}
          </p>
          <p className="mt-1 font-serif text-2xl">{day.focus}</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]"
          style={{
            backgroundColor: getStatusTone(status),
            color: status === "pending" ? "var(--ink-soft)" : "white",
          }}
        >
          {statusLabel(status)}
        </span>
      </div>

      {day.type === "training" && (
        <div className="mt-4 grid gap-2">
          {day.exercises.map((exercise) => {
            const done = session.completedExerciseIds.includes(exercise.id);
            const weights = normalizeSetWeights(session.setWeights?.[exercise.id]).filter(Boolean);
            return (
              <div
                key={exercise.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className={done ? "text-[var(--status-good)]" : "text-[var(--ink-soft)]"}>
                    {done ? "✓" : "○"}
                  </span>
                  <p className="text-sm">{exercise.name}</p>
                </div>
                {weights.length > 0 && (
                  <p className="text-xs text-[var(--ink-soft)]">{weights.join(" · ")}</p>
                )}
              </div>
            );
          })}
          {percent > 0 && (
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              {percent}% completado
              {session.journal ? ` · "${session.journal.slice(0, 60)}${session.journal.length > 60 ? "..." : ""}"` : ""}
            </p>
          )}
        </div>
      )}

      {day.type === "rest" && (
        <p className="mt-3 text-sm text-[var(--ink-soft)]">Dia de descanso.</p>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      <p className="mt-1 text-xs text-[var(--ink-soft)]">{hint}</p>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--ember)]"
      />
    </label>
  );
}

function statusLabel(status: string) {
  if (status === "complete") return "Completo";
  if (status === "partial") return "Parcial";
  if (status === "started") return "Empezado";
  if (status === "rest") return "Descanso";
  return "Pendiente";
}

function loadInitialState() {
  if (typeof window === "undefined") return initialState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return normalizeLoadedState({
      user: { ...initialState.user, ...(parsed.user ?? {}) },
      preferences: { ...initialState.preferences, ...(parsed.preferences ?? {}) },
      sessions: parsed.sessions ?? {},
    });
  } catch {
    return initialState;
  }
}

function normalizeLoadedState(raw: AppState) {
  const normalizedSessions = Object.fromEntries(
    Object.entries(raw.sessions ?? {}).map(([isoDate, session]) => {
      const dayId = ((session?.dayId as DayId | undefined) ?? getDayIdFromDate(fromIsoDate(isoDate)));
      const day = getDayById(dayId);

      const setWeights = Object.fromEntries(
        day.exercises.map((exercise) => [
          exercise.id,
          (() => {
            const rawValue = session?.setWeights?.[exercise.id];
            return Array.from(
              { length: inferSetCount(exercise.sets) },
              (_, setIndex) => normalizeSetWeights(rawValue)[setIndex] ?? "",
            );
          })(),
        ]),
      );

      return [
        isoDate,
        {
          ...session,
          date: isoDate,
          dayId,
          setWeights,
        },
      ];
    }),
  );

  return {
    user: { ...initialState.user, ...(raw.user ?? {}) },
    preferences: { ...initialState.preferences, ...(raw.preferences ?? {}) },
    sessions: normalizedSessions,
  } satisfies AppState;
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function primeAudio(audioContextRef: { current: AudioContext | null }) {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  if (!audioContextRef.current) {
    audioContextRef.current = new window.AudioContext();
  }
  void audioContextRef.current.resume();
}

function playTimerSound(audioContextRef: { current: AudioContext | null }) {
  const context = audioContextRef.current;
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.35);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.42);
}

function getExerciseProgressSummaries(state: AppState) {
  const uniqueExercises = new Map<string, { name: string; group: string }>();

  for (const day of weeklySplit) {
    if (day.type !== "training") continue;
    for (const exercise of day.exercises) {
      const key = `${exercise.name}__${exercise.group}`;
      if (!uniqueExercises.has(key)) {
        uniqueExercises.set(key, { name: exercise.name, group: exercise.group });
      }
    }
  }

  const summaries: Array<{
    key: string;
    name: string;
    group: string;
    latestDate: string;
    latestWeights: string;
    deltaLabel: string;
  }> = [];

  for (const [key, exerciseMeta] of uniqueExercises.entries()) {
    const entries = Object.entries(state.sessions)
      .map(([isoDate, session]) => {
        const day = getDayById(session.dayId);
        const matchingExercise = day.exercises.find(
          (exercise) =>
            exercise.name === exerciseMeta.name && exercise.group === exerciseMeta.group,
        );
        if (!matchingExercise) return null;
        return {
          isoDate,
          weights: normalizeSetWeights(session.setWeights?.[matchingExercise.id]).filter(Boolean),
        };
      })
      .filter((entry): entry is { isoDate: string; weights: string[] } => Boolean(entry))
      .filter((entry) => entry.weights.length > 0)
      .sort((a, b) => b.isoDate.localeCompare(a.isoDate));

    if (!entries.length) continue;

    const latest = entries[0];
    const previous = entries[1];
    summaries.push({
      key,
      name: exerciseMeta.name,
      group: exerciseMeta.group,
      latestDate: latest.isoDate,
      latestWeights: latest.weights.join(" · "),
      deltaLabel: previous
        ? buildDeltaLabel(latest.weights, previous.weights)
        : "Primer registro",
    });
  }

  return summaries.sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

function buildDeltaLabel(latest: string[], previous: string[]) {
  const latestAvg = averageNumericWeight(latest);
  const previousAvg = averageNumericWeight(previous);

  if (latestAvg === null || previousAvg === null) return `Antes: ${previous.join(" · ")}`;

  const delta = Number((latestAvg - previousAvg).toFixed(1));
  if (delta > 0) return `+${delta} lb promedio`;
  if (delta < 0) return `${delta} lb promedio`;
  return "Misma carga";
}

function averageNumericWeight(weights: string[]) {
  const values = weights
    .map((w) => {
      const match = w.match(/-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : null;
    })
    .filter((v): v is number => v !== null && Number.isFinite(v));

  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
