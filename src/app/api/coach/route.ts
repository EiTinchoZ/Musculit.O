import { NextResponse } from "next/server";
import { loadPersistedAppState } from "@/lib/app-state-store";
import { getDerivedStats, getHabitPeriodKey, toIsoDate } from "@/lib/musculit-state";
import { habits } from "@/lib/habits-data";

type CoachMode = "summary" | "analysis";

const GROQ_MODELS: Record<CoachMode, string> = {
  summary: "llama-3.1-8b-instant",
  analysis: "llama-3.3-70b-versatile",
};

const SYSTEM_PROMPTS: Record<CoachMode, string> = {
  summary:
    "Sos el coach de Musculit.O, la app personal de entrenamiento de Martin (Tin). Da un resumen breve, directo y motivador de su semana de entrenamiento en base a los datos que te paso. Maximo 120 palabras, en espanol, sin emojis, tono cercano pero sin relleno ni frases genericas.",
  analysis:
    "Sos el coach de Musculit.O, la app personal de entrenamiento de Martin (Tin). Analiza su progreso: compara el desempeno actual contra el objetivo declarado, identifica patrones reales en los datos (consistencia, pesos registrados, cardio, journal), y da 2-3 recomendaciones concretas y accionables. Espanol, sin emojis, directo, maximo 300 palabras. Si los datos son insuficientes para algo, decilo en vez de inventar.",
};

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GROQ_API_KEY no esta configurada en el servidor." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { mode?: string };
  const mode: CoachMode = body.mode === "analysis" ? "analysis" : "summary";

  const { state } = await loadPersistedAppState();
  const todayIso = toIsoDate(new Date());
  const stats = getDerivedStats(state, todayIso);

  const recentSessions = Object.values(state.sessions)
    .filter((session) => session.completedExerciseIds.length > 0 || session.completedCardio || session.journal)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 14);

  const today = new Date();
  const habitoyKey = getHabitPeriodKey(today, "daily");
  const habitosHoy = state.habitCompletions[habitoyKey] ?? [];
  const habitosRecientes = Object.entries(state.habitCompletions)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 14)
    .map(([periodo, ids]) => ({
      periodo,
      completados: ids.map((id) => habits.find((h) => h.id === id)?.label ?? id),
    }));

  const context = {
    perfil: state.user,
    stats: {
      nivel: stats.level,
      totalXp: stats.totalXp,
      racha: stats.streak,
      rachaMax: stats.maxStreak,
      consistencia: `${stats.consistency}%`,
      estaSemana: `${stats.thisWeekCompleted}/${stats.thisWeekScheduled} dias completados`,
    },
    sesionesRecientes: recentSessions.map((session) => ({
      fecha: session.date,
      dia: session.dayId,
      ejerciciosCompletados: session.completedExerciseIds.length,
      cardioCompletado: session.completedCardio,
      journal: session.journal || null,
      pesos: session.setWeights,
    })),
    habitosHoy: habitosHoy.map((id) => habits.find((h) => h.id === id)?.label ?? id),
    habitosRecientes,
  };

  if (recentSessions.length === 0) {
    return NextResponse.json({
      ok: true,
      mode,
      text: "Todavia no hay sesiones registradas para analizar. Anota algunos entrenamientos en el tab Hoy y volve a pedirme el resumen.",
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODELS[mode],
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[mode] },
          { role: "user", content: JSON.stringify(context) },
        ],
        temperature: 0.6,
        max_tokens: mode === "summary" ? 220 : 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Groq respondio ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("Groq no devolvio contenido.");
    }

    return NextResponse.json({ ok: true, mode, text });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo consultar al coach.",
      },
      { status: 502 },
    );
  }
}
