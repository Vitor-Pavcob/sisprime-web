"use client";

import { useState } from "react";

export function LoginForm({ from }: { from: string }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, senha, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        setLoading(false);
        return;
      }
      window.location.href = from || "/ativas";
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sky-200/70">Usuário</span>
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoFocus
          autoComplete="username"
          className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-sky-300 focus:bg-white/15"
          placeholder="seu.usuario"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sky-200/70">Senha</span>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-sky-300 focus:bg-white/15"
          placeholder="••••••••"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-sky-100/80">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-white/30 bg-white/10" />
        Manter conectado por 30 dias
      </label>

      {error && (
        <div className="rounded-lg border border-red-300/40 bg-red-500/15 px-3 py-2 text-sm text-red-100">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-gradient-to-r from-[#1e88e5] to-[#00a0df] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
