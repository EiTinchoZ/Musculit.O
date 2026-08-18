"use client";

import { useState } from "react";
import {
  AppState,
  fromIsoDate,
  formatDisplayDate,
  formatMonthLabel,
  getCompletionPercent,
  getMonthMatrix,
  getSessionForDate,
  getSessionStatus,
  getStatusTone,
  getTrainingDayFromDate,
  getWeekDates,
  toIsoDate,
} from "@/lib/musculit-state";
import { normalizeSetWeights } from "@/lib/set-utils";

type HistoryTabProps = {
  state: AppState;
  today: Date;
  todayIso: string;
};

export function HistoryTab({ state, today, todayIso }: HistoryTabProps) {
  const [historyDate, setHistoryDate] = useState(todayIso);
  const [historyCursor, setHistoryCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  return (
    <section className="flex flex-col gap-4">
      {/* Semana actual */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Esta semana</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {getWeekDates(today).map((date) => {
            const day = getTrainingDayFromDate(date, state.dayOverrides);
            const iso = toIsoDate(date);
            const session = getSessionForDate(state, iso);
            const status = getSessionStatus(day, session);
            const isToday = iso === todayIso;
            const isSelected = iso === historyDate;
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setHistoryDate(iso)}
                className={`min-h-11 rounded-xl border py-2 text-center transition ${
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
                  style={{ backgroundColor: getStatusTone(status) || "rgba(255,255,255,0.06)" }}
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
              setHistoryCursor(new Date(historyCursor.getFullYear(), historyCursor.getMonth() - 1, 1))
            }
            aria-label="Mes anterior"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] text-sm text-[var(--ink-soft)]"
          >
            ←
          </button>
          <p className="font-serif text-xl capitalize">{formatMonthLabel(historyCursor)}</p>
          <button
            type="button"
            onClick={() =>
              setHistoryCursor(new Date(historyCursor.getFullYear(), historyCursor.getMonth() + 1, 1))
            }
            aria-label="Mes siguiente"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] text-sm text-[var(--ink-soft)]"
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
            const day = getTrainingDayFromDate(date, state.dayOverrides);
            const session = getSessionForDate(state, iso);
            const status = getSessionStatus(day, session);
            const isCurrentMonth = date.getMonth() === historyCursor.getMonth();
            const isSelected = iso === historyDate;
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={isSelected}
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
                  style={{ backgroundColor: getStatusTone(status) || "transparent" }}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--line-soft)] pt-3">
          {[
            { label: "Completo", tone: "var(--status-good)" },
            { label: "Parcial", tone: "var(--status-warn)" },
            { label: "Empezado", tone: "var(--status-soft)" },
            { label: "Descanso", tone: "var(--status-rest)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.tone }} />
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dia seleccionado */}
      <HistoryDayView state={state} isoDate={historyDate} />
    </section>
  );
}

function HistoryDayView({ state, isoDate }: { state: AppState; isoDate: string }) {
  const date = fromIsoDate(isoDate);
  const day = getTrainingDayFromDate(date, state.dayOverrides);
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
                  <p className="text-xs text-[var(--ink-soft)]">
                    {weights.join(" · ")} {session.weightUnit}
                  </p>
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

      {day.type === "rest" && <p className="mt-3 text-sm text-[var(--ink-soft)]">Dia de descanso.</p>}
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "complete") return "Completo";
  if (status === "partial") return "Parcial";
  if (status === "started") return "Empezado";
  if (status === "rest") return "Descanso";
  return "Pendiente";
}
