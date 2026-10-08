import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const mockMode = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
  const hasSession = Boolean(request.cookies.get("idap_session"));
  if (!mockMode && !hasSession && request.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
