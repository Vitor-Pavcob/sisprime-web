// PUT edita (senha/nome/role) · DELETE remove. Só master.
import { NextResponse } from "next/server";
import { getUserFromRequest, hashPassword, listUsers, saveUsers, type Role, type StoredUser } from "@/lib/auth";

export const runtime = "edge";

const semSegredo = (u: StoredUser) => ({ login: u.login, nome: u.nome ?? null, role: u.role === "master" ? "master" : "user" });
const validRole = (r: unknown): r is Role => r === "master" || r === "user";

async function requireMaster(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 }) };
  if (user.role !== "master") return { error: NextResponse.json({ ok: false, error: "Apenas master pode gerenciar usuários" }, { status: 403 }) };
  return { user };
}

export async function PUT(req: Request, { params }: { params: Promise<{ login: string }> }) {
  const guard = await requireMaster(req);
  if (guard.error) return guard.error;
  const target = (await params).login.toLowerCase();

  let body: { nome?: string; password?: string | null; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const all = await listUsers();
  const idx = all.findIndex((u) => u.login.toLowerCase() === target);
  if (idx < 0) return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 });

  const updated: StoredUser = { ...all[idx] };
  if (body.nome !== undefined) updated.nome = body.nome.toString().trim() || updated.login;
  if (body.password) {
    if (body.password.length < 6) return NextResponse.json({ ok: false, error: "Senha precisa ter ao menos 6 caracteres" }, { status: 400 });
    const { salt, hash } = await hashPassword(body.password);
    updated.salt = salt;
    updated.hash = hash;
  }
  if (body.role !== undefined) {
    if (!validRole(body.role)) return NextResponse.json({ ok: false, error: "Role inválido" }, { status: 400 });
    // não deixar rebaixar o último master
    if (all[idx].role === "master" && body.role !== "master" && all.filter((u) => u.role === "master").length <= 1) {
      return NextResponse.json({ ok: false, error: "Não é possível rebaixar o último master" }, { status: 400 });
    }
    updated.role = body.role;
  }

  const next = [...all];
  next[idx] = updated;
  await saveUsers(next);
  return NextResponse.json({ ok: true, user: semSegredo(updated) });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ login: string }> }) {
  const guard = await requireMaster(req);
  if (guard.error) return guard.error;
  const target = (await params).login.toLowerCase();

  if (guard.user!.login.toLowerCase() === target) {
    return NextResponse.json({ ok: false, error: "Não é possível excluir o próprio usuário" }, { status: 400 });
  }
  const all = await listUsers();
  const idx = all.findIndex((u) => u.login.toLowerCase() === target);
  if (idx < 0) return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 });
  if (all[idx].role === "master" && all.filter((u) => u.role === "master").length <= 1) {
    return NextResponse.json({ ok: false, error: "Não é possível excluir o último master" }, { status: 400 });
  }
  await saveUsers(all.filter((_, i) => i !== idx));
  return NextResponse.json({ ok: true });
}
