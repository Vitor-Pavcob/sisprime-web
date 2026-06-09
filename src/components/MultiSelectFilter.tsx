"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

type Props = {
  paramKey: string;
  allLabel: string;
  singularHint: string;
  pluralHint: string;
  options: string[];
  icon?: ReactNode;
};

export function MultiSelectFilter({
  paramKey,
  allLabel,
  singularHint,
  pluralHint,
  options,
  icon,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () =>
      new Set(
        (params.get(paramKey) || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    [params, paramKey]
  );

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function apply(next: Set<string>) {
    const np = new URLSearchParams(params);
    if (next.size === 0) np.delete(paramKey);
    else np.set(paramKey, [...next].join(","));
    startTransition(() => router.replace(`${pathname}?${np.toString()}`, { scroll: false }));
  }

  function toggle(op: string) {
    const next = new Set(selected);
    if (next.has(op)) next.delete(op);
    else next.add(op);
    apply(next);
  }

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const label =
    selected.size === 0
      ? allLabel
      : selected.size === 1
      ? [...selected][0]
      : `${selected.size} ${pluralHint}`;

  return (
    <div ref={rootRef} className={`relative ${pending ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-card px-3 py-1 text-sm text-content shadow-sm hover:bg-card-soft"
      >
        {icon}
        <span className="max-w-[180px] truncate">{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-80 rounded-lg border border-line bg-card shadow-lg">
          <div className="border-b border-line p-2">
            <input
              type="text"
              autoFocus
              placeholder={`Buscar ${singularHint}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-line px-2 py-1.5 text-sm outline-none focus:border-sky-400"
            />
          </div>
          <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-xs">
            <div className="text-content-muted">
              {selected.size} de {options.length} selecionados
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => apply(new Set(options))}
                className="font-medium text-sky-700 hover:text-sky-900"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => apply(new Set())}
                className="font-medium text-content-muted hover:text-content"
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-content-muted">
                Nenhum resultado
              </div>
            )}
            {filtered.map((op) => (
              <label
                key={op}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-card-soft"
              >
                <input
                  type="checkbox"
                  checked={selected.has(op)}
                  onChange={() => toggle(op)}
                  className="h-4 w-4 rounded border-line-strong text-sky-600"
                />
                <span className="flex-1 truncate text-content">{op}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
