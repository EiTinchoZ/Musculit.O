"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CandadoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--page-background)] px-4 text-[var(--ink-strong)]">
      <Suspense fallback={null}>
        <CandadoForm />
      </Suspense>
    </main>
  );
}

function CandadoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        throw new Error(payload.error ?? "Passcode incorrecto.");
      }
      router.replace(searchParams.get("next") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passcode incorrecto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--ink-soft)]">Musculit.O</p>
        <h1 className="mt-2 font-serif text-3xl">Espacio privado</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
          Ingresa el passcode para entrar.
        </p>
      </div>
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Passcode"
        aria-label="Passcode"
        className="min-h-11 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--ember)]"
      />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button
        type="submit"
        disabled={loading || !passcode}
        className="min-h-11 rounded-full bg-[var(--ember)] py-3 text-sm font-medium text-white transition disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
