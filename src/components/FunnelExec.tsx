/**
 * Funil executivo (apresentacional). Estágios em barras decrescentes com
 * destaque de marca, número principal e conversão entre etapas.
 */
export type FunnelStage = {
  label: string;
  value: string;        // número principal (ex.: "R$ 29,3 mi")
  sub?: string;         // linha secundária (ex.: "492 propostas")
  width: number;        // 0..1 — largura relativa da barra
  conv?: string;        // rótulo de conversão vindo da etapa anterior
};

const GRAD = [
  "linear-gradient(90deg, #082b4a 0%, #0e5fac 100%)",
  "linear-gradient(90deg, #0e5fac 0%, #1e88e5 100%)",
  "linear-gradient(90deg, #1e88e5 0%, #00a0df 100%)",
  "linear-gradient(90deg, #00a0df 0%, #5eb3f2 100%)",
];

export function FunnelExec({ stages }: { stages: FunnelStage[] }) {
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => (
        <div key={s.label}>
          {s.conv && i > 0 && (
            <div className="mb-1 flex items-center gap-1.5 pl-1 text-[11px] font-medium text-content-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
              {s.conv}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="relative h-14 flex-1 overflow-hidden rounded-lg" style={{ maxWidth: `${Math.max(s.width * 100, 28)}%` }}>
              <div className="absolute inset-0" style={{ background: GRAD[i % GRAD.length] }} />
              <div className="relative flex h-full flex-col justify-center px-4 text-white">
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/75">{s.label}</span>
                <span className="text-lg font-semibold leading-tight tabular-nums">{s.value}</span>
              </div>
            </div>
            {s.sub && <span className="text-sm tabular-nums text-content-muted">{s.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
