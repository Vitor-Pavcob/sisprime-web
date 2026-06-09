type Props = {
  value: number;
  max: number;
  color?: string;
  align?: "left" | "right";
  bold?: boolean;
  /** Custom formatter for the displayed value (default: pt-BR number). */
  format?: (v: number) => string;
};

export function BarCell({
  value,
  max,
  color = "#0ea5e9",
  align = "right",
  bold = false,
  format,
}: Props) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const display = format ? format(value) : value.toLocaleString("pt-BR");
  return (
    <td className={`relative px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 rounded-sm"
        style={{
          width: `calc(${pct}% - 2px)`,
          backgroundColor: color,
          opacity: 0.2,
        }}
      />
      <span className={`relative tabular-nums ${bold ? "font-semibold" : "font-medium"} text-content`}>
        {display}
      </span>
    </td>
  );
}
