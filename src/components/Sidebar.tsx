"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

// Ícones (20x20) relacionados a cada página.
const AtivasIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7" /><path d="M8 7h9v9" />
  </svg>
);
const PassivasIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l8 3v6c0 4.4-3.4 7.4-8 9-4.6-1.6-8-4.6-8-9V6l8-3z" /><path d="M9.3 12l2 2 3.4-3.5" />
  </svg>
);
const PropostasIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 17l2 2a1 1 0 0 0 1.4-1.4" />
    <path d="M14 13l3 3a1 1 0 0 0 1.4-1.4l-1.6-1.6" />
    <path d="M17 11l1.6 1.6a1 1 0 0 0 1.4-1.4L18 9.2V6l-3-3-3 1-3-1-3 3v3l-2 2 4 4 2-2h2l3 3" />
  </svg>
);
const ContabIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5v5M18 9.5v5" />
  </svg>
);
const ResultadoIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4.5a1.5 1.5 0 0 0 1.5 3.2" /><path d="M17 6h2.5a1.5 1.5 0 0 1-1.5 3.2" />
  </svg>
);

const UsuariosIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NAV = [
  { href: "/ativas", label: "Ações Ativas", icon: AtivasIcon },
  { href: "/passivas", label: "Ações Passivas", icon: PassivasIcon },
  { href: "/propostas", label: "Propostas", icon: PropostasIcon },
  { href: "/contabilizacoes", label: "Contabilizações", icon: ContabIcon },
  { href: "/resultado", label: "Resultado", icon: ResultadoIcon },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [hover, setHover] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expanded = hover;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsMaster(d?.user?.role === "master"))
      .catch(() => {});
  }, []);

  const navItems = isMaster ? [...NAV, { href: "/usuarios", label: "Usuários", icon: UsuariosIcon }] : NAV;

  const onEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHover(true);
  };
  const onLeave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHover(false), 160);
  };

  // Em fullscreen, o rail some pela esquerda até o mouse encostar na borda;
  // fora do fullscreen fica sempre visível e só expande no hover.
  const transformCls = fullscreen && !hover ? "-translate-x-full" : "translate-x-0";

  return (
    <>
      {/* Zona invisível na borda esquerda — só em fullscreen, revela o sidebar */}
      {fullscreen && (
        <div className="fixed left-0 top-0 z-40 h-screen w-2.5" onMouseEnter={onEnter} onMouseLeave={onLeave} aria-hidden />
      )}
      <aside
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className={
          "fixed inset-y-0 left-0 z-50 flex w-14 flex-col border-r border-line bg-card transition-[width,transform] duration-200 ease-out " +
          (expanded ? "md:w-60 shadow-2xl " : "") + transformCls
        }
        aria-label="Navegação principal"
      >
      {/* Marca — colapsado: só o símbolo · expandido: logo completa, maior e centralizada (crossfade) */}
      <div className="relative flex h-16 items-center justify-center overflow-hidden border-b border-line px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sisprime-symbol.png"
          alt="Sisprime"
          className={"h-8 w-8 object-contain transition-opacity duration-150 " + (expanded ? "opacity-0" : "opacity-100")}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sisprime-logo.svg"
          alt="Sisprime do Brasil"
          className={"absolute inset-0 m-auto h-11 w-auto max-w-[80%] object-contain transition-opacity duration-200 dark:brightness-0 dark:invert " + (expanded ? "opacity-100" : "opacity-0")}
        />
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={!expanded ? item.label : undefined}
                  className={
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition " +
                    (active ? "bg-brand text-white shadow-sm" : "text-content hover:bg-card-strong")
                  }
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
                  <span className={"whitespace-nowrap transition-opacity duration-150 " + (expanded ? "opacity-100" : "opacity-0")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Tema + sair */}
      <div className="border-t border-line px-2 py-3">
        <ThemeToggleRow expanded={expanded} />
        <LogoutRow expanded={expanded} />
      </div>
      </aside>
    </>
  );
}

function LogoutRow({ expanded }: { expanded: boolean }) {
  const [user, setUser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user?.nome || d?.user?.login || null))
      .catch(() => {});
  }, []);
  async function sair() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }
  return (
    <button
      type="button"
      onClick={sair}
      disabled={busy}
      title={!expanded ? "Sair" : undefined}
      className="mt-1 flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-content-muted transition hover:bg-card-strong hover:text-content"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
        </svg>
      </span>
      <span className={"min-w-0 flex-1 truncate text-left whitespace-nowrap transition-opacity duration-150 " + (expanded ? "opacity-100" : "opacity-0")}>
        {user ? `Sair · ${user}` : "Sair"}
      </span>
    </button>
  );
}

function ThemeToggleRow({ expanded }: { expanded: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9" aria-hidden />;
  const isDark = (resolvedTheme ?? theme) === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={!expanded ? (isDark ? "Tema claro" : "Tema escuro") : undefined}
      className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-content-muted transition hover:bg-card-strong hover:text-content"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {isDark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
        )}
      </span>
      <span className={"whitespace-nowrap transition-opacity duration-150 " + (expanded ? "opacity-100" : "opacity-0")}>
        {isDark ? "Tema claro" : "Tema escuro"}
      </span>
    </button>
  );
}
