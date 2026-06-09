import { redirect } from "next/navigation";

export const runtime = "edge";

// Processos foi dividido em duas telas: /ativas e /passivas.
export default function Page() {
  redirect("/ativas");
}
