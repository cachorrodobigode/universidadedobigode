"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cpfApenasDigitos, cpfValido, cpfParaEmailInterno } from "@/lib/auth/cpf-email";
import { NIVEL_CARGO } from "@/lib/auth/cargo-hierarchy";

export type CadastrarColaboradorState = { erro?: string; ok?: string };

/**
 * Cadastra colaborador. Aceita:
 * - cargo_id obrigatório
 * - loja_id (opcional) → loja principal
 * - lojas_extras (opcional, JSON de uuids) → só pra cargos com nivel >= 4
 */
export async function cadastrarColaboradorAction(
  _prev: CadastrarColaboradorState,
  formData: FormData,
): Promise<CadastrarColaboradorState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cpfRaw = String(formData.get("cpf") ?? "");
  const cargo_id = String(formData.get("cargo_id") ?? "");
  const loja_id = String(formData.get("loja_id") ?? "") || null;
  const lojasExtrasRaw = String(formData.get("lojas_extras") ?? "[]");
  let lojas_extras: string[] = [];
  try { lojas_extras = JSON.parse(lojasExtrasRaw); } catch { lojas_extras = []; }

  if (nome.length < 3) return { erro: "Digita o nome completo do colaborador." };

  const cpf = cpfApenasDigitos(cpfRaw);
  if (!cpfValido(cpf)) return { erro: "CPF inválido. Confere os números." };

  if (!cargo_id) return { erro: "Escolhe um cargo." };

  // Permissão: master ou gerente. Lê via ADMIN client pra evitar
  // recursão da RLS de public.usuarios.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const admin = createSupabaseAdminClient();
  const { data: meuPerfil } = await admin
    .from("usuarios")
    .select("is_master, is_gerente, loja_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!meuPerfil?.is_master && !meuPerfil?.is_gerente) {
    return { erro: "Você não tem permissão para cadastrar colaboradores." };
  }
  if (!meuPerfil.is_master && meuPerfil.loja_id !== loja_id) {
    return { erro: "Gerentes só cadastram colaboradores da própria loja." };
  }

  // Verifica nivel do cargo selecionado pra decidir se aceita lojas extras
  const { data: cargoSelecionado } = await admin
    .from("cargos")
    .select("nivel")
    .eq("id", cargo_id)
    .maybeSingle();
  const nivelCargo = (cargoSelecionado?.nivel as number) ?? 0;
  const podeMultiLoja = nivelCargo >= NIVEL_CARGO.SUPERVISOR;

  if (!podeMultiLoja) lojas_extras = []; // ignora se não é cargo elevado

  // CPF já cadastrado?
  const { data: existente } = await admin.from("usuarios").select("id").eq("cpf", cpf).maybeSingle();
  if (existente) return { erro: "Já existe colaborador com esse CPF." };

  // Cria auth user
  const { data: novoAuth, error: authErr } = await admin.auth.admin.createUser({
    email: cpfParaEmailInterno(cpf),
    password: cpf,
    email_confirm: true,
  });
  if (authErr || !novoAuth.user) {
    return { erro: `Não foi possível criar o usuário: ${authErr?.message ?? "erro desconhecido"}` };
  }

  // Marca is_gerente se cargo é Gerente (nivel 5) ou Supervisor (4)
  const ehGerenteImplicito = nivelCargo >= NIVEL_CARGO.SUPERVISOR;

  const { error: insErr } = await admin.from("usuarios").insert({
    id: novoAuth.user.id,
    cpf,
    nome,
    cargo_id,
    loja_id,
    is_gerente: ehGerenteImplicito,
    primeiro_login: true,
    ativo: true,
  });

  if (insErr) {
    await admin.auth.admin.deleteUser(novoAuth.user.id);
    return { erro: `Falha ao salvar perfil: ${insErr.message}` };
  }

  // Insere lojas extras (se houver)
  if (lojas_extras.length > 0) {
    const linhas = lojas_extras
      .filter((id) => id && id !== loja_id)
      .map((id) => ({ usuario_id: novoAuth.user!.id, loja_id: id }));
    if (linhas.length > 0) {
      await admin.from("usuario_lojas").insert(linhas);
    }
  }

  await admin.from("audit_log").insert({
    usuario_id: user.id,
    acao: "create_user",
    entidade: "usuarios",
    entidade_id: novoAuth.user.id,
    metadata: { cpf, nome, cargo_id, loja_id, lojas_extras },
  });

  revalidatePath("/admin/colaboradores");
  revalidatePath("/admin/usuarios");

  return { ok: `Colaborador ${nome} cadastrado! Senha inicial = CPF (sem pontos).` };
}

export type ResetarSenhaState = { erro?: string; ok?: string };

export async function resetarSenhaAction(
  _prev: ResetarSenhaState,
  formData: FormData,
): Promise<ResetarSenhaState> {
  const usuario_id = String(formData.get("usuario_id") ?? "");
  if (!usuario_id) return { erro: "Usuário não informado." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const admin = createSupabaseAdminClient();
  const { data: meuPerfil } = await admin
    .from("usuarios")
    .select("is_master, is_gerente, loja_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: alvo } = await admin
    .from("usuarios")
    .select("cpf, loja_id, is_master")
    .eq("id", usuario_id)
    .maybeSingle();
  if (!alvo) return { erro: "Colaborador não encontrado." };

  if (!meuPerfil?.is_master) {
    if (!meuPerfil?.is_gerente) return { erro: "Sem permissão." };
    if (alvo.loja_id !== meuPerfil.loja_id) return { erro: "Você só reseta senha da própria loja." };
    if (alvo.is_master) return { erro: "Não é possível resetar a senha de um master." };
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(usuario_id, {
    password: alvo.cpf as string,
  });
  if (updErr) return { erro: `Falha ao resetar: ${updErr.message}` };

  await admin.from("usuarios").update({ primeiro_login: true }).eq("id", usuario_id);
  await admin.from("audit_log").insert({
    usuario_id: user.id,
    acao: "reset_password",
    entidade: "usuarios",
    entidade_id: usuario_id,
  });

  return { ok: "Senha resetada para o CPF. O colaborador vai trocar no próximo login." };
}
