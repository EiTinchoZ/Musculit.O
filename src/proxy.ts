import { NextRequest, NextResponse } from "next/server";
import { PASSCODE_COOKIE, sha256Hex } from "@/lib/passcode-edge";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|candado|api/auth/unlock).*)",
  ],
};

export async function proxy(request: NextRequest) {
  const passcode = process.env.MUSCULIT_PASSCODE;
  // Sin MUSCULIT_PASSCODE configurada, el candado queda desactivado (ej. dev local).
  if (!passcode) return NextResponse.next();

  const cookieValue = request.cookies.get(PASSCODE_COOKIE)?.value;
  const expected = await sha256Hex(passcode);

  if (cookieValue === expected) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/candado";
  url.search = "";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}
