"use client";

import { useEffect, useRef, useState } from "react";
import type { AppState, DerivedStats, SessionRecord } from "@/lib/musculit-state";
import { getHabitPeriodKey, getHabitsByCadence } from "@/lib/musculit-state";
import type { TrainingDay } from "@/lib/routine-data";
import { inferSetCount, normalizeSetWeights, convertWeight } from "@/lib/set-utils";
import { HabitCadence, nutritionTips } from "@/lib/habits-data";

const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * 30;

const REST_PRESETS = [
  { seconds: 90, label: "1:30" },
  { seconds: 120, label: "2:00" },
  { seconds: 180, label: "3:00" },
];

type TodayTabProps = {
  state: AppState;
  today: Date;
  todayDay: TrainingDay;
  todaySession: SessionRecord;
  todayPercent: number;
  stats: DerivedStats;
  nextTrainingDays: TrainingDay[];
  isCardioDay: boolean;
  isTrainingDay: boolean;
  onToggleExercise: (exerciseId: string) => void;
  onUpdateSetWeight: (exerciseId: string, setIndex: number, value: string) => void;
  onSetJournal: (value: string) => void;
  onToggleCardio: () => void;
  onToggleHabit: (habitId: string, cadence: HabitCadence) => void;
  onCloseSession: () => void;
  onSwitchWeightUnit: (unit: "lb" | "kg") => void;
};

