"use client";

import { useEffect, useState } from "react";

type U = { login: string; nome: string | null; role: "master" | "user" };

export function UsersAdmin() {
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [login, setLogin] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<"user" | "master">("user");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/auth/users");
      const d = await r.json().catch(() => ({}));
      if (r.ok) setUsers(d.users ?? []);
      else setErr(d.error ?? "Falha ao carregar usuários.");
    } catch {
      setErr("Falha de conexão.");
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function flash(setter: (v: string | null) => void, v: string) {
    setter(v);
    setTimeout(() => setter(null), 4000);
  }

  async function call(url: string, opts: RequestInit, okMsg: string) {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(url, opts);
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        flash(setMsg, okMsg);
        await load();
        return true;
      }
      setErr(d.error ?? "Erro na operação.");
    } catch {
      setErr("Falha de conexão.");
    } finally {
      setBusy(false);
    }
    return false;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call(
      "/api/auth/users",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login, nome, password: senha, role }) },
      `Usuário "${login}" criado.`
    );
    if (ok) {
      setLogin("");
      setNome("");
      setSenha("");
      setRole("user");
    }
  }

  const del = (l: string) => {
    if (confirm(`Excluir o usuário "${l}"?`)) call(`/api/auth/users/${encodeURIComponent(l)}`, { method: "DELETE" }, `"${l}" excluído.`);
  };
  const toggleRole = (u: U) => {
    const nr = u.role === "master" ? "user" : "master";
    call(`/api/auth/users/${encodeURIComponent(u.login)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: nr }) }, `"${u.login}" agora é ${nr}.`);
  };
  const resetPass = (l: string) => {
    const p = prompt(`Nova senha para "${l}" (mínimo 6 caracteres):`);
    if (p) call(`/api/auth/users/${encodeURIComponent(l)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: p }) }, `Senha de "${l}" atualizada.`);
  };

  return (
    <div className={busy ? "opacity-70" : ""}>
      {/* Form de criação */}
      <form onSubmit={add} className="mb-6 rounded-xl bg-card p-6 shadow-card ring-1 ring-line">
        <h2 className="mb-3 text-lg font-semibold text-content">Adicionar usuário</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="login (ex.: joao.silva)" className="rounded-md border border-line-strong bg-card px-3 py-2 text-sm text-content outline-none focus:border-sky-400" />
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="nome (opcional)" className="rounded-md border border-line-strong bg-card px-3 py-2 text-sm text-content outline-none focus:border-sky-400" />
          <input value={senha} onChange={(e) => setSenha(e.target.value)} type="text" placeholder="senha (mín. 6)" className="rounded-md border border-line-strong bg-card px-3 py-2 text-sm text-content outline-none focus:border-sky-400" />
          <select value={role} onChange={(e) => setRole(e.target.value as "user" | "master")} className="rounded-md border border-line-strong bg-card px-3 py-2 text-sm text-content outline-none focus:border-sky-400">
            <option value="user">Usuário</option>
            <option value="master">Master</option>
          </select>
        </div>
        <button type="submit" disabled={busy} className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
          Criar usuário
        </button>
      </form>

      {err && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-200">{err}</div>}
      {msg && <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200">{msg}</div>}

      {/* Lista */}
      <div className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-line">
        <table className="w-full text-sm">
          <thead className="bg-card-soft text-xs uppercase tracking-wide text-content-muted">
            <tr>
              <th className="px-4 py-2 text-left">Login</th>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-center">Perfil</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-content-muted">Carregando…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-content-muted">Nenhum usuário.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.login} className="hover:bg-card-soft/60">
                  <td className="px-4 py-2 font-medium text-content">{u.login}</td>
                  <td className="px-4 py-2 text-content-muted">{u.nome || "—"}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.role === "master" ? "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200" : "bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200"}`}>
                      {u.role === "master" ? "Master" : "Usuário"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-2 text-xs">
                      <button onClick={() => resetPass(u.login)} className="rounded-md border border-line-strong px-2 py-1 text-content-muted transition hover:bg-card-soft hover:text-content">Resetar senha</button>
                      <button onClick={() => toggleRole(u)} className="rounded-md border border-line-strong px-2 py-1 text-content-muted transition hover:bg-card-soft hover:text-content">{u.role === "master" ? "Tornar usuário" : "Tornar master"}</button>
                      <button onClick={() => del(u.login)} className="rounded-md border border-red-300 px-2 py-1 text-red-700 transition hover:bg-red-50 dark:border-red-700/60 dark:text-red-300">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-content-subtle">
        Os usuários são gravados no Cloudflare KV. Sem KV configurado (ex.: dev local), a lista vem da env e a edição fica indisponível.
      </p>
    </div>
  );
}
