"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";

export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir } | null;

export type SortableColumn = {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean; // default true
  thClass?: string;
};

/**
 * Row com células PRÉ-RENDERIZADAS (cada uma já é um <td>...</td>).
 * Construído no server component, passado serializado pro client.
 * `sortValues` é paralelo ao array de columns — usado para ordenar.
 */
export type SortableRow = {
  id: string;
  cells: ReactNode[];
  sortValues: (number | string | null | undefined)[];
};

type Props = {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Substitui o bloco título+subtítulo. */
  header?: ReactNode;
  controls?: ReactNode;
  columns: SortableColumn[];
  rows: SortableRow[];
  initialSort?: SortState;
  /** <tr>...</tr> pré-renderizado para o tfoot. */
  footer?: ReactNode;
  emptyMessage?: string;
  className?: string;
  bodyClassName?: string;
};

function alignToClass(a: SortableColumn["align"]): string {
  if (a === "right") return "text-right";
  if (a === "center") return "text-center";
  return "text-left";
}

function compareValues(
  a: number | string | null | undefined,
  b: number | string | null | undefined
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls ao final
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true });
}

export function SortableCard({
  title,
  subtitle,
  header,
  controls,
  columns,
  rows,
  initialSort = null,
  footer,
  emptyMessage = "Sem dados.",
  className = "",
  bodyClassName = "",
}: Props) {
  const [sort, setSort] = useState<SortState>(initialSort);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const idx = columns.findIndex((c) => c.key === sort.key);
    if (idx < 0) return rows;
    const m = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort(
      (a, b) => compareValues(a.sortValues[idx], b.sortValues[idx]) * m
    );
  }, [rows, sort, columns]);

  function handleHeaderClick(col: SortableColumn) {
    if (col.sortable === false) return;
    if (sort?.key === col.key) {
      setSort(sort.dir === "asc" ? { key: col.key, dir: "desc" } : null);
    } else {
      setSort({ key: col.key, dir: "asc" });
    }
  }

  return (
    <section className={`rounded-xl bg-card p-6 shadow-card ring-1 ring-line ${className}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        {header ?? (
          <div>
            {title && <h2 className="text-lg font-semibold text-content">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-content-muted">{subtitle}</p>}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          {sort && (
            <button
              type="button"
              onClick={() => setSort(null)}
              className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-card px-2 py-1 text-[11px] font-medium text-content-muted transition hover:bg-card-soft hover:text-content"
              title="Volta à ordem original da tabela"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M6 12h12M9 18h6" />
                <path d="M19 5l-2 2M19 9l-2-2" />
              </svg>
              Limpar ordenação
            </button>
          )}
        </div>
      </div>

      <div className={`overflow-x-auto ${bodyClassName}`}>
        <table className="w-full text-sm">
          <thead className="bg-card-soft text-xs uppercase tracking-wide text-content-muted">
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                const isActive = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={isSortable ? () => handleHeaderClick(col) : undefined}
                    aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`px-3 py-2 ${alignToClass(col.align)} ${
                      isSortable ? "cursor-pointer select-none transition hover:text-content" : ""
                    } ${col.thClass ?? ""}`}
                  >
                    <span
                      className={`inline-flex items-center gap-1 ${
                        col.align === "right" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span>{col.header}</span>
                      {isSortable && <SortIcon active={isActive} dir={isActive ? sort.dir : null} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-xs text-content-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.id} className="hover:bg-card-soft/60">
                  {row.cells.map((cell, i) => (
                    <Fragment key={i}>{cell}</Fragment>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {footer && sorted.length > 0 && <tfoot>{footer}</tfoot>}
        </table>
      </div>
    </section>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir | null }) {
  if (!active) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-40"
      >
        <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
      </svg>
    );
  }
  return dir === "asc" ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand">
      <path d="M6 14l6-6 6 6" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand">
      <path d="M6 10l6 6 6-6" />
    </svg>
  );
}
