"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { getNextCheckinDate, progressPhotoAngles, sortCheckinsDesc } from "@/lib/progress-checkin-data";
import { resizeImageToDataUrl } from "@/lib/image-resize";
import { AppState, ProgressCheckin, ProgressPhotoAngle, fromIsoDate, toIsoDate } from "@/lib/musculit-state";

type ProgressCheckinCardProps = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  todayIso: string;
};

export function ProgressCheckinCard({ state, setState, todayIso }: ProgressCheckinCardProps) {
  const checkins = sortCheckinsDesc(state.progressCheckins);
  const latest = checkins[0] ?? null;
  const nextIso = latest ? toIsoDate(getNextCheckinDate(fromIsoDate(latest.date))) : todayIso;
  const isDue = todayIso >= nextIso;
  const alreadyDoneToday = checkins.some((c) => c.date === todayIso);

  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [photos, setPhotos] = useState<Partial<Record<ProgressPhotoAngle, string>>>({});
  const [busyAngle, setBusyAngle] = useState<ProgressPhotoAngle | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(angle: ProgressPhotoAngle, file: File | undefined) {
    if (!file) return;
    setBusyAngle(angle);
    setError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setPhotos((current) => ({ ...current, [angle]: dataUrl }));
    } catch {
      setError("No se pudo procesar esa foto, intenta de nuevo.");
    } finally {
      setBusyAngle(null);
    }
  }

  function save() {
    const weightKg = Number(weight);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setError("Ingresa un peso valido.");
      return;
    }
    const capturedPhotos = progressPhotoAngles
      .filter((angle) => photos[angle.id])
      .map((angle) => ({ angle: angle.id, imageData: photos[angle.id]! }));

    if (capturedPhotos.length === 0) {
      setError("Agrega al menos una foto.");
      return;
    }

    const checkin: ProgressCheckin = {
      id: `checkin-${todayIso}`,
      date: todayIso,
      weightKg,
      photos: capturedPhotos,
    };

    setState((current) => ({
      ...current,
      progressCheckins: [...current.progressCheckins.filter((c) => c.date !== todayIso), checkin],
    }));

    setOpen(false);
    setWeight("");
    setPhotos({});
    setError(null);
  }

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Chequeo mensual</p>
        {isDue && !alreadyDoneToday && (
          <span className="rounded-full bg-[var(--ember-soft)] px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-[#ffd39e]">
            Toca hoy
          </span>
        )}
      </div>

      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
        {latest
          ? `Ultimo chequeo: ${latest.date} · ${latest.weightKg} kg. Proximo: ${nextIso}.`
          : "Peso + 4 fotos (frente, espalda, costado, biceps) una vez al mes, para ver como cambia tu cuerpo con el tiempo."}
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 min-h-11 w-full rounded-full bg-[var(--ember)] px-4 text-sm font-medium text-white"
        >
          {alreadyDoneToday ? "Actualizar chequeo de hoy" : latest ? "Registrar chequeo de hoy" : "Registrar primer chequeo"}
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">Peso (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="min-h-11 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none focus:border-[var(--ember)]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            {progressPhotoAngles.map((angle) => (
              <div key={angle.id} className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--ink-soft)]">{angle.label}</span>
                <label className="relative block aspect-[3/4] cursor-pointer overflow-hidden rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--panel-strong)]">
                  {photos[angle.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL local, no aplica next/image
                    <img src={photos[angle.id]} alt={angle.label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[10px] leading-4 text-[var(--ink-soft)]">
                      {busyAngle === angle.id ? "Procesando..." : angle.hint}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFile(angle.id, e.target.files?.[0])}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="min-h-11 flex-1 rounded-full bg-[var(--ember)] px-4 text-sm font-medium text-white"
            >
              Guardar chequeo
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="min-h-11 rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--ink-soft)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {checkins.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--line-soft)] pt-4">
          {checkins.map((checkin) => (
            <div key={checkin.id} className="flex items-center gap-3">
              <div className="flex gap-1">
                {checkin.photos.map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL local, no aplica next/image
                  <img
                    key={photo.angle}
                    src={photo.imageData}
                    alt={photo.angle}
                    className="h-14 w-10 rounded-md border border-[var(--line-soft)] object-cover"
                  />
                ))}
              </div>
              <div>
                <p className="text-sm font-medium">{checkin.date}</p>
                <p className="text-xs text-[var(--ink-soft)]">{checkin.weightKg} kg</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
