import { ProcessosScreen } from "@/components/ProcessosScreen";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <ProcessosScreen
      grupos={[10]}
      title="Ações Ativas"
      subtitle="Processos em que a Sisprime é autora — recuperação de crédito no contencioso (CPJ Amaral)."
      active="ativas"
      sp={sp}
    />
  );
}
