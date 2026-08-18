"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  bodyMetrics,
  buildTrendSeries,
  classifyRange,
  getBodyInsights,
  mixSegmentColor,
  rangePosition,
  rangeStatusLabel,
  rangeZone,
  segmentIntensity,
  trendMetrics,
  type TrendMetricId,
} from "@/lib/inbody-data";
import { AppState, BodySegments, InBodyReading } from "@/lib/musculit-state";
import { CountUpValue } from "@/components/musculit/count-up-value";
import { ProgressCheckinCard } from "@/components/musculit/progress-checkin-card";

type SegmentMode = "lean" | "fat";

const MODE_COLOR: Record<SegmentMode, string> = {
  lean: "var(--status-good)",
  fat: "var(--ember-strong)",
};

const MODE_COLOR_HEX: Record<SegmentMode, string> = {
  lean: "#45b372",
  fat: "#e87837",
};

const SEGMENT_BASE_HEX = "#27394B";

type BodyTabProps = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  todayIso: string;
};

export function BodyTab({ state, setState, todayIso }: BodyTabProps) {
  const readings = useMemo(
    () => [...state.inBodyReadings].sort((a, b) => b.date.localeCompare(a.date)),
    [state.inBodyReadings],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reading = readings.find((r) => r.id === selectedId) ?? readings[0] ?? null;

  function addReading(next: InBodyReading) {
    setState((current) => ({
      ...current,
      inBodyReadings: [...current.inBodyReadings.filter((r) => r.date !== next.date), next],
    }));
    setSelectedId(next.id);
  }

  if (!reading) {
    return (
      <section className="flex flex-col gap-4">
        <ProgressCheckinCard state={state} setState={setState} todayIso={todayIso} />
        <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
          <p className="text-sm text-[var(--ink-soft)]">
            Todavia no hay ninguna medicion de InBody cargada.
          </p>
        </div>
        <AddReadingForm onSave={addReading} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <ProgressCheckinCard state={state} setState={setState} todayIso={todayIso} />

      {readings.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {readings.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={r.id === reading.id}
              onClick={() => setSelectedId(r.id)}
              className={`min-h-9 flex-shrink-0 rounded-full border px-4 text-xs uppercase tracking-[0.1em] transition ${
                r.id === reading.id
                  ? "border-[var(--ember)] bg-[var(--ember-soft)] text-[var(--ink-strong)]"
                  : "border-[var(--line-soft)] bg-[var(--panel-strong)] text-[var(--ink-soft)]"
              }`}
            >
              {r.date}
            </button>
          ))}
        </div>
      )}

      <div className="card-enter">
        <SegmentMapCard reading={reading} />
      </div>
      <div className="card-enter card-enter-1">
        <TrendChartCard readings={state.inBodyReadings} />
      </div>
      <div className="card-enter card-enter-2">
        <IndicatorsCard reading={reading} />
      </div>
      <div className="card-enter card-enter-3">
        <InsightsCard reading={reading} />
      </div>
      <AddReadingForm onSave={addReading} />
    </section>
  );
}

