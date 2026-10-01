import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const deny = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

/** Gatekeeper: CSRF origin check for API writes, then require a valid session for everything except /login, /api/auth and /api/health. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Defence in depth on top of SameSite=Lax: browsers always send Origin on cross-site writes.
  if (isApi && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const hosts = [req.headers.get("host"), req.headers.get("x-forwarded-host")];
    if (origin && !hosts.includes(new URL(origin).host)) return deny(403, "BAD_ORIGIN", "Cross-origin requests are not allowed.");
  }

  if (pathname.startsWith("/api/auth/")) return NextResponse.next(); // public: login, register, logout

  const token = req.cookies.get("session")?.value;
  if (token && process.env.AUTH_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ["HS256"] });
      return NextResponse.next();
    } catch {
      /* invalid or expired: fall through */
    }
  }
  if (isApi) return deny(401, "UNAUTHENTICATED", "Please sign in to continue.");
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/health).*)"] };
