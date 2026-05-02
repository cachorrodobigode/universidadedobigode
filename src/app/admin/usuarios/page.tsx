import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatarCpf } from "@/lib/auth/cpf-email";
import { ResetarSenhaButton } from "./ResetarSenhaButton";

export default async function UsuariosPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario?.is_master) redirect("/admin/colaboradores");

  const admin = createSupabaseAdminClient();
  const { data: usuarios } = await admin
    .from("usuarios")
    .select("id, nome, cpf, ativo, primeiro_login, is_master, is_gerente, cargo:cargos(nome, nivel), loja:lojas!loja_id(nome)")
    .order("nome");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Todos os usuários</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Lista geral de quem tem acesso ao app. Pra cadastrar novo, use
          {" "}<a className="underline" href="/admin/colaboradores">Cadastrar colaborador</a>.
        </p>
      </div>

      <div className="rounded-xl bg-white border border-[var(--border)] p-4 md:p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--border)]">
              <th className="py-2 pr-4 font-bold">Nome</th>
              <th className="py-2 pr-4 font-bold">CPF</th>
              <th className="py-2 pr-4 font-bold">Cargo</th>
              <th className="py-2 pr-4 font-bold">Loja</th>
              <th className="py-2 pr-4 font-bold">Tipo</th>
              <th className="py-2 pr-4 font-bold">Status</th>
              <th className="py-2 pr-4 font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {(usuarios ?? []).map((u) => {
              const cargo = (u.cargo as unknown as { nome?: string })?.nome ?? "-";
              const loja = (u.loja as unknown as { nome?: string })?.nome ?? "-";
              return (
                <tr key={u.id as string} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 pr-4 font-semibold">{u.nome}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{formatarCpf(u.cpf as string)}</td>
                  <td className="py-3 pr-4">{cargo}</td>
                  <td className="py-3 pr-4">{loja}</td>
                  <td className="py-3 pr-4">
                    {u.is_master ? (
                      <span className="text-xs font-bold px-2 py-1 rounded bg-[var(--secondary)] text-white">Master</span>
                    ) : u.is_gerente ? (
                      <span className="text-xs font-bold px-2 py-1 rounded bg-[var(--accent)] text-[var(--accent-fg)]">Gerente</span>
                    ) : (
                      <span className="text-xs text-[var(--fg-muted)]">Colaborador</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {!u.ativo ? (
                      <span className="text-xs font-bold text-white bg-gray-500 px-2 py-1 rounded">Inativo</span>
                    ) : u.primeiro_login ? (
                      <span className="text-xs font-bold text-[var(--accent-fg)] bg-[var(--accent)] px-2 py-1 rounded">Aguardando 1º login</span>
                    ) : (
                      <span className="text-xs font-bold text-white bg-[var(--success)] px-2 py-1 rounded">Ativo</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {u.id !== usuario.id && (
                      <ResetarSenhaButton usuarioId={u.id as string} nome={u.nome as string} />
                    )}
                  </td>
                </tr>
              );
            })}
            {(usuarios ?? []).length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-[var(--fg-muted)]">Nenhum usuário cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
