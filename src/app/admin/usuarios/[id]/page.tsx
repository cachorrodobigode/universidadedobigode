import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatarCpf } from "@/lib/auth/cpf-email";
import { temAcessoTotalLojas } from "@/lib/auth/cargo-hierarchy";
import { EditarUsuarioForm } from "./EditarUsuarioForm";
import { ToggleAtivoButton } from "./ToggleAtivoButton";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuarioLogado = await getUsuarioAtual();
  if (!usuarioLogado || (!usuarioLogado.is_master && !usuarioLogado.is_gerente)) {
    redirect("/trilha");
  }

  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: alvo } = await admin
    .from("usuarios")
    .select("id, nome, cpf, cargo_id, loja_id, is_master, is_gerente, ativo, primeiro_login, cargo:cargos(nome, nivel), loja:lojas!loja_id(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!alvo) notFound();

  const { data: cargos } = await admin
    .from("cargos").select("id, nome, nivel").eq("ativo", true).order("nivel");
  const { data: lojas } = await admin
    .from("lojas").select("id, nome, cidade").eq("ativa", true).order("nome");
  const { data: lojasExtras } = await admin
    .from("usuario_lojas").select("loja_id").eq("usuario_id", id);

  // Filtra cargos disponíveis pro editor (não-master só pode atribuir nível < seu)
  const meuNivel = usuarioLogado.cargo?.nivel ?? 0;
  const cargosVisiveis = (cargos ?? []).filter((c) => {
    if (usuarioLogado.is_master) return true;
    return (c.nivel as number) < meuNivel;
  });

  // Mesma lógica pras lojas:
  //  - Master e Franqueadora veem TODAS as lojas
  //  - Demais (Gerente/Franqueado) veem só as suas
  const acessoTotal = usuarioLogado.is_master || temAcessoTotalLojas(meuNivel);
  let lojasVisiveis = lojas ?? [];
  if (!acessoTotal) {
    const minhasLojas = new Set<string>();
    if (usuarioLogado.loja_id) minhasLojas.add(usuarioLogado.loja_id);
    const { data: minhasExtras } = await admin
      .from("usuario_lojas").select("loja_id").eq("usuario_id", usuarioLogado.id);
    for (const e of minhasExtras ?? []) minhasLojas.add(e.loja_id as string);
    lojasVisiveis = lojasVisiveis.filter((l) => minhasLojas.has(l.id as string));
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/usuarios" className="text-xs text-[var(--fg-muted)] hover:underline">
          ← Usuários
        </Link>
        <h1 className="text-2xl font-extrabold mt-1">{alvo.nome as string}</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-0.5">
          CPF: <span className="font-mono">{formatarCpf(alvo.cpf as string)}</span>
          {" · "}
          Cargo atual: <strong>{(alvo.cargo as unknown as { nome?: string })?.nome ?? "—"}</strong>
          {" · "}
          Loja: {(alvo.loja as unknown as { nome?: string })?.nome ?? "(sem loja)"}
        </p>
      </div>

      {alvo.is_master && !usuarioLogado.is_master && (
        <div className="rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          Esse usuário é Master. Você não pode editá-lo.
        </div>
      )}

      <EditarUsuarioForm
        alvo={{
          id: alvo.id as string,
          nome: alvo.nome as string,
          cargo_id: alvo.cargo_id as string,
          loja_id: (alvo.loja_id as string | null) ?? null,
          lojas_extras: (lojasExtras ?? []).map((e) => e.loja_id as string),
        }}
        cargos={cargosVisiveis as { id: string; nome: string; nivel: number }[]}
        lojas={lojasVisiveis as { id: string; nome: string; cidade: string | null }[]}
        ehMaster={usuarioLogado.is_master}
        bloqueado={!!alvo.is_master && !usuarioLogado.is_master}
      />

      <div className="rounded-xl bg-white border border-[var(--border)] p-6 space-y-3">
        <h2 className="font-bold">Status do acesso</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          {alvo.ativo
            ? "Usuário ativo. Consegue logar normalmente."
            : "Usuário inativo. Não consegue logar."}
        </p>
        {!alvo.is_master && (
          <ToggleAtivoButton
            usuarioId={alvo.id as string}
            ativo={alvo.ativo as boolean}
            nome={alvo.nome as string}
          />
        )}
      </div>
    </div>
  );
}
