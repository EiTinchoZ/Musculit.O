"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { getDayById, weeklySplit } from "@/lib/routine-data";
import {
  AppState,
  getTrainingDayFromDate,
  getWeekDates,
  markRestDays,
  toIsoDate,
} from "@/lib/musculit-state";

export function WeekOverridePanel({
  state,
  setState,
  today,
}: {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  today: Date;
}) {
  const weekDates = getWeekDates(today);
  const weekIsoDates = weekDates.map((date) => toIsoDate(date));
  const hasActiveOverride = weekIsoDates.some((iso) => Boolean(state.dayOverrides[iso]));

  const [isOpen, setIsOpen] = useState(false);
  const [draftRest, setDraftRest] = useState<Set<string> | null>(null);

  // Vie/Sab/Dom son siempre los indices 4,5,6 porque getWeekDates arranca en Lunes.
  const angieDates = new Set([weekIsoDates[4], weekIsoDates[5], weekIsoDates[6]]);

  function openPanel() {
    setDraftRest(
      new Set(
        weekDates
          .filter((date) => getTrainingDayFromDate(date, state.dayOverrides).type === "rest")
          .map((date) => toIsoDate(date)),
      ),
    );
    setIsOpen(true);
  }

  function toggleRestDay(iso: string) {
    setDraftRest((current) => {
      const next = new Set(current ?? []);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  function applyOverride() {
    if (!draftRest) return;
    const overrides = markRestDays(weekDates[0], draftRest);
    setState((current) => ({
      ...current,
      dayOverrides: { ...current.dayOverrides, ...overrides },
    }));
    setIsOpen(false);
  }

  function clearOverride() {
    setState((current) => {
      const next = { ...current.dayOverrides };
      for (const iso of weekIsoDates) delete next[iso];
      return { ...current, dayOverrides: next };
    });
  }

  const affectedAngieDates = draftRest
    ? [...draftRest].filter((iso) => angieDates.has(iso))
    : [];

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Semana irregular</p>
        {hasActiveOverride && (
          <span className="rounded-full bg-[var(--ember-soft)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#ffd39e]">
            Activa
          </span>
        )}
      </div>

      {!isOpen ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm leading-6 text-[var(--ink-soft)]">
            {hasActiveOverride
              ? "Esta semana tiene dias de descanso distintos al default (solo lunes)."
              : "Si esta semana vas a descansar un dia distinto al lunes, marcalo aca. Ese dia se saltea, sin tocar el resto de la semana."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openPanel}
              className="min-h-11 flex-1 rounded-full bg-[var(--ember)] px-4 text-sm font-medium text-white"
            >
              {hasActiveOverride ? "Ajustar de nuevo" : "Configurar esta semana"}
            </button>
            {hasActiveOverride && (
              <button
                type="button"
                onClick={clearOverride}
                className="min-h-11 rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--ink-soft)]"
              >
                Volver al default
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              Marca los dias que descansas esta semana
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDates.map((date, index) => {
                const iso = toIsoDate(date);
                const isRest = draftRest?.has(iso) ?? false;
                return (
                  <button
                    key={iso}
                    type="button"
                    aria-pressed={isRest}
                    onClick={() => toggleRestDay(iso)}
                    className={`min-h-11 rounded-xl border py-2 text-center text-[10px] uppercase tracking-[0.1em] transition ${
                      isRest
                        ? "border-[var(--status-rest)] bg-[rgba(66,81,107,0.28)] text-[var(--ink-strong)]"
                        : "border-[var(--line-soft)] bg-[var(--panel-strong)] text-[var(--ink-soft)]"
                    }`}
                  >
                    {weeklySplit[index].shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {affectedAngieDates.length > 0 && (
            <div className="grid gap-1.5 rounded-xl border border-[var(--ember-soft)] bg-[rgba(199,100,45,0.08)] p-3">
              <p className="text-xs leading-5 text-[var(--ink-soft)]">
                Estas saltando una sesion que normalmente vas con Angie:
              </p>
              {affectedAngieDates.map((iso) => {
                const index = weekIsoDates.indexOf(iso);
                const day = getDayById(weeklySplit[index].id);
                return (
                  <span key={iso} className="text-xs">
                    {day.label} · {day.focus}
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyOverride}
              className="min-h-11 flex-1 rounded-full bg-[var(--ember)] px-4 text-sm font-medium text-white"
            >
              Confirmar y aplicar
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-11 rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--ink-soft)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
