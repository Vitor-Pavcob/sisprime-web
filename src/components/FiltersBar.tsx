"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  paramKeys: string[];
  children: ReactNode;
};

export function FiltersBar({ paramKeys, children }: Props) {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Garante que createPortal só roda no client
  useEffect(() => setMounted(true), []);

  const activeCount = paramKeys.reduce((acc, k) => {
    const v = params.get(k);
    return acc + (v && v.split(",").filter(Boolean).length > 0 ? 1 : 0);
  }, 0);

  // Esc fecha + bloqueia scroll do body enquanto aberto
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Drawer + backdrop são renderizados em <body> via portal —
  // assim escapam de ancestrais com backdrop-filter / transform / contain
  // que criariam containing block pra position:fixed.
  const overlay = (
    <>
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        className={`fixed left-0 top-0 z-[70] flex h-full w-[400px] max-w-[90vw] flex-col bg-card transition-[transform,box-shadow] duration-300 ease-out ${
          open
            ? "translate-x-0 shadow-2xl ring-1 ring-line"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            <h3 className="text-base font-semibold text-content">Filtros</h3>
            {activeCount > 0 && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {activeCount} ativo{activeCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar filtros"
            className="rounded-full p-1.5 text-content-muted transition hover:bg-card-soft hover:text-content"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-4 [&>*]:w-full">{children}</div>
        </div>
      </aside>
    </>
  );

  return (
    <>
      <div className="flex items-center justify-start gap-2 py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-card px-3 py-1.5 text-sm font-medium text-content shadow-sm transition hover:bg-card-soft"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          <span>Filtros</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
