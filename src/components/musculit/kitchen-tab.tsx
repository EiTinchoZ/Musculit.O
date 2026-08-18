"use client";

import type { Dispatch, SetStateAction } from "react";
import { extras, meals, nutritionTargets, sumMacros, vegetableTips, type MacroTuple } from "@/lib/nutrition-data";
import { AppState, getNutritionLogForDate } from "@/lib/musculit-state";
import { CountUpValue } from "@/components/musculit/count-up-value";

type KitchenTabProps = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  todayIso: string;
};

export function KitchenTab({ state, setState, todayIso }: KitchenTabProps) {
  const selection = getNutritionLogForDate(state, todayIso);

  function setMealOption(mealId: string, optionIndex: number) {
    setState((current) => {
      const currentLog = getNutritionLogForDate(current, todayIso);
      return {
        ...current,
        nutritionLogs: {
          ...current.nutritionLogs,
          [todayIso]: {
            ...currentLog,
            mealChoices: { ...currentLog.mealChoices, [mealId]: optionIndex },
          },
        },
      };
    });
  }

  function toggleExtra(extraId: string) {
    setState((current) => {
      const currentLog = getNutritionLogForDate(current, todayIso);
      const isSelected = currentLog.extrasSelected.includes(extraId);
      return {
        ...current,
        nutritionLogs: {
          ...current.nutritionLogs,
          [todayIso]: {
            ...currentLog,
            extrasSelected: isSelected
              ? currentLog.extrasSelected.filter((id) => id !== extraId)
              : [...currentLog.extrasSelected, extraId],
          },
        },
      };
    });
  }

  const mealMacros = meals.map((meal) => {
    const optionIndex = selection.mealChoices[meal.id] ?? 0;
    return meal.options[optionIndex % meal.options.length].macros;
  });
  const extraMacros = extras
    .filter((extra) => selection.extrasSelected.includes(extra.id))
    .map((extra) => extra.macros);
  const totals = sumMacros([...mealMacros, ...extraMacros]);

  return (
    <section className="flex flex-col gap-4">
      <div className="card-enter rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Tus numeros</p>
        <div className="mt-4 flex items-center gap-4">
          <CalorieRing consumed={totals[0]} goal={nutritionTargets.calorieGoal} />
          <div className="grid flex-1 grid-cols-2 gap-2.5">
            <NumberCard label="Mantenimiento" value={nutritionTargets.maintenanceKcal} unit="kcal" />
            <NumberCard label="Proteina min." value={nutritionTargets.proteinG} unit="g" />
          </div>
        </div>
        <p className="mt-4 border-t border-[var(--line-soft)] pt-4 text-sm leading-6 text-[var(--ink-soft)]">
          Superavit <strong className="text-[var(--ink-strong)]">leve</strong>, no un bulk agresivo. La grasa
          visceral y el porcentaje corporal ya estan en rango ideal, y el 91% de la grasa se acumula en el
          tronco — un superavit fuerte mandaria ese exceso justo ahi.
        </p>
      </div>

      <div className="card-enter card-enter-1 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Arma tu dia</p>
        {meals.map((meal) => {
          const optionIndex = (selection.mealChoices[meal.id] ?? 0) % meal.options.length;
          const option = meal.options[optionIndex];
          return (
            <div key={meal.id} className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{meal.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                    {optionIndex + 1} / {meal.options.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMealOption(meal.id, (optionIndex + 1) % meal.options.length)}
                    className="min-h-9 rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 text-[11px] uppercase tracking-[0.08em] text-[var(--ink-soft)] transition hover:border-[var(--ember)] hover:text-[var(--ink-strong)]"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {option.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-5 text-[var(--ink-strong)]">
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--line-strong)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <MacroRow macros={option.macros} />
            </div>
          );
        })}
      </div>

      <div className="card-enter card-enter-2">
        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Extras</p>
        <div className="flex flex-wrap gap-2">
          {extras.map((extra) => {
            const isSelected = selection.extrasSelected.includes(extra.id);
            return (
              <button
                key={extra.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleExtra(extra.id)}
                className={`min-h-9 rounded-full border px-3.5 py-2 text-left text-xs transition ${
                  isSelected
                    ? "border-[var(--status-good)] bg-[rgba(69,179,114,0.14)] text-[var(--ink-strong)]"
                    : "border-[var(--line-soft)] bg-[var(--panel)] text-[var(--ink-soft)]"
                }`}
              >
                {extra.name}
                <span className="ml-1.5 font-mono text-[10px] opacity-75">+{extra.macros[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-[calc(5.5rem+var(--safe-bottom))] z-10 rounded-2xl border border-[var(--line-strong)] bg-[rgba(20,16,14,0.97)] p-4 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-3">
          <TotalBar label="Calorias" value={totals[0]} target={nutritionTargets.calorieGoal} unit="" color="var(--ember-strong)" />
          <TotalBar label="Proteina" value={totals[1]} target={nutritionTargets.proteinG} unit="g" color="var(--status-good)" />
          <TotalBar label="Grasas" value={totals[2]} target={nutritionTargets.fatG} unit="g" color="var(--status-warn)" />
          <TotalBar label="Carbos" value={totals[3]} target={nutritionTargets.carbsG} unit="g" color="var(--status-rest)" />
        </div>
      </div>

      <div className="card-enter card-enter-3 rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Vegetales sin sufrir</p>
        <div className="mt-4 grid gap-2.5">
          {vegetableTips.map((tip) => (
            <div key={tip.title} className="rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] p-3.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-strong)]">{tip.title}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="px-1 text-xs leading-5 text-[var(--ink-soft)]">
        Los macros de cada opcion son estimados de referencia, no medidas de laboratorio. Reevalua cada 3-4
        semanas: si el peso no sube ni baja y quieres mas ganancia muscular, sube 100-150 kcal. Si el abdomen
        gana grasa mas rapido de lo deseado, baja el superavit antes de eliminarlo del todo.
      </p>
    </section>
  );
}

function NumberCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-3.5">
      <p className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--ink-soft)]">{label}</p>
      <p
        className="mt-1.5 font-mono text-lg font-semibold"
        style={accent ? { color: "var(--ember-strong)" } : undefined}
      >
        <CountUpValue value={value} />
        <span className="ml-0.5 text-[10px] font-normal text-[var(--ink-soft)]">{unit}</span>
      </p>
    </div>
  );
}

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const progress = goal > 0 ? Math.min(1, Math.max(0, consumed / goal)) : 0;
  const size = 96;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line-soft)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ember-strong)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-semibold text-[var(--ink-strong)]">
          <CountUpValue value={Math.round(progress * 100)} />
          <span className="text-xs">%</span>
        </span>
        <span className="text-[8.5px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">kcal hoy</span>
      </div>
    </div>
  );
}

function MacroRow({ macros }: { macros: MacroTuple }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--line-soft)] pt-3 font-mono text-[11px] text-[var(--ink-soft)]">
      <span>
        <strong className="text-[var(--ink-strong)]">{macros[0]}</strong> kcal
      </span>
      <span>
        P <strong className="text-[var(--ink-strong)]">{macros[1]}</strong>g
      </span>
      <span>
        G <strong className="text-[var(--ink-strong)]">{macros[2]}</strong>g
      </span>
      <span>
        C <strong className="text-[var(--ink-strong)]">{macros[3]}</strong>g
      </span>
    </div>
  );
}

function TotalBar({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const percent = Math.min(100, Math.round((value / target) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--ink-soft)]">{label}</span>
        <span className="font-mono text-[11px] text-[var(--ink-strong)]">
          <CountUpValue value={value} /> / {target}
          {unit}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}
