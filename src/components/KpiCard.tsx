type AccentColor = "azure" | "navy" | "cyan" | "emerald" | "amber" | "red";

type Props = {
  label: string;
  value: number | string | null | undefined;
  /** Métrica complementar exibida abaixo do valor principal (ex.: percentual). */
  subValue?: string;
  hint?: string;
  accent?: AccentColor;
  compact?: boolean; // valor com texto menor — bom pra strings longas (nomes)
};

const ACCENT_GLOW: Record<AccentColor, string> = {
  azure: "bg-[#1e88e5]/20",
  navy: "bg-[#3b82f6]/15",
  cyan: "bg-[#00a0df]/20",
  emerald: "bg-[#10b981]/15",
  amber: "bg-[#f59e0b]/15",
  red: "bg-[#ef4444]/15",
};

const ACCENT_BAR: Record<AccentColor, string> = {
  azure: "bg-[#1e88e5]",
  navy: "bg-[#5eb3f2]",
  cyan: "bg-[#00a0df]",
  emerald: "bg-[#10b981]",
  amber: "bg-[#f59e0b]",
  red: "bg-[#ef4444]",
};

export function KpiCard({ label, value, subValue, hint, accent = "azure", compact = false }: Props) {
  const display =
    value === null || value === undefined
      ? "—"
      : typeof value === "number"
      ? value.toLocaleString("pt-BR")
      : value;

  const valueClass = compact
    ? "mt-2 text-xl font-semibold leading-tight tracking-tight text-white"
    : "mt-2 text-3xl font-semibold leading-none tracking-tight text-white tabular-nums";

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl p-5 shadow-card ring-1 ring-black/20 transition-shadow hover:shadow-card-hover dark:ring-white/5">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#082b4a] via-[#0c3457] to-[#103f6b]" />
      <div className={`absolute -right-6 -top-6 -z-10 h-32 w-32 rounded-full blur-2xl ${ACCENT_GLOW[accent]}`} />
      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-r ${ACCENT_BAR[accent]}`} />

      <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-200/70">
        {label}
      </div>
      <div className={valueClass}>{display}</div>
      {subValue && (
        <div className="mt-1 text-base font-semibold tabular-nums text-sky-100">
          {subValue}
        </div>
      )}
      {hint && <div className="mt-auto pt-3 text-xs text-slate-300">{hint}</div>}
    </div>
  );
}
