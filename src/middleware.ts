import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

// Pages that require a signed-in user
const PROTECTED_ROUTES = ["/feed", "/map", "/post", "/profile", "/quero-visitar", "/ja-visitei"];
// Pages only for signed-out users
const AUTH_ONLY_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!userId && PROTECTED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (userId && AUTH_ONLY_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Pages only: API routes check the session themselves.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
