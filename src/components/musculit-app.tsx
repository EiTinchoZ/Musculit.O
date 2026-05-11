"use client";

import { useEffect, useRef, useState } from "react";
import { getDayById, weeklySplit } from "@/lib/routine-data";
import {
  AppState,
  DayId,
  STORAGE_KEY,
  formatDisplayDate,
  formatMonthLabel,
  formatShortLabel,
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
  listTrainingDays,
  shiftDate,
  toIsoDate,
  getYearMonths,
} from "@/lib/musculit-state";
import { inferSetCount, normalizeSetWeights } from "@/lib/set-utils";

type TabId = "home" | "tracker" | "calendar" | "profile" | "settings";

type Celebration = {
  title: string;
  body: string;
};

const tabs: { id: TabId; label: string; short: string }[] = [
  { id: "home", label: "Home", short: "Inicio" },
  { id: "tracker", label: "Tracker", short: "Hoy" },
  { id: "calendar", label: "Calendar", short: "Calendario" },
  { id: "profile", label: "Profile", short: "Perfil" },
  { id: "settings", label: "Settings", short: "Ajustes" },
];

export function MusculitApp() {
  const today = new Date();
  const todayIso = toIsoDate(today);

  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [calendarCursor, setCalendarCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [flameBurst, setFlameBurst] = useState(false);
  const [storageMode, setStorageMode] = useState<"checking" | "database" | "local-fallback">("checking");
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
        if (!response.ok) {
          throw new Error("No se pudo leer el estado remoto");
        }
        const payload = (await response.json()) as {
          state: AppState;
          storageMode: "database" | "local-fallback";
        };

        if (cancelled) {
          return;
        }

        setState(normalizeLoadedState(payload.state));
        setStorageMode(payload.storageMode);
      } catch {
        if (!cancelled) {
          setStorageMode("local-fallback");
        }
      } finally {
        if (!cancelled) {
          setRemoteReady(true);
        }
      }
    }

    void loadRemoteState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!remoteReady) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        const response = await fetch("/api/app-state", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(state),
        });

        if (!response.ok) {
          throw new Error("No se pudo guardar el estado");
        }

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
    if (!flameBurst) {
      return;
    }
    const timeout = window.setTimeout(() => setFlameBurst(false), 900);
    return () => window.clearTimeout(timeout);
  }, [flameBurst]);

  useEffect(() => {
    if (!timerBurst) {
      return;
    }
    const timeout = window.setTimeout(() => setTimerBurst(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [timerBurst]);

  useEffect(() => {
    if (!restRunning) {
      return;
    }

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

  const selectedDateObject = fromIsoDate(selectedDate);
  const selectedDay = getTrainingDayFromDate(selectedDateObject);
  const selectedSession = getSessionForDate(state, selectedDate);
  const selectedPercent = getCompletionPercent(selectedDay, selectedSession);
  const selectedXp = getXpForSession(selectedDay, selectedSession);
  const selectedStatus = getSessionStatus(selectedDay, selectedSession);
  const stats = getDerivedStats(state, todayIso);
  const todayDay = getTrainingDayFromDate(today);
  const todaySession = getSessionForDate(state, todayIso);
  const todayPercent = getCompletionPercent(todayDay, todaySession);
  const nextTrainingDays = getNextTrainingDays(today, 3);
  const isFutureSelected = selectedDate > todayIso;
  const weeklyDates = getWeekDates(selectedDateObject);
  const exerciseProgress = getExerciseProgressSummaries(state);
  const showFlame = stats.fullCompletionStreak >= 3;

  function updateSession(
    isoDate: string,
    updater: (current: ReturnType<typeof getSessionForDate>) => ReturnType<typeof getSessionForDate>,
  ) {
    setState((current) => {
      const base = getSessionForDate(current, isoDate);
      const next = updater(base);
      return {
        ...current,
        sessions: {
          ...current.sessions,
          [isoDate]: next,
        },
      };
    });
  }

  function toggleExercise(exerciseId: string) {
    if (selectedDay.type === "rest" || isFutureSelected) {
      return;
    }
    updateSession(selectedDate, (session) => {
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
    if (selectedDay.type === "rest" || isFutureSelected) {
      return;
    }
    updateSession(selectedDate, (session) => {
      const currentWeights = session.setWeights[exerciseId] ?? [];
      const nextWeights = [...currentWeights];
      nextWeights[setIndex] = value;
      return {
        ...session,
        setWeights: {
          ...session.setWeights,
          [exerciseId]: nextWeights,
        },
      };
    });
  }

  function setJournal(value: string) {
    if (selectedDay.type === "rest" || isFutureSelected) {
      return;
    }
    updateSession(selectedDate, (session) => ({
      ...session,
      journal: value,
    }));
  }

  function toggleCardio() {
    if (selectedDay.type === "rest" || isFutureSelected) {
      return;
    }
    updateSession(selectedDate, (session) => ({
      ...session,
      completedCardio: !session.completedCardio,
    }));
  }

  function closeSession() {
    if (selectedDay.type === "rest" || isFutureSelected) {
      return;
    }
    const percent = getCompletionPercent(selectedDay, selectedSession);
    const xp = getXpForSession(selectedDay, selectedSession);

    updateSession(selectedDate, (session) => ({
      ...session,
      closedAt: new Date().toISOString(),
    }));

    const nextStreak = selectedDate === todayIso
      ? getCurrentStreak(
          {
            ...state,
            sessions: {
              ...state.sessions,
              [selectedDate]: {
                ...selectedSession,
                closedAt: new Date().toISOString(),
              },
            },
          },
          todayIso,
        )
      : stats.streak;

    setCelebration({
      title:
        percent >= 100
          ? "Sesion cerrada al 100%"
          : percent >= 50
            ? "Sesion guardada como parcial fuerte"
            : "Sesion guardada",
      body: `Queda registrada con ${percent}% de avance y ${xp} XP. Racha actual: ${nextStreak}. Una sesion honesta siempre suma.`,
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
    if (!restRunning) {
      primeAudio(audioContextRef);
    }
    setRestRunning((current) => !current);
  }

  function resetRestTimer() {
    setRestRunning(false);
    setRestSecondsLeft(120);
    setRestLabel("Descanso entre sets");
    setTimerBurst(false);
  }

  function updateUserField<K extends keyof AppState["user"]>(field: K, value: AppState["user"][K]) {
    setState((current) => ({
      ...current,
      user: {
        ...current.user,
        [field]: value,
      },
    }));
  }

  function togglePreference<K extends keyof AppState["preferences"]>(field: K) {
    setState((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        [field]: !current.preferences[field],
      },
    }));
  }

  function resetAllData() {
    setState(initialState);
    setSelectedDate(todayIso);
    setCalendarCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setCelebration({
      title: "Datos reiniciados",
      body: "La app volvio al estado base con tu rutina actual.",
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--page-background)] text-[var(--ink-strong)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(247,127,0,0.16),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(251,191,36,0.14),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.08),_transparent_34%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-[calc(7.5rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] sm:px-6 lg:px-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--ink-soft)]">
              Musculit.O
            </p>
            <h1 className="mt-2 font-serif text-[clamp(2.2rem,9vw,3.4rem)] leading-[0.94] sm:text-5xl">
              Disciplina arriba. Cuerpo en construccion.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--ink-soft)]">
              Entrena con intencion, registra con honestidad y deja que la constancia haga el trabajo pesado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(todayIso);
              setCalendarCursor(new Date(today.getFullYear(), today.getMonth(), 1));
              setActiveTab("tracker");
            }}
            className="rounded-full border border-[var(--line-strong)] bg-[var(--panel-strong)] px-4 py-2 text-sm text-[var(--ink-strong)] transition hover:border-[var(--ember)] hover:text-white"
          >
            Ir a hoy
          </button>
        </header>

        {celebration ? (
          <section className="mb-6 rounded-[1.7rem] border border-[var(--ember-soft)] bg-[linear-gradient(135deg,rgba(245,121,32,0.18),rgba(25,18,15,0.85))] p-5 text-white shadow-[0_24px_80px_rgba(245,121,32,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[rgba(255,255,255,0.72)]">
                  Resumen guardado
                </p>
                <h2 className="mt-2 font-serif text-3xl">{celebration.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgba(255,255,255,0.82)]">
                  {celebration.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCelebration(null)}
                className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/85 transition hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "home" ? (
          <section className="grid gap-6">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[2rem] border border-[var(--line-soft)] bg-[var(--panel)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.18)] sm:p-7">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--ink-soft)]">
                  Hoy toca
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <h2 className="font-serif text-[clamp(2.1rem,8vw,4rem)] leading-none sm:text-6xl">
                    {todayDay.focus}
                  </h2>
                  <p className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-1 text-sm text-[var(--ink-soft)]">
                    {todayDay.label}
                  </p>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
                  {todayDay.type === "training"
                    ? `${todayDay.notes} ${todayDay.cardio}.`
                    : todayDay.notes}
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <StatCard label="Nivel" value={String(stats.level)} hint={`${stats.totalXp} XP total`} />
                  <StatCard label="Racha" value={`${stats.streak}`} hint={`Maxima ${stats.maxStreak}`} />
                  <StatCard
                    label="Semana"
                    value={`${stats.thisWeekCompleted}/${stats.thisWeekScheduled}`}
                    hint={`${stats.consistency}% consistencia`}
                  />
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between text-sm text-[var(--ink-soft)]">
                    <span>XP del nivel actual</span>
                    <span>
                      {stats.currentLevelXp} / {stats.nextLevelXp}
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--ember),var(--brass))]"
                      style={{
                        width: `${Math.min(
                          100,
                          (stats.currentLevelXp / stats.nextLevelXp) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-[1.8rem] border border-[rgba(255,181,72,0.18)] bg-[linear-gradient(145deg,rgba(92,44,12,0.68),rgba(24,18,17,0.92))] p-5 shadow-[0_20px_70px_rgba(199,100,45,0.18)]">
                  <p className="text-xs uppercase tracking-[0.26em] text-[rgba(255,224,179,0.72)]">
                    Racha diaria
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <div className="flex items-end gap-3">
                        <p className="font-serif text-[clamp(3.2rem,16vw,5rem)] leading-none text-[#ffd39e]">
                          {stats.streak}
                        </p>
                        {showFlame ? (
                          <button
                            type="button"
                            onClick={() => setFlameBurst(true)}
                            className={`fire-chip mb-2 ${flameBurst ? "fire-chip-burst" : ""}`}
                            aria-label="Activar fuego de la racha"
                          >
                            <span className={`fire-emoji ${flameBurst ? "fire-emoji-burst" : ""}`}>
                              🔥
                            </span>
                          </button>
                        ) : (
                          <div className="mb-2 rounded-full border border-[rgba(255,211,158,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[rgba(255,224,179,0.64)]">
                            Enciende en 3 completos
                          </div>
                        )}
                      </div>
                        <p className="mt-2 text-sm leading-6 text-[rgba(255,235,214,0.8)]">
                          Dias seguidos cumpliendo al menos el 50% de una sesion programada.
                        </p>
                        <p className="mt-2 text-xs leading-6 text-[rgba(255,224,179,0.62)]">
                          El fuego aparece solo con 3 dias seguidos al 100%.
                        </p>
                      </div>
                    <div className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-right">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[rgba(255,224,179,0.62)]">
                        Mejor marca
                      </p>
                      <p className="mt-1 font-serif text-2xl text-[#fff1db]">{stats.maxStreak}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-[1.6rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                        Estado del dia
                      </p>
                      <p className="mt-2 font-serif text-3xl">{todayPercent}%</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(todayIso);
                        setActiveTab("tracker");
                      }}
                      className="rounded-full bg-[var(--ember)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--ember-strong)]"
                    >
                      Abrir tracker
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <SurfaceCard title="Siguiente bloque">
                  <div className="space-y-3">
                    {nextTrainingDays.map((day) => (
                      <div
                        key={day.id}
                        className="rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3"
                      >
                        <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                          {day.label}
                        </p>
                        <p className="mt-1 text-lg font-medium">{day.focus}</p>
                        <p className="mt-1 text-sm text-[var(--ink-soft)]">{day.duration}</p>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>

                <SurfaceCard title="Semana viva">
                  <div className="grid grid-cols-7 gap-2">
                    {getWeekDates(today).map((date) => {
                      const day = getTrainingDayFromDate(date);
                      const iso = toIsoDate(date);
                      const session = getSessionForDate(state, iso);
                      const status = getSessionStatus(day, session);
                      const isToday = iso === todayIso;
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => {
                            setSelectedDate(iso);
                            setActiveTab("tracker");
                          }}
                          className={`rounded-[1.2rem] border px-2 py-3 text-left transition ${
                            isToday
                              ? "border-[var(--ember)] bg-[var(--panel-highlight)]"
                              : "border-[var(--line-soft)] bg-[var(--panel-strong)]"
                          }`}
                        >
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                            {day.shortLabel}
                          </p>
                          <div
                            className="mt-3 h-2 rounded-full"
                            style={{ backgroundColor: getStatusTone(status) }}
                          />
                          <p className="mt-3 text-xs text-[var(--ink-soft)]">{day.focus}</p>
                        </button>
                      );
                    })}
                  </div>
                </SurfaceCard>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SurfaceCard title="Tu split actual">
                <div className="grid gap-3">
                  {weeklySplit.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        const target = getNearestDateForDay(day.id, today);
                        setSelectedDate(toIsoDate(target));
                        setActiveTab("tracker");
                      }}
                      className="flex items-start justify-between gap-4 rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-4 text-left transition hover:border-[var(--line-strong)]"
                    >
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                          {day.label}
                        </p>
                        <p className="mt-1 text-lg font-medium">{day.focus}</p>
                      </div>
                      <p className="max-w-[13rem] text-right text-sm leading-6 text-[var(--ink-soft)]">
                        {day.type === "training" ? `${day.exercises.length} ejercicios` : "Recuperacion"}
                      </p>
                    </button>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard title="Enfoque del build">
                <div className="grid gap-3">
                  {[
                    "Tracking diario con pesos por set para ver tu progresion real.",
                    "XP, nivel y racha sobre tu rutina actual.",
                    "Calendario para revisar dias completos y parciales.",
                    "Journal para registrar sensaciones y sostener el habito.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </div>
          </section>
        ) : null}

        {activeTab === "tracker" ? (
          <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              <SurfaceCard title="Fecha activa">
                <div className="space-y-4">
                  <p className="font-serif text-3xl leading-tight">
                    {formatDisplayDate(selectedDateObject)}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(toIsoDate(shiftDate(selectedDateObject, -1)))}
                      className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--ink-soft)]"
                    >
                      Ayer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayIso)}
                      className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--ink-soft)]"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(toIsoDate(shiftDate(selectedDateObject, 1)))}
                      className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--ink-soft)]"
                    >
                      Manana
                    </button>
                  </div>
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    {isFutureSelected
                      ? "Las fechas futuras se muestran en modo preview."
                      : selectedDay.type === "rest"
                        ? "Dia de descanso. Puedes usarlo para revisar, no para cargar entrenamiento."
                        : `${selectedDay.duration} · ${selectedDay.companion}`}
                  </p>
                  <div className="rounded-[1.2rem] border border-[rgba(255,181,72,0.18)] bg-[rgba(199,100,45,0.08)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,208,156,0.72)]">
                      Racha actual
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="font-serif text-2xl text-[#ffd39e]">
                        {stats.streak} dias
                      </p>
                      {showFlame ? (
                        <button
                          type="button"
                          onClick={() => setFlameBurst(true)}
                          className={`fire-chip fire-chip-sm ${flameBurst ? "fire-chip-burst" : ""}`}
                          aria-label="Activar fuego de la racha"
                        >
                          <span className={`fire-emoji ${flameBurst ? "fire-emoji-burst" : ""}`}>
                            🔥
                          </span>
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-6 text-[rgba(255,208,156,0.72)]">
                      Suma 3 dias perfectos seguidos y enciendes el fuego.
                    </p>
                  </div>
                </div>
              </SurfaceCard>

              {selectedDay.type === "training" ? (
                <SurfaceCard title="Timer de descanso">
                  <div className={`rounded-[1.45rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] p-4 ${timerBurst ? "timer-burst" : ""}`}>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                      {restLabel}
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="font-serif text-[clamp(2.8rem,12vw,4rem)] leading-none">
                        {formatSeconds(restSecondsLeft)}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                          restRunning
                            ? "bg-[rgba(69,179,114,0.16)] text-[var(--status-good)]"
                            : restSecondsLeft === 0
                              ? "bg-[rgba(231,120,55,0.16)] text-[#ffd39e]"
                              : "bg-[var(--panel)] text-[var(--ink-soft)]"
                        }`}
                      >
                        {restRunning ? "corriendo" : restSecondsLeft === 0 ? "listo" : "pausado"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => startRestTimer("Descanso entre sets")}
                        className="rounded-full bg-[var(--ember)] px-3 py-3 text-sm font-medium text-white transition hover:bg-[var(--ember-strong)]"
                      >
                        2:00
                      </button>
                      <button
                        type="button"
                        onClick={toggleRestTimer}
                        className="rounded-full border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-3 text-sm text-[var(--ink-soft)]"
                      >
                        {restRunning ? "Pausar" : "Seguir"}
                      </button>
                      <button
                        type="button"
                        onClick={resetRestTimer}
                        className="rounded-full border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-3 text-sm text-[var(--ink-soft)]"
                      >
                        Reset
                      </button>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
                      Toca descanso al terminar cada set. Recupera, respira y vuelve con fuerza.
                    </p>
                  </div>
                </SurfaceCard>
              ) : null}

              <SurfaceCard title="Bloque del dia">
                <p className="font-serif text-4xl">{selectedDay.focus}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  {selectedDay.notes}
                </p>
                {selectedDay.type === "training" ? (
                  <>
                    <div className="mt-5 flex items-center justify-between text-sm text-[var(--ink-soft)]">
                      <span>Progreso</span>
                      <span>
                        {selectedSession.completedExerciseIds.length + (selectedSession.completedCardio ? 1 : 0)} / {getTrackableItemCount(selectedDay)}
                      </span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--ember),var(--brass))]"
                        style={{ width: `${selectedPercent}%` }}
                      />
                    </div>
                    <div className="mt-5 grid gap-3">
                      <MetricPill label="Estado" value={statusLabel(selectedStatus)} />
                      <MetricPill label="XP" value={`${selectedXp}`} />
                      <MetricPill label="Cardio" value={selectedDay.cardio} />
                    </div>
                  </>
                ) : null}
              </SurfaceCard>

              <SurfaceCard title="Calentamiento">
                {selectedDay.warmup.length ? (
                  <div className="grid gap-3">
                    {selectedDay.warmup.map((item) => (
                      <div
                        key={item}
                        className="rounded-[1.25rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    Solo recuperacion y movilidad ligera.
                  </p>
                )}
              </SurfaceCard>
            </div>

            <div className="space-y-4">
              {selectedDay.type === "rest" ? (
                <SurfaceCard title="Descanso">
                  <p className="text-lg text-[var(--ink-soft)]">
                    Este dia no lleva tracker. Mejor usalo para dormir bien, hidratarte y llegar fuerte al siguiente bloque.
                  </p>
                </SurfaceCard>
              ) : (
                <>
                  <SurfaceCard title="Ejercicios">
                    <div className="grid gap-3">
                      {selectedDay.exercises.map((exercise) => {
                        const checked = selectedSession.completedExerciseIds.includes(exercise.id);
                        const setCount = inferSetCount(exercise.sets);
                        const setWeights = normalizeSetWeights(selectedSession.setWeights[exercise.id]);
                        return (
                          <details
                            key={exercise.id}
                            className={`rounded-[1.45rem] border bg-[var(--panel-strong)] px-4 py-4 transition ${
                              checked
                                ? "border-[var(--status-good)]"
                                : "border-[var(--line-soft)]"
                            }`}
                            open={state.preferences.showDetails}
                          >
                            <summary className="grid list-none cursor-pointer gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  toggleExercise(exercise.id);
                                }}
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xl transition ${
                                  checked
                                    ? "border-[var(--status-good)] bg-[rgba(69,179,114,0.16)] text-[var(--status-good)]"
                                    : "border-[var(--line-soft)] bg-transparent text-[var(--ink-soft)]"
                                }`}
                              >
                                {checked ? "✓" : "○"}
                              </button>
                              <div>
                                <p className="text-base font-medium">{exercise.name}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                                  {exercise.group}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-serif text-xl sm:text-2xl">{exercise.sets}</p>
                                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                                  series x reps
                                </p>
                              </div>
                            </summary>

                            <div className="mt-4 grid gap-3 border-t border-[var(--line-soft)] pt-4">
                              <div className="grid gap-2 text-sm text-[var(--ink-soft)]">
                                <span className="text-sm">Peso por set</span>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  {Array.from({ length: setCount }, (_, setIndex) => (
                                    <label
                                      key={`${exercise.id}-set-${setIndex + 1}`}
                                      className="grid gap-2 rounded-[1rem] border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-3"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                                          Set {setIndex + 1}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => startRestTimer(`${exercise.name} · Set ${setIndex + 1}`)}
                                          className="rounded-full border border-[rgba(255,181,72,0.18)] bg-[rgba(199,100,45,0.1)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#ffd39e]"
                                        >
                                          Descanso
                                        </button>
                                      </div>
                                      <input
                                        value={setWeights[setIndex] ?? ""}
                                        onChange={(event) =>
                                          updateSetWeight(exercise.id, setIndex, event.target.value)
                                        }
                                        disabled={isFutureSelected}
                                        placeholder="Ej. 25 lb"
                                        className="rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--ink-strong)] outline-none transition placeholder:text-[var(--ink-soft)] focus:border-[var(--ember)] disabled:opacity-50"
                                      />
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <InfoRow label="Clave tecnica" value={exercise.cue} />
                              <InfoRow label="Setup" value={exercise.setup} />
                              <InfoRow label="Donde sentirlo" value={exercise.feel} />
                              <InfoRow label="Alternativa" value={exercise.alternative} />
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </SurfaceCard>

                  <SurfaceCard title="Cierre del bloque">
                    <div className="grid gap-4">
                      <button
                        type="button"
                        onClick={toggleCardio}
                        className={`flex items-center justify-between rounded-[1.35rem] border px-4 py-4 text-left transition ${
                          selectedSession.completedCardio
                            ? "border-[var(--status-good)] bg-[rgba(69,179,114,0.12)]"
                            : "border-[var(--line-soft)] bg-[var(--panel-strong)]"
                        }`}
                      >
                        <div>
                          <p className="text-base font-medium">Cardio final</p>
                          <p className="mt-1 text-sm text-[var(--ink-soft)]">
                            {selectedDay.cardio}
                          </p>
                        </div>
                        <span className="text-lg">
                          {selectedSession.completedCardio ? "✓" : "○"}
                        </span>
                      </button>

                      <label className="grid gap-2">
                        <span className="text-sm uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                          Journal post sesion
                        </span>
                        <textarea
                          value={selectedSession.journal}
                          onChange={(event) => setJournal(event.target.value)}
                          disabled={isFutureSelected}
                          rows={5}
                          placeholder="Como te sentiste, que peso te costo, si una tecnica se te complico, energia, molestias, etc."
                          className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-4 text-sm leading-7 text-[var(--ink-strong)] outline-none transition placeholder:text-[var(--ink-soft)] focus:border-[var(--ember)] disabled:opacity-50"
                        />
                      </label>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-4">
                        <div>
                          <p className="text-base font-medium">Cerrar sesion</p>
                          <p className="mt-1 text-sm text-[var(--ink-soft)]">
                            Guarda el estado del dia con {selectedPercent}% y {selectedXp} XP. Lo importante es dejar evidencia de otra sesion bien peleada.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={closeSession}
                          disabled={isFutureSelected}
                          className="rounded-full bg-[var(--ember)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--ember-strong)] disabled:opacity-50"
                        >
                          Guardar avance
                        </button>
                      </div>
                    </div>
                  </SurfaceCard>
                </>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "calendar" ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <SurfaceCard title="Vista temporal">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(["day", "week", "month", "year"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() =>
                        setState((current) => ({
                          ...current,
                          preferences: {
                            ...current.preferences,
                            calendarView: view,
                          },
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        state.preferences.calendarView === view
                          ? "bg-[var(--ember)] text-white"
                          : "border border-[var(--line-soft)] bg-[var(--panel-strong)] text-[var(--ink-soft)]"
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))
                    }
                    className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--ink-soft)]"
                  >
                    ←
                  </button>
                  <p className="min-w-[12rem] text-center font-serif text-2xl capitalize">
                    {formatMonthLabel(calendarCursor)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))
                    }
                    className="rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--ink-soft)]"
                  >
                    →
                  </button>
                </div>
              </div>

              {state.preferences.calendarView === "day" ? (
                <DayView
                  state={state}
                  isoDate={selectedDate}
                  onSelectDate={(iso) => {
                    setSelectedDate(iso);
                    setActiveTab("tracker");
                  }}
                />
              ) : null}

              {state.preferences.calendarView === "week" ? (
                <div className="grid gap-3 sm:grid-cols-7">
                  {weeklyDates.map((date) => {
                    const iso = toIsoDate(date);
                    const day = getTrainingDayFromDate(date);
                    const session = getSessionForDate(state, iso);
                    const status = getSessionStatus(day, session);
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setSelectedDate(iso)}
                        className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] p-4 text-left transition hover:border-[var(--line-strong)]"
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                          {formatShortLabel(date)}
                        </p>
                        <p className="mt-3 text-lg font-medium">{day.focus}</p>
                        <div
                          className="mt-4 h-2 rounded-full"
                          style={{ backgroundColor: getStatusTone(status) }}
                        />
                        <p className="mt-3 text-sm text-[var(--ink-soft)]">
                          {getCompletionPercent(day, session)}%
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {state.preferences.calendarView === "month" ? (
                <div className="grid gap-2 sm:grid-cols-7">
                  {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((label) => (
                    <p
                      key={label}
                      className="px-2 pb-1 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]"
                    >
                      {label}
                    </p>
                  ))}
                  {getMonthMatrix(calendarCursor).map((date) => {
                    const iso = toIsoDate(date);
                    const day = getTrainingDayFromDate(date);
                    const session = getSessionForDate(state, iso);
                    const status = getSessionStatus(day, session);
                    const isCurrentMonth = date.getMonth() === calendarCursor.getMonth();
                    const isSelected = iso === selectedDate;
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setSelectedDate(iso)}
                        className={`rounded-[1.1rem] border p-3 text-left transition ${
                          isSelected
                            ? "border-[var(--ember)] bg-[var(--panel-highlight)]"
                            : "border-[var(--line-soft)] bg-[var(--panel-strong)]"
                        } ${isCurrentMonth ? "opacity-100" : "opacity-45"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{date.getDate()}</p>
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: getStatusTone(status) }}
                          />
                        </div>
                        <p className="mt-6 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                          {day.shortLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {state.preferences.calendarView === "year" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {getYearMonths(calendarCursor).map((month) => (
                    <button
                      key={month.toISOString()}
                      type="button"
                      onClick={() => {
                        setCalendarCursor(month);
                        setState((current) => ({
                          ...current,
                          preferences: {
                            ...current.preferences,
                            calendarView: "month",
                          },
                        }));
                      }}
                      className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] p-4 text-left"
                    >
                      <p className="font-serif text-2xl capitalize">{formatMonthLabel(month)}</p>
                      <div className="mt-4 grid grid-cols-7 gap-1">
                        {getMonthMatrix(month).slice(0, 35).map((date) => {
                          const iso = toIsoDate(date);
                          const day = getTrainingDayFromDate(date);
                          const session = getSessionForDate(state, iso);
                          const status = getSessionStatus(day, session);
                          const isCurrentMonth = date.getMonth() === month.getMonth();
                          return (
                            <span
                              key={iso}
                              className={`aspect-square rounded-[0.3rem] ${isCurrentMonth ? "opacity-100" : "opacity-30"}`}
                              style={{ backgroundColor: getStatusTone(status) || "rgba(255,255,255,0.06)" }}
                            />
                          );
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </SurfaceCard>

            <SurfaceCard title="Lectura del dia">
              <DayView
                state={state}
                isoDate={selectedDate}
                onSelectDate={(iso) => {
                  setSelectedDate(iso);
                  setActiveTab("tracker");
                }}
              />
            </SurfaceCard>
          </section>
        ) : null}

        {activeTab === "profile" ? (
          <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <SurfaceCard title="Perfil base">
              <div className="space-y-4">
                <ProfileField
                  label="Nombre"
                  value={state.user.name}
                  onChange={(value) => updateUserField("name", value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <ProfileField
                    label="Edad"
                    value={String(state.user.age)}
                    onChange={(value) => updateUserField("age", Number(value) || 0)}
                  />
                  <ProfileField
                    label="Peso actual (lb)"
                    value={String(state.user.weightLb)}
                    onChange={(value) => updateUserField("weightLb", Number(value) || 0)}
                  />
                </div>
                <ProfileField
                  label="Altura (m)"
                  value={String(state.user.heightM)}
                  onChange={(value) => updateUserField("heightM", Number(value) || 0)}
                />
                <ProfileField
                  label="Gym"
                  value={state.user.gym}
                  onChange={(value) => updateUserField("gym", value)}
                />
                <ProfileField
                  label="Experiencia"
                  value={state.user.experience}
                  onChange={(value) => updateUserField("experience", value)}
                />
                <label className="grid gap-2">
                  <span className="text-sm uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                    Objetivo actual
                  </span>
                  <textarea
                    rows={5}
                    value={state.user.goal}
                    onChange={(event) => updateUserField("goal", event.target.value)}
                    className="rounded-[1.2rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-4 text-sm leading-7 text-[var(--ink-strong)] outline-none transition focus:border-[var(--ember)]"
                  />
                </label>
              </div>
            </SurfaceCard>

            <div className="grid gap-4">
              <SurfaceCard title="Metricas derivadas">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard label="XP total" value={`${stats.totalXp}`} hint="acumulado" />
                  <StatCard label="Nivel" value={`${stats.level}`} hint={`${stats.currentLevelXp}/${stats.nextLevelXp}`} />
                  <StatCard label="Dias completos" value={`${stats.completedDays}`} hint=">= 50% de avance" />
                  <StatCard label="Consistencia" value={`${stats.consistency}%`} hint={`${stats.completedDays}/${Math.max(stats.scheduledDaysSeen, 1)} sesiones`} />
                </div>
              </SurfaceCard>

              <SurfaceCard title="Progreso de cargas">
                <div className="grid gap-3">
                  {exerciseProgress.length ? (
                    exerciseProgress.slice(0, 8).map((item) => (
                      <div
                        key={item.key}
                        className="rounded-[1.25rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                              {item.group}
                            </p>
                            <p className="mt-1 text-base font-medium">{item.name}</p>
                          </div>
                          <p className="text-right text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                            {item.latestDate}
                          </p>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                              Ultimo registro
                            </p>
                            <p className="mt-2 text-sm text-[var(--ink-strong)]">{item.latestWeights}</p>
                          </div>
                          <div className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                              Comparacion
                            </p>
                            <p className="mt-2 text-sm text-[var(--ink-strong)]">{item.deltaLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">
                      Cuando empieces a registrar pesos por set, aqui veras el ultimo registro y la comparacion contra la sesion anterior.
                    </p>
                  )}
                </div>
              </SurfaceCard>

              <SurfaceCard title="Frecuencia actual">
                <div className="grid gap-3">
                  {listTrainingDays().map((day) => (
                    <div
                      key={day.id}
                      className="rounded-[1.25rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                            {day.label}
                          </p>
                          <p className="mt-1 text-lg font-medium">{day.focus}</p>
                        </div>
                        <p className="text-sm text-[var(--ink-soft)]">{day.exercises.length} ejercicios</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </div>
          </section>
        ) : null}

        {activeTab === "settings" ? (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <SurfaceCard title="Preferencias">
              <div className="grid gap-3">
                <ToggleRow
                  label="Mostrar detalles tecnicos abiertos"
                  value={state.preferences.showDetails}
                  onToggle={() => togglePreference("showDetails")}
                />
                <ToggleRow
                  label="Sonido habilitado"
                  value={state.preferences.soundEnabled}
                  onToggle={() => togglePreference("soundEnabled")}
                />
              </div>
            </SurfaceCard>

            <SurfaceCard title="Estado del sistema">
              <div className="space-y-4">
                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                  Esta version ya adapta la app a tu split real. Sostener disciplina real vale mas que un dia perfecto y tres dias perdidos.
                </p>
                <div className="grid gap-3">
                  <StatusLine
                    label="Modo de guardado"
                    value={
                      storageMode === "database"
                        ? "base de datos"
                        : storageMode === "checking"
                          ? "verificando"
                          : "fallback local"
                    }
                  />
                  <StatusLine
                    label="Estado de sincronizacion"
                    value={
                      saveState === "saving"
                        ? "guardando"
                        : saveState === "saved"
                          ? "guardado"
                          : saveState === "error"
                            ? "error"
                            : "inactivo"
                    }
                  />
                  <StatusLine label="Rutina fuente de verdad" value="Actualizada" />
                  <StatusLine label="Vista calendario" value={state.preferences.calendarView} />
                </div>
                <button
                  type="button"
                  onClick={resetAllData}
                  className="rounded-full border border-[rgba(255,95,87,0.4)] bg-[rgba(255,95,87,0.12)] px-5 py-3 text-sm font-medium text-[var(--danger)] transition hover:bg-[rgba(255,95,87,0.18)]"
                >
                  Reiniciar datos locales
                </button>
              </div>
            </SurfaceCard>
          </section>
        ) : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line-soft)] bg-[rgba(11,10,10,0.88)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-5 gap-2 px-3 pb-[calc(0.75rem+var(--safe-bottom))] pt-3 sm:px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-[1.25rem] px-3 py-3 text-center text-xs uppercase tracking-[0.16em] transition sm:text-sm ${
                activeTab === tab.id
                  ? "bg-[var(--ember)] text-white"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              <span className="block sm:hidden">{tab.short}</span>
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function SurfaceCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.9rem] border border-[var(--line-soft)] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--ink-soft)]">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl">{value}</p>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{hint}</p>
    </div>
  );
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-full border border-[var(--line-soft)] bg-[var(--panel)] px-4 py-3 text-sm">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span className="font-medium text-[var(--ink-strong)]">{value}</span>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-3 text-sm leading-7 text-[var(--ink-soft)]">
      <span className="mr-2 text-xs uppercase tracking-[0.18em] text-[var(--ink-strong)]">
        {label}
      </span>
      {value}
    </div>
  );
}

function DayView({
  state,
  isoDate,
  onSelectDate,
}: {
  state: AppState;
  isoDate: string;
  onSelectDate: (isoDate: string) => void;
}) {
  const date = fromIsoDate(isoDate);
  const day = getTrainingDayFromDate(date);
  const session = getSessionForDate(state, isoDate);
  const percent = getCompletionPercent(day, session);
  const status = getSessionStatus(day, session);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.45rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          {formatDisplayDate(date)}
        </p>
        <p className="mt-2 font-serif text-3xl">{day.focus}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]"
            style={{
              backgroundColor: getStatusTone(status),
              color: status === "pending" ? "var(--ink-soft)" : "white",
            }}
          >
            {statusLabel(status)}
          </span>
          <span className="text-sm text-[var(--ink-soft)]">{percent}% completado</span>
        </div>
      </div>

      <div className="grid gap-2">
        {day.type === "training" ? (
          day.exercises.map((exercise) => {
            const done = session.completedExerciseIds.includes(exercise.id);
            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onSelectDate(isoDate)}
                className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-medium">{exercise.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                    {exercise.group}
                  </p>
                </div>
                <span className={done ? "text-[var(--status-good)]" : "text-[var(--ink-soft)]"}>
                  {done ? "✓" : "○"}
                </span>
              </button>
            );
          })
        ) : (
          <p className="rounded-[1.2rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
            Dia sin entrenamiento. Recuperacion total.
          </p>
        )}
      </div>
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
    <label className="grid gap-2">
      <span className="text-sm uppercase tracking-[0.18em] text-[var(--ink-soft)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[1.2rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--ember)]"
      />
    </label>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-4 text-left"
    >
      <span className="text-sm">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${
          value ? "bg-[var(--status-good)] text-white" : "bg-[var(--panel)] text-[var(--ink-soft)]"
        }`}
      >
        {value ? "on" : "off"}
      </span>
    </button>
  );
}

function StatusLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[1.2rem] border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "complete") {
    return "Completo";
  }
  if (status === "partial") {
    return "Parcial fuerte";
  }
  if (status === "started") {
    return "Empezado";
  }
  if (status === "rest") {
    return "Descanso";
  }
  return "Pendiente";
}

function getNearestDateForDay(dayId: ReturnType<typeof getDayById>["id"], fromDate: Date) {
  const targetIndex = weeklySplit.findIndex((day) => day.id === dayId);
  const currentIndex = weeklySplit.findIndex((day) => day.id === getDayIdFromDate(fromDate));
  const delta = targetIndex - currentIndex;
  return shiftDate(fromDate, delta < 0 ? delta + 7 : delta);
}

function loadInitialState() {
  if (typeof window === "undefined") {
    return initialState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }

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
          ...createLocalSessionFallback(isoDate, dayId),
          ...session,
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

function createLocalSessionFallback(isoDate: string, dayId: DayId) {
  return {
    date: isoDate,
    dayId,
    completedExerciseIds: [],
    completedCardio: false,
    journal: "",
    setWeights: {},
    closedAt: null,
  };
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function primeAudio(audioContextRef: { current: AudioContext | null }) {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return;
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new window.AudioContext();
  }

  void audioContextRef.current.resume();
}

function playTimerSound(audioContextRef: { current: AudioContext | null }) {
  const context = audioContextRef.current;
  if (!context) {
    return;
  }

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
    if (day.type !== "training") {
      continue;
    }
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

        if (!matchingExercise) {
          return null;
        }

        return {
          isoDate,
          weights: normalizeSetWeights(session.setWeights?.[matchingExercise.id]).filter(Boolean),
        };
      })
      .filter((entry): entry is { isoDate: string; weights: string[] } => Boolean(entry))
      .filter((entry) => entry.weights.length > 0)
      .sort((a, b) => b.isoDate.localeCompare(a.isoDate));

    if (!entries.length) {
      continue;
    }

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
        : "Primer registro guardado",
    });
  }

  return summaries.sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

function buildDeltaLabel(latest: string[], previous: string[]) {
  const latestAverage = averageNumericWeight(latest);
  const previousAverage = averageNumericWeight(previous);

  if (latestAverage === null || previousAverage === null) {
    return `Antes: ${previous.join(" · ")}`;
  }

  const delta = Number((latestAverage - previousAverage).toFixed(1));
  if (delta > 0) {
    return `Subiste aprox. ${delta} lb en promedio`;
  }
  if (delta < 0) {
    return `Bajaste aprox. ${Math.abs(delta)} lb en promedio`;
  }
  return "Misma carga promedio que la sesion anterior";
}

function averageNumericWeight(weights: string[]) {
  const values = weights
    .map((weight) => {
      const match = weight.match(/-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : null;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
