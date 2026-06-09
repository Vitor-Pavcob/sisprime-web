"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * Filtro de período de ajuizamento (cad_processo.entrada). Atalhos relativos
 * agrupados (estilo pavcob DateFilter) + campos de/até manuais.
 * Escreve os params `de` e `ate` (YYYY-MM-DD).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const offset = (d: Date, days: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
};
const startOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const endOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
const startOfYear = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
const startOfQuarter = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1));
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = x.getUTCDay();
  x.setUTCDate(x.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return x;
};
const now = () => new Date();

type Group = "Recentes" | "Período atual" | "Período anterior" | "Janelas móveis";
type Preset = { key: string; label: string; group: Group; calc: () => { de: string; ate: string } };

const PRESETS: Preset[] = [
  { key: "today", label: "Hoje", group: "Recentes", calc: () => ({ de: iso(now()), ate: iso(now()) }) },
  { key: "yesterday", label: "Ontem", group: "Recentes", calc: () => { const y = offset(now(), -1); return { de: iso(y), ate: iso(y) }; } },

  { key: "thisweek", label: "Semana atual", group: "Período atual", calc: () => ({ de: iso(startOfWeek(now())), ate: iso(now()) }) },
  { key: "thismonth", label: "Mês atual", group: "Período atual", calc: () => ({ de: iso(startOfMonth(now())), ate: iso(now()) }) },
  { key: "thisquarter", label: "Trimestre atual", group: "Período atual", calc: () => ({ de: iso(startOfQuarter(now())), ate: iso(now()) }) },
  { key: "thisyear", label: "Ano atual", group: "Período atual", calc: () => ({ de: iso(startOfYear(now())), ate: iso(now()) }) },

  { key: "lastweek", label: "Semana anterior", group: "Período anterior", calc: () => { const s = startOfWeek(now()); return { de: iso(offset(s, -7)), ate: iso(offset(s, -1)) }; } },
  { key: "lastmonth", label: "Mês anterior", group: "Período anterior", calc: () => { const t = now(); const s = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1)); return { de: iso(s), ate: iso(endOfMonth(s)) }; } },
  { key: "lastquarter", label: "Trimestre anterior", group: "Período anterior", calc: () => { const q = startOfQuarter(now()); const s = new Date(Date.UTC(q.getUTCFullYear(), q.getUTCMonth() - 3, 1)); return { de: iso(s), ate: iso(offset(q, -1)) }; } },
  { key: "lastyear", label: "Ano anterior", group: "Período anterior", calc: () => { const y = now().getUTCFullYear() - 1; return { de: `${y}-01-01`, ate: `${y}-12-31` }; } },

  { key: "last7", label: "Últimos 7 dias", group: "Janelas móveis", calc: () => ({ de: iso(offset(now(), -7)), ate: iso(now()) }) },
  { key: "last30", label: "Últimos 30 dias", group: "Janelas móveis", calc: () => ({ de: iso(offset(now(), -30)), ate: iso(now()) }) },
  { key: "last90", label: "Últimos 90 dias", group: "Janelas móveis", calc: () => ({ de: iso(offset(now(), -90)), ate: iso(now()) }) },
  { key: "last6m", label: "Últimos 6 meses", group: "Janelas móveis", calc: () => { const t = now(); const f = new Date(t); f.setUTCMonth(f.getUTCMonth() - 6); return { de: iso(f), ate: iso(t) }; } },
  { key: "last12m", label: "Últimos 12 meses", group: "Janelas móveis", calc: () => { const t = now(); const f = new Date(t); f.setUTCFullYear(f.getUTCFullYear() - 1); return { de: iso(f), ate: iso(t) }; } },
  { key: "last3y", label: "Últimos 3 anos", group: "Janelas móveis", calc: () => { const t = now(); const f = new Date(t); f.setUTCFullYear(f.getUTCFullYear() - 3); return { de: iso(f), ate: iso(t) }; } },
];

const GROUP_ORDER: Group[] = ["Recentes", "Período atual", "Período anterior", "Janelas móveis"];

const formatBr = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };

export function PeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const rawDe = params.get("de");
  const rawAte = params.get("ate");
  const de = rawDe && DATE_RE.test(rawDe) ? rawDe : "";
  const ate = rawAte && DATE_RE.test(rawAte) ? rawAte : "";
  const hasRange = !!(de || ate);

  const activePreset = PRESETS.find((p) => { const r = p.calc(); return r.de === de && r.ate === ate; });

  function set(next: { de?: string | null; ate?: string | null }) {
    const np = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v) np.delete(k);
      else np.set(k, v);
    }
    startTransition(() => router.replace(`${pathname}?${np.toString()}`, { scroll: false }));
  }

  function applyPreset(key: string) {
    const p = PRESETS.find((x) => x.key === key);
    if (p) set(p.calc());
  }

  return (
    <div className={`flex flex-col gap-2 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-muted">
          Período de ajuizamento
        </span>
        {hasRange && (
          <button
            type="button"
            onClick={() => set({ de: null, ate: null })}
            className="rounded-md px-2 py-0.5 text-[11px] font-medium text-content-muted transition hover:text-content"
          >
            Limpar
          </button>
        )}
      </div>

      {hasRange && (
        <div className="text-[11px] text-content-muted">
          <span className="font-medium text-content">{formatBr(de || ate)}</span>
          {" até "}
          <span className="font-medium text-content">{formatBr(ate || de)}</span>
          {activePreset && (
            <span className="ml-2 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
              {activePreset.label}
            </span>
          )}
        </div>
      )}

      <select
        value={activePreset?.key ?? ""}
        onChange={(e) => applyPreset(e.target.value)}
        className="w-full rounded-md border border-line-strong bg-card px-2 py-1.5 text-sm text-content shadow-sm outline-none focus:border-sky-400"
      >
        <option value="" disabled>Atalho relativo…</option>
        {GROUP_ORDER.map((g) => (
          <optgroup key={g} label={g}>
            {PRESETS.filter((p) => p.group === g).map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={de}
          max={ate || undefined}
          onChange={(e) => set({ de: e.target.value || null })}
          className="w-full rounded-md border border-line-strong bg-card px-2 py-1.5 text-sm text-content outline-none focus:border-sky-400"
        />
        <span className="text-content-subtle">→</span>
        <input
          type="date"
          value={ate}
          min={de || undefined}
          onChange={(e) => set({ ate: e.target.value || null })}
          className="w-full rounded-md border border-line-strong bg-card px-2 py-1.5 text-sm text-content outline-none focus:border-sky-400"
        />
      </div>
    </div>
  );
}
