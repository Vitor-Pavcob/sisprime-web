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
      grupos={[21]}
      title="Ações Passivas"
      subtitle="Processos em que a Sisprime é ré — defesa no contencioso (CPJ Amaral)."
      active="passivas"
      sp={sp}
    />
  );
}
