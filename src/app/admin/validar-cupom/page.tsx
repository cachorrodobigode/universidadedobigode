import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { ValidarCupomForm } from "./ValidarCupomForm";

export default async function ValidarCupomPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario || (!usuario.is_master && !usuario.is_gerente)) redirect("/trilha");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Validar cupom</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          O colaborador mostra o código (ex: BIG-AB12CD34). Digite ou leia com a câmera.
        </p>
      </div>
      <ValidarCupomForm />
    </div>
  );
}
