import { LoginForm } from "@/components/LoginForm";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const fromRaw = sp.from;
  const from = (Array.isArray(fromRaw) ? fromRaw[0] : fromRaw) ?? "/ativas";

  return (
    <div className="brand-header flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sisprime-symbol.png" alt="Sisprime" className="h-14 w-14 object-contain" />
          <div>
            <div className="text-lg font-semibold tracking-tight text-white">
              SISPRIME <span className="font-normal text-sky-200/80">do Brasil</span>
            </div>
            <div className="text-[11px] text-sky-200/60">Painel Jurídico · Carteira &amp; Processos</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
          <LoginForm from={from} />
        </div>

        <p className="mt-6 text-center text-[11px] text-sky-200/50">
          Acesso restrito · Amaral Vasconcellos Advogados
        </p>
      </div>
    </div>
  );
}
