"use client";

import { getTrainingDayFromDate, getWeekDates } from "@/lib/musculit-state";

// Semana de referencia (sin overrides) solo para derivar el orden Lun-Dom y
// que el finisher de abs se calcule igual que en la app: 2 dias entre Lun-Jue.
const referenceWeek = getWeekDates(new Date()).map((date) => getTrainingDayFromDate(date));

const generalRules = [
  { label: "Descanso entre sets", value: "2 minutos" },
  { label: "Intensidad", value: "Cerca del fallo, sin romper tecnica" },
  { label: "Rango dominante", value: "8-10 reps" },
  { label: "Cardio post-entreno", value: "20 min de escaladora a baja intensidad" },
  { label: "Objetivo", value: "Recomposicion corporal: ganar algo de masa, verte mas marcado, sostener consistencia real" },
];

export default function RutinaPage() {
  return (
    <main className="min-h-screen bg-[#f5efe6] px-6 py-10 text-[#241c17] print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#8a7561]">Musculit.O</p>
            <h1 className="mt-1 font-serif text-4xl">Rutina semanal</h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-11 shrink-0 rounded-full bg-[#c7642d] px-5 text-sm font-medium text-white"
          >
            Guardar como PDF
          </button>
        </div>

        <div className="hidden print:block">
          <p className="text-xs uppercase tracking-[0.28em] text-[#8a7561]">Musculit.O</p>
          <h1 className="mt-1 font-serif text-3xl">Rutina semanal</h1>
        </div>

        <div className="mt-6 grid gap-2 rounded-2xl border border-[#e3d5c2] bg-white/60 p-5 print:mt-4 print:break-inside-avoid print:rounded-none print:border-[#ccc] print:bg-white print:p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8a7561]">Reglas generales</p>
          <div className="mt-1 grid gap-1.5 text-sm leading-6">
            {generalRules.map((rule) => (
              <p key={rule.label}>
                <span className="font-medium">{rule.label}:</span> {rule.value}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 print:mt-4 print:gap-3">
          {referenceWeek.map((day) => (
            <div
              key={day.id}
              className="rounded-2xl border border-[#e3d5c2] bg-white/60 p-5 print:break-inside-avoid print:rounded-none print:border-[#ccc] print:bg-white print:p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8a7561]">
                    {day.label}
                    {day.companion !== "Solo" && day.companion !== "Libre" ? ` · ${day.companion}` : ""}
                  </p>
                  <h2 className="font-serif text-2xl">{day.focus}</h2>
                </div>
                {day.type === "training" && (
                  <p className="shrink-0 text-xs text-[#8a7561]">{day.duration}</p>
                )}
              </div>

              {day.type === "rest" ? (
                <p className="mt-3 text-sm leading-6 text-[#5a4c3f]">{day.notes}</p>
              ) : (
                <>
                  {day.cardio !== "No" && (
                    <p className="mt-2 text-sm text-[#5a4c3f]">Cardio: {day.cardio}</p>
                  )}
                  {day.exercises.length > 0 && (
                    <table className="mt-3 w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[#e3d5c2] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a7561]">
                          <th className="py-1.5 pr-2 font-medium">Ejercicio</th>
                          <th className="py-1.5 pr-2 font-medium">Grupo</th>
                          <th className="py-1.5 font-medium">Series</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.exercises.map((exercise) => (
                          <tr key={exercise.id} className="border-b border-[#eee2d2] last:border-0">
                            <td className="py-1.5 pr-2">{exercise.name}</td>
                            <td className="py-1.5 pr-2 text-[#5a4c3f]">{exercise.group}</td>
                            <td className="py-1.5 font-mono text-[#5a4c3f]">{exercise.sets}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[#8a7561] print:mt-4">
          Musculit.O · Referencia rapida, no reemplaza la app para trackear pesos y sesiones.
        </p>
      </div>
    </main>
  );
}
