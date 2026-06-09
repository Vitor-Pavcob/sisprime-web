import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { UsersAdmin } from "@/components/UsersAdmin";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "master") redirect("/ativas");

  return (
    <Shell title="Usuários" subtitle="Gerencie quem acessa o painel — criar, resetar senha, definir master ou remover (somente master).">
      <UsersAdmin />
    </Shell>
  );
}
