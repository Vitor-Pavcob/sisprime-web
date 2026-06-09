import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "./lib/auth";

// Roda em tudo, exceto assets estáticos e as rotas de auth (senão bloquearia o login).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sisprime-|api/auth).*)"],
};

const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    const loginUrl = new URL("/login", req.url);
    if (pathname && pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}
