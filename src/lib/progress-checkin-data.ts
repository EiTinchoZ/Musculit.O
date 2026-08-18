import { ProgressCheckin, ProgressPhotoAngle } from "@/lib/musculit-state";

export const progressPhotoAngles: { id: ProgressPhotoAngle; label: string; hint: string }[] = [
  { id: "front", label: "Frente", hint: "De pie, brazos relajados a los costados, de frente a la camara." },
  { id: "back", label: "Espalda", hint: "De espaldas a la camara, misma distancia y postura." },
  { id: "side", label: "Costado", hint: "De perfil, brazo relajado a un costado." },
  { id: "biceps", label: "Biceps", hint: "De frente, flexionando ambos brazos." },
];

/**
 * Fin del mes siguiente al mes de `lastCheckinDate`. Sin caso especial para
 * el primer chequeo: si es hoy (un dia cualquiera), el resultado ya cae
 * naturalmente a fin del mes que viene, no del actual.
 */
export function getNextCheckinDate(lastCheckinDate: Date): Date {
  const year = lastCheckinDate.getFullYear();
  const month = lastCheckinDate.getMonth();
  return new Date(year, month + 2, 0);
}

export function getLatestCheckin(checkins: ProgressCheckin[]): ProgressCheckin | null {
  if (!checkins.length) return null;
  return [...checkins].sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function sortCheckinsDesc(checkins: ProgressCheckin[]): ProgressCheckin[] {
  return [...checkins].sort((a, b) => b.date.localeCompare(a.date));
}
