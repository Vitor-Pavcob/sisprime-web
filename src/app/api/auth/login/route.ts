import { NextResponse } from "next/server";
import { COOKIE_NAME, createSessionToken, getSessionDuration, verifyCredentials } from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: { login?: string; senha?: string; remember?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const login = (body.login ?? "").trim();
  const senha = body.senha ?? "";
  if (!login || !senha) {
    return NextResponse.json({ error: "Informe usuário e senha." }, { status: 400 });
  }

  const user = await verifyCredentials(login, senha);
  if (!user) {
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  const maxAge = getSessionDuration(!!body.remember);
  const token = await createSessionToken(user, maxAge);
  const res = NextResponse.json({ ok: true, login: user.login });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
