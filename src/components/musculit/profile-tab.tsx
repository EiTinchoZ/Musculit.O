"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { weeklySplit } from "@/lib/routine-data";
import {
  AppState,
  DerivedStats,
  fromIsoDate,
  getTrainingDayFromDate,
} from "@/lib/musculit-state";
import { normalizeSetWeights } from "@/lib/set-utils";
import { WeekOverridePanel } from "./week-override-panel";
import { CountUpValue } from "./count-up-value";

type ProfileTabProps = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  stats: DerivedStats;
  today: Date;
  storageMode: "checking" | "database" | "local-fallback";
  onUpdateUserField: <K extends keyof AppState["user"]>(field: K, value: AppState["user"][K]) => void;
  onResetAllData: () => void;
};

export function ProfileTab({
  state,
  setState,
  stats,
  today,
  storageMode,
  onUpdateUserField,
  onResetAllData,
}: ProfileTabProps) {
  const progressSummaries = getExerciseProgressSummaries(state);

  return (
    <section className="flex flex-col gap-4">
      {/* Stats */}
      <div className="card-enter grid grid-cols-2 gap-3">
        <StatCard label="Racha" numericValue={stats.streak} hint={`Max ${stats.maxStreak}`} />
        <StatCard label="Nivel" numericValue={stats.level} hint={`${stats.totalXp} XP`} />
        <StatCard
          label="Consistencia"
          numericValue={stats.consistency}
          suffix="%"
          hint={`${stats.completedDays} sesiones`}
        />
        <StatCard
          label="Esta semana"
          value={`${stats.thisWeekCompleted}/${stats.thisWeekScheduled}`}
          hint="dias completados"
        />
      </div>

      {/* Progreso de cargas */}
      <div className="card-enter card-enter-1 rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Progreso de cargas</p>
        <div className="mt-4 grid gap-3">
          {progressSummaries.length ? (
            progressSummaries.slice(0, 6).map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="shrink-0 text-xs text-[var(--ink-soft)]">{item.latestDate}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">{item.deltaLabel}</p>
                </div>
                <Sparkline
                  values={item.sparkline}
                  color={item.deltaTrend === "up" ? "var(--status-good)" : item.deltaTrend === "down" ? "var(--danger)" : "var(--ink-soft)"}
                />
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
      <div className="card-enter card-enter-2 rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Perfil</p>
        <div className="mt-4 grid gap-3">
          <ProfileField
            label="Nombre"
            value={state.user.name}
            onChange={(v) => onUpdateUserField("name", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <ProfileField
              label="Peso (lb)"
              value={String(state.user.weightLb)}
              onChange={(v) => onUpdateUserField("weightLb", Number(v) || 0)}
            />
            <ProfileField
              label="Altura (m)"
              value={String(state.user.heightM)}
              onChange={(v) => onUpdateUserField("heightM", Number(v) || 0)}
            />
          </div>
          <ProfileField label="Gym" value={state.user.gym} onChange={(v) => onUpdateUserField("gym", v)} />
        </div>
      </div>

      {/* Export rutina */}
      <a
        href="/rutina"
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center justify-between rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] px-5 py-4 text-sm transition"
      >
        <span>
          <span className="block text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">
            Referencia
          </span>
          <span className="mt-1 block font-medium">Ver rutina en PDF</span>
        </span>
        <span className="text-[var(--ink-soft)]">→</span>
      </a>

      {/* Semana irregular */}
      <WeekOverridePanel state={state} setState={setState} today={today} />

      {/* Sistema */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Sistema</p>
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
        <ResetDataButton onReset={onResetAllData} />
      </div>
    </section>
  );
}

function ResetDataButton({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timeout = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [confirming]);

  return (
    <button
      type="button"
      aria-pressed={confirming}
      onClick={() => {
        if (confirming) {
          onReset();
          setConfirming(false);
        } else {
          setConfirming(true);
        }
      }}
      className={`mt-4 w-full min-h-11 rounded-full border py-3 text-sm transition ${
        confirming
          ? "border-[var(--danger)] bg-[rgba(255,95,87,0.16)] text-[var(--danger)]"
          : "border-[rgba(255,95,87,0.4)] bg-[rgba(255,95,87,0.08)] text-[var(--danger)]"
      }`}
    >
      {confirming ? "¿Seguro? Toca de nuevo para borrar todo" : "Reiniciar datos"}
    </button>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <div className="h-6 w-16 flex-shrink-0" />;
  }

  const width = 64;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 2 - ((value - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastX = width;
  const lastY = height - 2 - ((values[values.length - 1] - min) / span) * (height - 4);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={200}
        className="chart-line-draw"
      />
      <circle cx={lastX} cy={lastY} r="2.25" fill={color} />
    </svg>
  );
}

function StatCard({
  label,
  value,
  numericValue,
  suffix,
  hint,
}: {
  label: string;
  value?: string;
  numericValue?: number;
  suffix?: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</p>
      <p className="mt-2 font-serif text-3xl">
        {numericValue !== undefined ? (
          <>
            <CountUpValue value={numericValue} />
            {suffix}
          </>
        ) : (
          value
        )}
      </p>
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
    <label className="grid min-w-0 gap-1.5">
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 min-w-0 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--ember)]"
      />
    </label>
  );
}

type ProgressEntry = { isoDate: string; weights: string[]; weightUnit: "lb" | "kg" };

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
    deltaLabel: string;
    deltaTrend: "up" | "down" | "flat";
    sparkline: number[];
  }> = [];

  for (const [key, exerciseMeta] of uniqueExercises.entries()) {
    const entries = Object.entries(state.sessions)
      .map(([isoDate, session]) => {
        const day = getTrainingDayFromDate(fromIsoDate(isoDate), state.dayOverrides);
        const matchingExercise = day.exercises.find(
          (exercise) => exercise.name === exerciseMeta.name && exercise.group === exerciseMeta.group,
        );
        if (!matchingExercise) return null;
        return {
          isoDate,
          weights: normalizeSetWeights(session.setWeights?.[matchingExercise.id]).filter(Boolean),
          weightUnit: session.weightUnit,
        };
      })
      .filter((entry): entry is ProgressEntry => Boolean(entry))
      .filter((entry) => entry.weights.length > 0)
      .sort((a, b) => b.isoDate.localeCompare(a.isoDate));

    if (!entries.length) continue;

    const latest = entries[0];
    const previous = entries[1];
    const sparkline = entries
      .slice(0, 8)
      .reverse()
      .map((entry) => averageNumericWeight(entry.weights))
      .filter((value): value is number => value !== null);

    let deltaTrend: "up" | "down" | "flat" = "flat";
    if (previous && latest.weightUnit === previous.weightUnit) {
      const latestAvg = averageNumericWeight(latest.weights);
      const previousAvg = averageNumericWeight(previous.weights);
      if (latestAvg !== null && previousAvg !== null) {
        deltaTrend = latestAvg > previousAvg ? "up" : latestAvg < previousAvg ? "down" : "flat";
      }
    }

    summaries.push({
      key,
      name: exerciseMeta.name,
      group: exerciseMeta.group,
      latestDate: latest.isoDate,
      deltaLabel: previous ? buildDeltaLabel(latest, previous) : "Primer registro",
      deltaTrend,
      sparkline,
    });
  }

  return summaries.sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

function buildDeltaLabel(latest: ProgressEntry, previous: ProgressEntry) {
  if (latest.weightUnit !== previous.weightUnit) {
    return `Antes: ${previous.weights.join(" · ")} ${previous.weightUnit}`;
  }

  const latestAvg = averageNumericWeight(latest.weights);
  const previousAvg = averageNumericWeight(previous.weights);

  if (latestAvg === null || previousAvg === null) {
    return `Antes: ${previous.weights.join(" · ")} ${previous.weightUnit}`;
  }

  const delta = Number((latestAvg - previousAvg).toFixed(1));
  if (delta > 0) return `+${delta} ${latest.weightUnit} promedio`;
  if (delta < 0) return `${delta} ${latest.weightUnit} promedio`;
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