function SegmentMapCard({ reading }: { reading: InBodyReading }) {
  const [mode, setMode] = useState<SegmentMode>("lean");
  const data = reading.segmental[mode];
  const max = Math.max(data.armR, data.armL, data.trunk, data.legR, data.legL) || 1;
  const color = MODE_COLOR_HEX[mode];

  function fillFor(value: number) {
    return mixSegmentColor(SEGMENT_BASE_HEX, color, segmentIntensity(value, max));
  }

  const trunkFatShare = reading.fatMassKg > 0 ? reading.segmental.fat.trunk / reading.fatMassKg : 0;
  const legDelta = Math.abs(reading.segmental.lean.legR - reading.segmental.lean.legL);
  const armDelta = Math.abs(reading.segmental.lean.armR - reading.segmental.lean.armL);

  const readout =
    mode === "lean" ? (
      <>
        Tu masa magra esta bien repartida y {legDelta < 0.5 && armDelta < 0.5 ? "casi perfectamente simetrica" : "con alguna diferencia"} entre
        lado derecho e izquierdo — diferencia de <strong className="text-[var(--ink-strong)]">{legDelta.toFixed(2)} kg</strong> en
        piernas y <strong className="text-[var(--ink-strong)]">{armDelta.toFixed(2)} kg</strong> en brazos.
      </>
    ) : (
      <>
        <strong className="text-[var(--ink-strong)]">
          {reading.segmental.fat.trunk.toFixed(2)} de {reading.fatMassKg.toFixed(1)} kg de grasa total
        </strong>{" "}
        estan en el tronco ({Math.round(trunkFatShare * 100)}%). Brazos y piernas casi no tienen — normal en hombres, pero es la
        zona a vigilar cuando suba el superavit.
      </>
    );

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Mapa segmentario</p>

      <div className="mt-4 flex gap-2">
        {(["lean", "fat"] as SegmentMode[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className="min-h-9 flex-1 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.1em] transition"
            style={
              mode === m
                ? { background: MODE_COLOR[m], borderColor: MODE_COLOR[m], color: "var(--page-background)" }
                : { borderColor: "var(--line-soft)", color: "var(--ink-soft)" }
            }
          >
            {m === "lean" ? "Masa magra" : "Grasa"}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col items-center gap-5">
        <svg viewBox="0 0 200 420" role="img" aria-label="Diagrama segmentario del cuerpo" className="h-auto w-36">
          <circle cx="100" cy="32" r="22" fill="#1E2E3E" />
          <path d="M68,58 L132,58 L138,140 L128,215 L72,215 L62,140 Z" fill={fillFor(data.trunk)} />
          <path d="M68,60 L54,66 L40,150 L34,205 L48,208 L58,150 L70,80 Z" fill={fillFor(data.armR)} />
          <path d="M132,60 L146,66 L160,150 L166,205 L152,208 L142,150 L130,80 Z" fill={fillFor(data.armL)} />
          <path d="M74,215 L98,215 L96,300 L92,398 L72,398 L74,300 Z" fill={fillFor(data.legR)} />
          <path d="M102,215 L126,215 L126,300 L128,398 L108,398 L104,300 Z" fill={fillFor(data.legL)} />
        </svg>

        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 text-center">
          <SegmentValue label="Brazo derecho" value={data.armR} color={color} />
          <SegmentValue label="Brazo izquierdo" value={data.armL} color={color} />
          <SegmentValue label="Pierna derecha" value={data.legR} color={color} />
          <SegmentValue label="Pierna izquierda" value={data.legL} color={color} />
        </div>

        <div className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3">
          <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Tronco</span>
          <span className="font-mono text-xl font-semibold">{data.trunk.toFixed(2)} kg</span>
        </div>
      </div>

      <p className="mt-4 border-t border-[var(--line-soft)] pt-4 text-sm leading-6 text-[var(--ink-soft)]">
        {readout}
      </p>
    </div>
  );
}

function SegmentValue({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">{label}</p>
      <p className="font-mono text-lg font-semibold" style={{ color }}>
        {value.toFixed(2)} kg
      </p>
    </div>
  );
}

function TrendChartCard({ readings }: { readings: InBodyReading[] }) {
  const [metricId, setMetricId] = useState<TrendMetricId>("bodyFatPercent");
  const metric = trendMetrics.find((m) => m.id === metricId)!;
  const series = useMemo(() => buildTrendSeries(readings, metric), [readings, metric]);

  const width = 320;
  const height = 120;
  const padX = 14;
  const padY = 16;

  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  function xFor(index: number) {
    if (series.length <= 1) return width / 2;
    return padX + (index / (series.length - 1)) * (width - padX * 2);
  }
  function yFor(value: number) {
    return height - padY - ((value - min) / span) * (height - padY * 2);
  }

  const pathD = series.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(" ");
  const areaD =
    series.length > 1 ? `${pathD} L ${xFor(series.length - 1).toFixed(1)} ${height} L ${xFor(0).toFixed(1)} ${height} Z` : "";

  const latest = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;
  const delta = previous ? latest.value - previous.value : null;

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Evolucion</p>
        {delta !== null && (
          <span className="font-mono text-[11px]" style={{ color: delta === 0 ? "var(--ink-soft)" : metric.color }}>
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} {metric.unit} desde la anterior
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-1.5">
        {trendMetrics.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={m.id === metricId}
            onClick={() => setMetricId(m.id)}
            className="min-h-8 rounded-full border px-3 text-[11px] uppercase tracking-[0.08em] transition"
            style={
              m.id === metricId
                ? { background: m.color, borderColor: m.color, color: "var(--page-background)" }
                : { borderColor: "var(--line-soft)", color: "var(--ink-soft)" }
            }
          >
            {m.shortLabel}
          </button>
        ))}
      </div>

      {series.length < 2 ? (
        <div className="mt-5 flex flex-col items-center gap-2 py-6 text-center">
          <p className="font-mono text-3xl font-semibold" style={{ color: metric.color }}>
            <CountUpValue value={latest.value} decimals={1} />
            <span className="ml-1 text-sm font-normal text-[var(--ink-soft)]">{metric.unit}</span>
          </p>
          <p className="max-w-[26ch] text-xs leading-5 text-[var(--ink-soft)]">
            Agrega mas mediciones para ver la tendencia en el tiempo.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <svg key={metricId} viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
            <path d={areaD} fill={metric.color} opacity="0.08" stroke="none" />
            <path
              d={pathD}
              fill="none"
              stroke={metric.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={1000}
              className="chart-line-draw"
            />
            {series.map((p, i) => (
              <circle
                key={p.date}
                cx={xFor(i)}
                cy={yFor(p.value)}
                r={i === series.length - 1 ? 4 : 2.5}
                fill={metric.color}
              />
            ))}
          </svg>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-[var(--ink-soft)]">
            <span>{series[0].date}</span>
            <span>{series[series.length - 1].date}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function IndicatorsCard({ reading }: { reading: InBodyReading }) {
  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Indicadores</p>
      <div className="mt-4 grid gap-3">
        {bodyMetrics.map((metric) => {
          const value = metric.value(reading);
          const status = metric.range ? classifyRange(value, metric.range) : null;
          return (
            <div key={metric.id} className="rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">{metric.label}</span>
                {status && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.1em]"
                    style={
                      status === "ideal"
                        ? { background: "rgba(69,179,114,0.16)", color: "var(--status-good)" }
                        : status === "bajo" || status === "alto"
                          ? { background: "rgba(255,138,122,0.16)", color: "var(--danger)" }
                          : { background: "rgba(213,166,64,0.16)", color: "var(--status-warn)" }
                    }
                  >
                    {rangeStatusLabel[status]}
                  </span>
                )}
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold">
                <CountUpValue value={value} decimals={value % 1 === 0 ? 0 : 2} />
                <span className="ml-1 text-sm font-normal text-[var(--ink-soft)]">{metric.unit}</span>
              </p>
              {metric.range && <RangeBar value={value} range={metric.range} />}
              <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">{metric.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RangeBar({ value, range }: { value: number; range: { min: number; normalMin: number; normalMax: number; max: number } }) {
  const zone = rangeZone(range);
  const markPosition = rangePosition(value, range);

  return (
    <div className="mt-3">
      <div className="relative h-1.5 rounded-full bg-[var(--line-soft)]">
        <div
          className="absolute inset-y-0 rounded-full bg-[rgba(69,179,114,0.35)]"
          style={{ left: `${zone.start}%`, width: `${Math.max(0, zone.end - zone.start)}%` }}
        />
        <div
          className="absolute -top-1 h-3.5 w-[3px] rounded-full bg-[var(--ink-strong)] transition-[left] duration-500 ease-out"
          style={{ left: `${markPosition}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[var(--ink-soft)]">
        <span>{range.min}</span>
        <span>{range.max}</span>
      </div>
    </div>
  );
}

function InsightsCard({ reading }: { reading: InBodyReading }) {
  const insights = getBodyInsights(reading);
  return (
    <div className="rounded-2xl border border-[var(--ember-soft)] bg-[linear-gradient(135deg,rgba(231,120,55,0.08),transparent)] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Lectura del examen</p>
      <div className="mt-4 flex flex-col gap-4">
        {insights.map((insight) => (
          <div key={insight.title}>
            <p className="text-sm font-semibold text-[var(--ink-strong)]">{insight.title}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{insight.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const emptySegments: BodySegments = { armR: 0, armL: 0, trunk: 0, legR: 0, legL: 0 };

function AddReadingForm({ onSave }: { onSave: (reading: InBodyReading) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [fields, setFields] = useState({
    weightKg: "",
    imc: "",
    bodyFatPercent: "",
    fatMassKg: "",
    leanMassKg: "",
    skeletalMuscleKg: "",
    bodyWaterL: "",
    visceralFat: "",
    bmr: "",
    appendicularIndex: "",
    idealWeightKg: "",
    weightControlKg: "",
    fatControlKg: "",
    leanControlKg: "",
  });
  const [lean, setLean] = useState<BodySegments>(emptySegments);
  const [fat, setFat] = useState<BodySegments>(emptySegments);

  function num(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function save() {
    if (!date) return;
    onSave({
      id: `reading-${date}`,
      date,
      weightKg: num(fields.weightKg),
      imc: num(fields.imc),
      bodyFatPercent: num(fields.bodyFatPercent),
      fatMassKg: num(fields.fatMassKg),
      leanMassKg: num(fields.leanMassKg),
      skeletalMuscleKg: num(fields.skeletalMuscleKg),
      bodyWaterL: num(fields.bodyWaterL),
      visceralFat: num(fields.visceralFat),
      bmr: num(fields.bmr),
      appendicularIndex: num(fields.appendicularIndex),
      idealWeightKg: num(fields.idealWeightKg),
      weightControlKg: num(fields.weightControlKg),
      fatControlKg: num(fields.fatControlKg),
      leanControlKg: num(fields.leanControlKg),
      segmental: { lean, fat },
    });
    setOpen(false);
    setDate("");
    setFields({
      weightKg: "",
      imc: "",
      bodyFatPercent: "",
      fatMassKg: "",
      leanMassKg: "",
      skeletalMuscleKg: "",
      bodyWaterL: "",
      visceralFat: "",
      bmr: "",
      appendicularIndex: "",
      idealWeightKg: "",
      weightControlKg: "",
      fatControlKg: "",
      leanControlKg: "",
    });
    setLean(emptySegments);
    setFat(emptySegments);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--panel)] px-5 py-4 text-left text-sm text-[var(--ink-soft)] transition"
      >
        + Agregar nueva medicion de InBody
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Nueva medicion</p>

      <label className="mt-4 grid gap-1.5">
        <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">Fecha del examen</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-h-11 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none focus:border-[var(--ember)]"
        />
      </label>

      <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Metricas principales</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <NumField label="Peso (kg)" value={fields.weightKg} onChange={(v) => setFields((f) => ({ ...f, weightKg: v }))} />
        <NumField label="IMC" value={fields.imc} onChange={(v) => setFields((f) => ({ ...f, imc: v }))} />
        <NumField
          label="Grasa corporal (%)"
          value={fields.bodyFatPercent}
          onChange={(v) => setFields((f) => ({ ...f, bodyFatPercent: v }))}
        />
        <NumField
          label="Masa de grasa (kg)"
          value={fields.fatMassKg}
          onChange={(v) => setFields((f) => ({ ...f, fatMassKg: v }))}
        />
        <NumField
          label="Masa magra (kg)"
          value={fields.leanMassKg}
          onChange={(v) => setFields((f) => ({ ...f, leanMassKg: v }))}
        />
        <NumField
          label="M. esqueletica (kg)"
          value={fields.skeletalMuscleKg}
          onChange={(v) => setFields((f) => ({ ...f, skeletalMuscleKg: v }))}
        />
        <NumField
          label="Agua corporal (L)"
          value={fields.bodyWaterL}
          onChange={(v) => setFields((f) => ({ ...f, bodyWaterL: v }))}
        />
        <NumField
          label="Grasa visceral"
          value={fields.visceralFat}
          onChange={(v) => setFields((f) => ({ ...f, visceralFat: v }))}
        />
        <NumField label="TMB (kcal)" value={fields.bmr} onChange={(v) => setFields((f) => ({ ...f, bmr: v }))} />
        <NumField
          label="Indice apendicular"
          value={fields.appendicularIndex}
          onChange={(v) => setFields((f) => ({ ...f, appendicularIndex: v }))}
        />
      </div>

      <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Control de peso</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <NumField
          label="Peso ideal (kg)"
          value={fields.idealWeightKg}
          onChange={(v) => setFields((f) => ({ ...f, idealWeightKg: v }))}
        />
        <NumField
          label="Control peso (kg)"
          value={fields.weightControlKg}
          onChange={(v) => setFields((f) => ({ ...f, weightControlKg: v }))}
        />
        <NumField
          label="Control grasa (kg)"
          value={fields.fatControlKg}
          onChange={(v) => setFields((f) => ({ ...f, fatControlKg: v }))}
        />
        <NumField
          label="Control magra (kg)"
          value={fields.leanControlKg}
          onChange={(v) => setFields((f) => ({ ...f, leanControlKg: v }))}
        />
      </div>

      <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Segmentario — masa magra (kg)</p>
      <SegmentFields segments={lean} onChange={setLean} />

      <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Segmentario — grasa (kg)</p>
      <SegmentFields segments={fat} onChange={setFat} />

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!date}
          className="min-h-11 flex-1 rounded-full bg-[var(--ember)] px-4 text-sm font-medium text-white disabled:opacity-40"
        >
          Guardar medicion
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--ink-soft)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function SegmentFields({
  segments,
  onChange,
}: {
  segments: BodySegments;
  onChange: (segments: BodySegments) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      <NumField label="Brazo derecho" value={String(segments.armR)} onChange={(v) => onChange({ ...segments, armR: Number(v) || 0 })} />
      <NumField label="Brazo izquierdo" value={String(segments.armL)} onChange={(v) => onChange({ ...segments, armL: Number(v) || 0 })} />
      <NumField label="Tronco" value={String(segments.trunk)} onChange={(v) => onChange({ ...segments, trunk: Number(v) || 0 })} />
      <NumField label="Pierna derecha" value={String(segments.legR)} onChange={(v) => onChange({ ...segments, legR: Number(v) || 0 })} />
      <NumField label="Pierna izquierda" value={String(segments.legL)} onChange={(v) => onChange({ ...segments, legL: Number(v) || 0 })} />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--ember)]"
      />
    </label>
  );
}
