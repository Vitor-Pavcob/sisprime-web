// CRUD de usuários — só master. GET lista · POST cria.
import { NextResponse } from "next/server";
import { getUserFromRequest, hashPassword, listUsers, saveUsers, type Role, type StoredUser } from "@/lib/auth";

export const runtime = "edge";

const semSegredo = (u: StoredUser) => ({ login: u.login, nome: u.nome ?? null, role: u.role === "master" ? "master" : "user" });
const normLogin = (s: string) => s.trim().toLowerCase();
const validRole = (r: unknown): r is Role => r === "master" || r === "user";

async function requireMaster(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 }) };
  if (user.role !== "master") return { error: NextResponse.json({ ok: false, error: "Apenas master pode gerenciar usuários" }, { status: 403 }) };
  return { user };
}

export async function GET(req: Request) {
  const guard = await requireMaster(req);
  if (guard.error) return guard.error;
  const users = await listUsers();
  return NextResponse.json({ ok: true, users: users.map(semSegredo) });
}

export async function POST(req: Request) {
  const guard = await requireMaster(req);
  if (guard.error) return guard.error;

  let body: { login?: string; nome?: string; password?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const login = normLogin(body.login ?? "");
  const nome = body.nome?.toString().trim() || login;
  const password = body.password ?? "";
  const role: Role = validRole(body.role) ? body.role : "user";

  if (!login) return NextResponse.json({ ok: false, error: "Login é obrigatório" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ ok: false, error: "Senha precisa ter ao menos 6 caracteres" }, { status: 400 });

  const all = await listUsers();
  if (all.some((u) => u.login.toLowerCase() === login)) {
    return NextResponse.json({ ok: false, error: "Já existe usuário com esse login" }, { status: 409 });
  }

  const { salt, hash } = await hashPassword(password);
  const novo: StoredUser = { login, nome, salt, hash, role };
  await saveUsers([...all, novo]);
  return NextResponse.json({ ok: true, user: semSegredo(novo) });
}