export function TodayTab({
  state,
  today,
  todayDay,
  todaySession,
  todayPercent,
  stats,
  nextTrainingDays,
  isCardioDay,
  isTrainingDay,
  onToggleExercise,
  onUpdateSetWeight,
  onSetJournal,
  onToggleCardio,
  onToggleHabit,
  onCloseSession,
  onSwitchWeightUnit,
}: TodayTabProps) {
  const [restSecondsLeft, setRestSecondsLeft] = useState(120);
  const [restDuration, setRestDuration] = useState(120);
  const [restRunning, setRestRunning] = useState(false);
  const [restLabel, setRestLabel] = useState("Descanso entre sets");
  const [timerBurst, setTimerBurst] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  function startRestTimer(seconds = restDuration, label = "Descanso entre sets") {
    primeAudio(audioContextRef);
    setRestLabel(label);
    setRestDuration(seconds);
    setRestSecondsLeft(seconds);
    setRestRunning(true);
    setTimerBurst(false);
  }

  function toggleRestTimer() {
    if (!restRunning && restSecondsLeft === 0) {
      startRestTimer(restDuration, restLabel);
      return;
    }
    if (!restRunning) primeAudio(audioContextRef);
    setRestRunning((current) => !current);
  }

  function resetRestTimer() {
    setRestRunning(false);
    setRestSecondsLeft(restDuration);
    setRestLabel("Descanso entre sets");
    setTimerBurst(false);
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Card principal del dia */}
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
            <div className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center">
              <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
                <circle cx="36" cy="36" r="30" fill="none" stroke="var(--line-soft)" strokeWidth="6" />
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  fill="none"
                  stroke="url(#today-ring-gradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={PROGRESS_RING_CIRCUMFERENCE}
                  strokeDashoffset={
                    PROGRESS_RING_CIRCUMFERENCE - (PROGRESS_RING_CIRCUMFERENCE * todayPercent) / 100
                  }
                  className="progress-ring-arc"
                />
                <defs>
                  <linearGradient id="today-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--ember)" />
                    <stop offset="100%" stopColor="var(--brass)" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute font-serif text-xl leading-none">{todayPercent}%</span>
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
      </div>

      {/* Habitos */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Habitos</p>
        <div className="mt-3 grid gap-4">
          {(["daily", "weekly", "monthly"] as const).map((cadence) => {
            const items = getHabitsByCadence(cadence);
            if (!items.length) return null;
            const periodKey = getHabitPeriodKey(today, cadence);
            const done = new Set(state.habitCompletions[periodKey] ?? []);
            const cadenceLabel =
              cadence === "daily" ? "Hoy" : cadence === "weekly" ? "Esta semana" : "Este mes";
            return (
              <div key={cadence} className="grid gap-1.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  {cadenceLabel}
                </p>
                {items.map((habit) => {
                  const isDone = done.has(habit.id);
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      aria-pressed={isDone}
                      onClick={() => onToggleHabit(habit.id, habit.cadence)}
                      className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-4 text-left text-sm transition ${
                        isDone
                          ? "border-[var(--status-good)] bg-[rgba(69,179,114,0.12)]"
                          : "border-[var(--line-soft)] bg-[var(--panel-strong)]"
                      }`}
                    >
                      <span>{habit.label}</span>
                      <span className={isDone ? "text-[var(--status-good)]" : "text-[var(--ink-soft)]"}>
                        {isDone ? "✓" : "○"}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            Tips
          </summary>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--ink-soft)]">
            {nutritionTips.map((tip) => (
              <li key={tip}>· {tip}</li>
            ))}
          </ul>
        </details>
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
            aria-pressed={todaySession.completedCardio}
            onClick={onToggleCardio}
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
            <span className="text-lg">{todaySession.completedCardio ? "✓" : "○"}</span>
          </button>

          {todaySession.completedCardio && (
            <button
              type="button"
              onClick={onCloseSession}
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
                  onClick={toggleRestTimer}
                  className="min-h-11 rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--ink-soft)]"
                >
                  {restRunning ? "Pausar" : "Seguir"}
                </button>
                <button
                  type="button"
                  onClick={resetRestTimer}
                  className="min-h-11 rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--ink-soft)]"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              {REST_PRESETS.map((preset) => (
                <button
                  key={preset.seconds}
                  type="button"
                  aria-pressed={restDuration === preset.seconds}
                  onClick={() => startRestTimer(preset.seconds)}
                  className={`min-h-11 flex-1 rounded-full text-sm transition ${
                    restDuration === preset.seconds
                      ? "bg-[var(--ember)] text-white"
                      : "border border-[var(--line-soft)] bg-[var(--panel-strong)] text-[var(--ink-soft)]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle de unidad + ejercicios */}
          <div className="flex items-center justify-between rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] px-4 py-2.5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">Unidad de peso</p>
            <div className="flex gap-1">
              {(["lb", "kg"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={state.preferences.weightUnit === unit}
                  onClick={() => onSwitchWeightUnit(unit)}
                  className={`min-h-11 min-w-11 rounded-full px-4 text-xs uppercase tracking-[0.16em] transition ${
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
                      aria-pressed={checked}
                      aria-label={checked ? `${exercise.name} completado` : `Marcar ${exercise.name} completado`}
                      onClick={() => onToggleExercise(exercise.id)}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg transition ${
                        checked
                          ? "border-[var(--status-good)] bg-[rgba(69,179,114,0.16)] text-[var(--status-good)]"
                          : "border-[var(--line-soft)] text-[var(--ink-soft)]"
                      }`}
                    >
                      {checked ? "✓" : "○"}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{exercise.name}</p>
                      <p className="text-xs text-[var(--ink-soft)]">{exercise.group}</p>
                    </div>
                    <p className="shrink-0 font-mono text-sm text-[var(--ink-soft)]">{exercise.sets}</p>
                  </div>

                  <div
                    className="mt-3 grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${setCount}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: setCount }, (_, setIndex) => {
                      const raw = setWeights[setIndex] ?? "";
                      const converted = convertWeight(raw, unit, otherUnit);
                      return (
                        <div key={`${exercise.id}-s${setIndex}`} className="flex flex-col gap-1">
                          <p className="text-center text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                            Set {setIndex + 1}
                          </p>
                          <div className="flex items-center gap-1 rounded-lg border border-[var(--line-soft)] bg-[var(--panel)] pl-2 pr-1 py-1 focus-within:border-[var(--ember)]">
                            <input
                              value={raw}
                              onChange={(e) => onUpdateSetWeight(exercise.id, setIndex, e.target.value)}
                              placeholder="0"
                              inputMode="decimal"
                              aria-label={`${exercise.name} set ${setIndex + 1}, peso en ${unit}`}
                              className="min-w-0 flex-1 bg-transparent py-1.5 text-center text-sm text-[var(--ink-strong)] outline-none placeholder:text-[var(--ink-soft)]"
                            />
                            <button
                              type="button"
                              onClick={() => startRestTimer(restDuration, `${exercise.name} · S${setIndex + 1}`)}
                              aria-label={`Iniciar descanso set ${setIndex + 1}`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[15px] text-[#ffd39e]"
                            >
                              ⏱
                            </button>
                          </div>
                          <p className="h-3 text-center text-[10px] text-[var(--ink-soft)]">
                            {converted !== "" ? `≈ ${converted} ${otherUnit}` : ""}
                          </p>
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
              aria-pressed={todaySession.completedCardio}
              onClick={onToggleCardio}
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
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">Journal</span>
              <textarea
                value={todaySession.journal}
                onChange={(e) => onSetJournal(e.target.value)}
                rows={4}
                placeholder="Como te sentiste, que peso te costo, energia, molestias..."
                className="rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm leading-7 text-[var(--ink-strong)] outline-none transition placeholder:text-[var(--ink-soft)] focus:border-[var(--ember)]"
              />
            </label>

            <button
              type="button"
              onClick={onCloseSession}
              className="mt-4 w-full rounded-full bg-[var(--ember)] py-3 text-sm font-medium text-white transition"
            >
              Guardar sesion · {todayPercent}%
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
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
