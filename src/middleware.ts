import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BLOCKED_SESSION_UIDS = new Set(["dev-bypass-admin"]);

function isValidSessionUid(uid: string | undefined): boolean {
  if (!uid) return false;
  if (BLOCKED_SESSION_UIDS.has(uid)) return false;
  return /^[A-Za-z0-9_-]{20,128}$/.test(uid);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("admin_session");
  const sessionUid = session?.value;

  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard && !isValidSessionUid(sessionUid)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (sessionUid) {
      response.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
    }
    return response;
  }

  if (pathname === "/login" && isValidSessionUid(sessionUid)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
