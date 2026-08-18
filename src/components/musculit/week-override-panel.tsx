"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { getDayById, weeklySplit } from "@/lib/routine-data";
import {
  AppState,
  DayId,
  computeWeekReflow,
  getTrainingDayFromDate,
  getWeekDates,
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
  const [draftSkip, setDraftSkip] = useState<Set<DayId>>(new Set());

  // Vie/Sab/Dom son siempre los indices 4,5,6 porque getWeekDates arranca en Lunes.
  const cataDays = [
    { date: weekDates[4], dayId: "friday" as DayId },
    { date: weekDates[5], dayId: "saturday" as DayId },
    { date: weekDates[6], dayId: "sunday" as DayId },
  ].map((item) => ({ ...item, day: getDayById(item.dayId) }));

  function openPanel() {
    setDraftRest(
      new Set(
        weekDates
          .filter((date) => getTrainingDayFromDate(date, state.dayOverrides).type === "rest")
          .map((date) => toIsoDate(date)),
      ),
    );
    setDraftSkip(new Set());
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

  function toggleSkip(dayId: DayId) {
    setDraftSkip((current) => {
      const next = new Set(current);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }

  function applyOverride() {
    if (!draftRest) return;
    const overrides = computeWeekReflow(weekDates[0], draftRest, draftSkip);
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

  const preview = draftRest ? computeWeekReflow(weekDates[0], draftRest, draftSkip) : null;
  const affectedCataDays = cataDays.filter((c) => draftRest?.has(toIsoDate(c.date)));

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
              ? "Esta semana tiene un horario ajustado, distinto al default."
              : "Si esta semana vas a descansar dias distintos a los normales, marcalos y la app reacomoda la rutina."}
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

          {affectedCataDays.length > 0 && (
            <div className="grid gap-2 rounded-xl border border-[var(--ember-soft)] bg-[rgba(199,100,45,0.08)] p-3">
              <p className="text-xs leading-5 text-[var(--ink-soft)]">
                Marcaste como descanso un dia que normalmente vas con Cata. ¿Que hacemos con ese entreno?
              </p>
              {affectedCataDays.map((c) => (
                <div key={c.dayId} className="flex items-center justify-between gap-2">
                  <span className="text-xs">{c.day.label} · {c.day.focus}</span>
                  <button
                    type="button"
                    aria-pressed={draftSkip.has(c.dayId)}
                    onClick={() => toggleSkip(c.dayId)}
                    className={`min-h-9 rounded-full border px-3 text-[11px] uppercase tracking-[0.1em] transition ${
                      draftSkip.has(c.dayId)
                        ? "border-[var(--danger)] text-[var(--danger)]"
                        : "border-[var(--status-good)] text-[var(--status-good)]"
                    }`}
                  >
                    {draftSkip.has(c.dayId) ? "Se salta esta semana" : "Se reacomoda otro dia"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {preview && (
            <div className="grid gap-1.5 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] p-3">
              <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Propuesta</p>
              {weekDates.map((date, index) => {
                const iso = toIsoDate(date);
                const overrideDayId = preview[iso];
                const day = overrideDayId ? getDayById(overrideDayId) : getDayById(weeklySplit[index].id);
                return (
                  <div key={iso} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--ink-soft)]">{weeklySplit[index].shortLabel}</span>
                    <span>{day.focus}</span>
                  </div>
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
