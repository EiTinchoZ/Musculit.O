import { NextResponse } from "next/server";
import { loadPersistedAppState, savePersistedAppState } from "@/lib/app-state-store";
import { AppState } from "@/lib/musculit-state";

export async function GET() {
  const payload = await loadPersistedAppState();
  return NextResponse.json(payload);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as AppState;
    const result = await savePersistedAppState(body);
    return NextResponse.json({
      ok: true,
      storageMode: result.storageMode,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo guardar el estado",
      },
      { status: 500 },
    );
  }
}
