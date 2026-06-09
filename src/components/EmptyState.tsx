export function EmptyState({
  title = "Sem dados no período",
  hint = "Tente ajustar os filtros ou ampliar o intervalo de datas.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.3-4.3M8 11h6" />
      </svg>
      <div className="text-sm font-medium text-content">{title}</div>
      <div className="text-xs text-content-muted">{hint}</div>
    </div>
  );
}
