"use client";

import { useState } from "react";

export function CoachTab() {
  const [mode, setMode] = useState<"summary" | "analysis" | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(requestedMode: "summary" | "analysis") {
    setLoading(true);
    setError(null);
    setMode(requestedMode);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: requestedMode }),
      });
      const payload = (await response.json()) as { ok: boolean; text?: string; error?: string };
      if (!payload.ok || !payload.text) {
        throw new Error(payload.error ?? "No se pudo consultar al coach.");
      }
      setText(payload.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar al coach.");
      setText(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">Coach</p>
        <h2 className="mt-1 font-serif text-2xl">¿Como voy?</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
          Le pido a tu historial real que te resuma la semana o te de un analisis mas a fondo contra tu objetivo.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => ask("summary")}
            disabled={loading}
            className="min-h-11 flex-1 rounded-full bg-[var(--ember)] px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading && mode === "summary" ? "Pensando..." : "Resumen semanal"}
          </button>
          <button
            type="button"
            onClick={() => ask("analysis")}
            disabled={loading}
            className="min-h-11 flex-1 rounded-full border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--ink-strong)] disabled:opacity-50"
          >
            {loading && mode === "analysis" ? "Pensando..." : "Analisis completo"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-[rgba(255,95,87,0.4)] bg-[rgba(255,95,87,0.08)] p-4">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {text && !error && (
        <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            {mode === "analysis" ? "Analisis completo" : "Resumen semanal"}
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--ink-strong)]">{text}</p>
        </div>
      )}
    </section>
  );
}
