import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CadastrarColaboradorForm } from "./CadastrarColaboradorForm";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { redirect } from "next/navigation";
import { formatarCpf } from "@/lib/auth/cpf-email";

export default async function CadastrarColaboradorPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario || (!usuario.is_master && !usuario.is_gerente)) redirect("/trilha");

  const supabase = createSupabaseAdminClient();
  const [{ data: cargos }, { data: lojas }, { data: colabs }] = await Promise.all([
    supabase.from("cargos").select("id, nome, nivel").eq("ativo", true).order("nivel"),
    supabase.from("lojas").select("id, nome, cidade").eq("ativa", true).order("nome"),
    supabase
      .from("usuarios")
      .select("id, nome, cpf, ativo, primeiro_login, cargo:cargos(nome), loja:lojas(nome)")
      .eq("ativo", true)
      .order("nome"),
  ]);

  const lojasVisiveis = usuario.is_master
    ? (lojas ?? [])
    : (lojas ?? []).filter((l) => l.id === usuario.loja_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Cadastrar colaborador</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          O colaborador entra com o CPF dele. Senha inicial = CPF (sem pontos). Ele troca a senha no primeiro acesso.
        </p>
      </div>

      <CadastrarColaboradorForm
        cargos={cargos ?? []}
        lojas={lojasVisiveis}
        ehMaster={usuario.is_master}
      />

      <div className="rounded-xl bg-white border border-[var(--border)] p-6">
        <h2 className="font-bold mb-3">Colaboradores ativos ({colabs?.length ?? 0})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--border)]">
                <th className="py-2 pr-4 font-bold">Nome</th>
                <th className="py-2 pr-4 font-bold">CPF</th>
                <th className="py-2 pr-4 font-bold">Cargo</th>
                <th className="py-2 pr-4 font-bold">Loja</th>
                <th className="py-2 pr-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(colabs ?? []).map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-4">{c.nome}</td>
                  <td className="py-2 pr-4">{formatarCpf(c.cpf)}</td>
                  <td className="py-2 pr-4">
                    {(c.cargo as unknown as { nome?: string })?.nome ?? "-"}
                  </td>
                  <td className="py-2 pr-4">
                    {(c.loja as unknown as { nome?: string })?.nome ?? "-"}
                  </td>
                  <td className="py-2 pr-4">
                    {c.primeiro_login ? (
                      <span className="text-xs font-bold text-[var(--accent-fg)] bg-[var(--accent)] px-2 py-1 rounded">
                        Aguardando 1º login
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-white bg-[var(--success)] px-2 py-1 rounded">
                        Ativo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(colabs ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--fg-muted)]">
                    Nenhum colaborador cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
