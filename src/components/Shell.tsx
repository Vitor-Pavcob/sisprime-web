import { Sidebar } from "./Sidebar";
import { FullscreenButton } from "./FullscreenButton";

/**
 * Shell de página: painel lateral (Sidebar) à esquerda + faixa de marca no topo
 * + área de conteúdo. O conteúdo é deslocado pela largura do rail colapsado
 * (a sidebar expande sobre o conteúdo no hover).
 */
export function Shell({
  title,
  subtitle,
  toolbar,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  toolbar?: React.ReactNode;
  /** Mantido por compatibilidade; o item ativo é derivado da rota no Sidebar. */
  active?: "ativas" | "passivas" | "propostas" | "contabilizacoes" | "resultado";
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />

      <div className="shell-content pl-14">
        <header className="brand-header sticky top-0 z-20 border-b border-white/5">
          <div className="flex h-16 items-center gap-3 px-6">
            <span className="text-sm font-semibold tracking-tight text-white">
              SISPRIME <span className="font-normal text-sky-200/80">do Brasil</span>
            </span>
            <span className="hidden text-[11px] text-sky-200/60 sm:inline">· Painel Jurídico · Carteira &amp; Processos</span>
            <div className="ml-auto flex items-center gap-1">
              <FullscreenButton />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-6 py-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-content">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-content-muted">{subtitle}</p>}
            </div>
            {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
