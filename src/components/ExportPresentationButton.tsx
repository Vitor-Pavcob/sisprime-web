"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ExportItem = {
  id: string;
  label: string;
  el: HTMLElement;
  thumbnail?: string; // dataURL
  width: number;
  height: number;
};

export function ExportPresentationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Exportar apresentação"
        title="Exportar gráficos como PNG"
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-sky-200/80 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <path d="M7 21h10" />
          <path d="M12 17v4" />
          <path d="M8 11l3-3 2 2 3-4" />
        </svg>
        <span className="hidden sm:inline">Exportar</span>
      </button>
      {open && <ExportPanel onClose={() => setOpen(false)} />}
    </>
  );
}

type ExportMode = "zip" | "separated";

// Helpers de tipo pra File System Access API (não tipada no TS por padrão)
type FsWritable = { write: (b: Blob) => Promise<void>; close: () => Promise<void> };
type FsFileHandle = { createWritable: () => Promise<FsWritable> };
type FsDirHandle = { getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<FsFileHandle> };
type FsWindow = Window & {
  showSaveFilePicker?: (opts: {
    suggestedName?: string;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<FsFileHandle>;
  showDirectoryPicker?: () => Promise<FsDirHandle>;
};

function hasFsApi(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as FsWindow;
  return typeof w.showSaveFilePicker === "function" || typeof w.showDirectoryPicker === "function";
}

function ExportPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ExportItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingThumbs, setLoadingThumbs] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ExportMode>("zip");
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const fsSupported = hasFsApi();

  // Garante que createPortal só roda no client. Sem isso, SSR quebra.
  useEffect(() => setMounted(true), []);

  // Lock scroll do body enquanto modal aberto + ESC fecha.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !exporting) onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onEsc);
    };
  }, [exporting, onClose]);

  // Coleta elementos exportáveis ao montar
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-export-id]")
    );
    const collected: ExportItem[] = nodes.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        id: el.dataset.exportId!,
        label: el.dataset.exportLabel ?? el.dataset.exportId!,
        el,
        width: rect.width,
        height: rect.height,
      };
    });
    setItems(collected);
    // Pré-seleciona tudo (usuário tipicamente quer exportar tudo)
    setSelected(new Set(collected.map((i) => i.id)));
  }, []);

  // Gera thumbnails em paralelo
  useEffect(() => {
    if (items.length === 0) {
      setLoadingThumbs(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { toPng } = await import("html-to-image");
        const results = await Promise.all(
          items.map(async (item) => {
            try {
              return await toPng(item.el, {
                backgroundColor: undefined,
                pixelRatio: 0.5,
                cacheBust: true,
              });
            } catch {
              return undefined;
            }
          })
        );
        if (cancelled) return;
        setItems((prev) =>
          prev.map((it, i) => ({ ...it, thumbnail: results[i] }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoadingThumbs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc fecha (mas não enquanto exporta)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !exporting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, exporting]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(items.map((i) => i.id)));
  }
  function clearAll() {
    setSelected(new Set());
  }

  async function doExport() {
    if (exporting) return;
    const toExport = items.filter((i) => selected.has(i.id));
    if (toExport.length === 0) return;

    const pagePath =
      window.location.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "home";
    const dateStr = new Date().toISOString().slice(0, 10);
    const w = window as FsWindow;

    // O file picker PRECISA ser chamado dentro de um user gesture síncrono.
    // Por isso o picker vem ANTES dos await caros (gerar PNGs).
    let saveFileHandle: FsFileHandle | null = null;
    let saveDirHandle: FsDirHandle | null = null;

    if (mode === "zip") {
      if (typeof w.showSaveFilePicker === "function") {
        try {
          saveFileHandle = await w.showSaveFilePicker({
            suggestedName: `sisprime-${pagePath}-${dateStr}.zip`,
            types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
          });
        } catch {
          // Usuário cancelou o diálogo → aborta export silenciosamente.
          return;
        }
      }
    } else {
      if (typeof w.showDirectoryPicker === "function") {
        try {
          saveDirHandle = await w.showDirectoryPicker();
        } catch {
          return;
        }
      }
    }

    setExporting(true);
    setError(null);
    setExportProgress({ done: 0, total: toExport.length });

    try {
      const { toPng } = await import("html-to-image");

      if (mode === "zip") {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        const folder = zip.folder(`sisprime-${pagePath}-${dateStr}`);
        if (!folder) throw new Error("Falha ao criar pasta no ZIP");
        for (let i = 0; i < toExport.length; i++) {
          const item = toExport[i];
          const dataUrl = await toPng(item.el, {
            backgroundColor: undefined,
            pixelRatio: 2,
            cacheBust: true,
          });
          const base64 = dataUrl.split(",")[1];
          folder.file(`${slugify(item.label)}.png`, base64, { base64: true });
          setExportProgress({ done: i + 1, total: toExport.length });
        }
        const blob = await zip.generateAsync({ type: "blob" });
        await saveBlob(blob, `sisprime-${pagePath}-${dateStr}.zip`, saveFileHandle);
      } else {
        // Modo "arquivos separados"
        for (let i = 0; i < toExport.length; i++) {
          const item = toExport[i];
          const dataUrl = await toPng(item.el, {
            backgroundColor: undefined,
            pixelRatio: 2,
            cacheBust: true,
          });
          const blob = await (await fetch(dataUrl)).blob();
          const filename = `${slugify(item.label)}.png`;
          if (saveDirHandle) {
            const fh = await saveDirHandle.getFileHandle(filename, { create: true });
            const writable = await fh.createWritable();
            await writable.write(blob);
            await writable.close();
          } else {
            // Fallback: download tradicional (vai pra pasta Downloads do browser)
            downloadBlob(blob, filename);
          }
          setExportProgress({ done: i + 1, total: toExport.length });
        }
      }
      setTimeout(onClose, 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  // Funções auxiliares declaradas no escopo do componente porque usam o
  // fluxo: handle prévio (se houver) > download tradicional como fallback.
  async function saveBlob(blob: Blob, fallbackName: string, handle: FsFileHandle | null) {
    if (handle) {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      downloadBlob(blob, fallbackName);
    }
  }
  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const selectedCount = selected.size;

  // z-[80] fica acima da Sidebar (z-50) e header (z-20). Renderizado em portal
  // pro document.body pra escapar de containing blocks de ancestrais.
  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Exportar apresentação"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (!exporting && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-card text-content shadow-card ring-1 ring-line"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold">Exportar apresentação</h2>
            <p className="text-[11px] text-content-muted">
              Selecione os elementos pra exportar como PNG (fundo transparente).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            aria-label="Fechar"
            className="text-content-muted hover:text-content disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </header>

        <div className="flex items-center justify-between border-b border-line px-5 py-2 text-xs">
          <span className="text-content-muted">
            {items.length === 0
              ? "Nenhum elemento exportável encontrado nesta página."
              : `${selectedCount} de ${items.length} selecionado(s)`}
          </span>
          {items.length > 0 && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={selectAll}
                disabled={exporting}
                className="text-content underline-offset-2 hover:underline"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={exporting}
                className="text-content-muted underline-offset-2 hover:underline"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-700 dark:bg-red-950/60 dark:text-red-200">
              {error}
            </div>
          )}
          {items.length === 0 ? (
            <div className="py-10 text-center text-content-muted">
              Esta página ainda não tem elementos marcados pra exportação.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((it) => {
                const isSel = selected.has(it.id);
                return (
                  <label
                    key={it.id}
                    className={
                      "group cursor-pointer rounded-lg border-2 p-2 transition " +
                      (isSel
                        ? "border-content bg-card-soft"
                        : "border-line hover:border-line-strong")
                    }
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggle(it.id)}
                        disabled={exporting}
                        className="mt-1 h-4 w-4 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-content">{it.label}</div>
                        <div className="text-[10px] text-content-muted tabular-nums">
                          {Math.round(it.width)} × {Math.round(it.height)} px
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex h-32 items-center justify-center overflow-hidden rounded-md bg-[repeating-conic-gradient(#0001_0_25%,transparent_0_50%)] [background-size:12px_12px]">
                      {it.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.thumbnail}
                          alt={it.label}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : loadingThumbs ? (
                        <div className="text-[10px] text-content-muted">Gerando preview…</div>
                      ) : (
                        <div className="text-[10px] text-content-muted">Preview indisponível</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <fieldset className="flex items-center gap-3 text-xs">
              <legend className="sr-only">Formato de saída</legend>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="export-mode"
                  value="zip"
                  checked={mode === "zip"}
                  onChange={() => setMode("zip")}
                  disabled={exporting}
                  className="h-3.5 w-3.5"
                />
                <span className="text-content">ZIP (1 arquivo)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="export-mode"
                  value="separated"
                  checked={mode === "separated"}
                  onChange={() => setMode("separated")}
                  disabled={exporting}
                  className="h-3.5 w-3.5"
                />
                <span className="text-content">PNGs separados</span>
              </label>
            </fieldset>
            {fsSupported && (
              <span className="text-[10px] text-content-muted">
                Você escolhe onde salvar
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-content-muted">
              {exporting && exportProgress
                ? `Gerando ${exportProgress.done}/${exportProgress.total}…`
                : "PNGs em 2× resolução"}
            </span>
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-content-muted hover:text-content disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={doExport}
              disabled={exporting || selectedCount === 0}
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? "Exportando…" : `Exportar (${selectedCount})`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
