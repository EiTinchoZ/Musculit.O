import { NextResponse } from "next/server";
import { PASSCODE_COOKIE, sha256Hex } from "@/lib/passcode-edge";

export async function POST(request: Request) {
  const expectedPasscode = process.env.MUSCULIT_PASSCODE;
  if (!expectedPasscode) {
    return NextResponse.json(
      { ok: false, error: "MUSCULIT_PASSCODE no esta configurada en el servidor." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { passcode?: string };

  if (body.passcode !== expectedPasscode) {
    return NextResponse.json({ ok: false, error: "Passcode incorrecto." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(PASSCODE_COOKIE, await sha256Hex(expectedPasscode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return response;
}
