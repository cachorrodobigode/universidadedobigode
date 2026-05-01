import { redirect } from "next/navigation";

// O middleware redireciona usuário autenticado pra /trilha e
// não-autenticado pra /login. Esse fallback cobre o caso raro
// do middleware não rodar.
export default function Home() {
  redirect("/login");
}
