"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cpfApenasDigitos, cpfValido, cpfParaEmailInterno } from "@/lib/auth/cpf-email";

export type CadastrarColaboradorState = { erro?: string; ok?: string };

export async function cadastrarColaboradorAction(
  _prev: CadastrarColaboradorState,
  formData: FormData,
): Promise<CadastrarColaboradorState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cpfRaw = String(formData.get("cpf") ?? "");
  const cargo_id = String(formData.get("cargo_id") ?? "");
  const loja_id = String(formData.get("loja_id") ?? "") || null;

  if (nome.length < 3) return { erro: "Digita o nome completo do colaborador." };

  const cpf = cpfApenasDigitos(cpfRaw);
  if (!cpfValido(cpf)) return { erro: "CPF inválido. Confere os números." };

  if (!cargo_id) return { erro: "Escolhe um cargo." };

  // Permissão: master ou gerente. Gerente só cadastra na própria loja.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const { data: meuPerfil } = await supabase
    .from("usuarios")
    .select("is_master, is_gerente, loja_id")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_master && !meuPerfil?.is_gerente) {
    return { erro: "Você não tem permissão para cadastrar colaboradores." };
  }
  if (!meuPerfil.is_master && meuPerfil.loja_id !== loja_id) {
    return { erro: "Gerentes só cadastram colaboradores da própria loja." };
  }

  // CPF já cadastrado?
  const { data: existente } = await supabase.from("usuarios").select("id").eq("cpf", cpf).maybeSingle();
  if (existente) return { erro: "Já existe colaborador com esse CPF." };

  // Cria auth user (senha inicial = CPF)
  const admin = createSupabaseAdminClient();
  const { data: novoAuth, error: authErr } = await admin.auth.admin.createUser({
    email: cpfParaEmailInterno(cpf),
    password: cpf,
    email_confirm: true,
  });

  if (authErr || !novoAuth.user) {
    return { erro: `Não foi possível criar o usuário: ${authErr?.message ?? "erro desconhecido"}` };
  }

  // Insere perfil em public.usuarios (precisa do service role pra contornar RLS)
  const { error: insErr } = await admin.from("usuarios").insert({
    id: novoAuth.user.id,
    cpf,
    nome,
    cargo_id,
    loja_id,
    primeiro_login: true,
    ativo: true,
  });

  if (insErr) {
    // Rollback do auth user
    await admin.auth.admin.deleteUser(novoAuth.user.id);
    return { erro: `Falha ao salvar perfil: ${insErr.message}` };
  }

  // Audit log
  await admin.from("audit_log").insert({
    usuario_id: user.id,
    acao: "create_user",
    entidade: "usuarios",
    entidade_id: novoAuth.user.id,
    metadata: { cpf, nome, cargo_id, loja_id },
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

  const { data: meuPerfil } = await supabase
    .from("usuarios")
    .select("is_master, is_gerente, loja_id")
    .eq("id", user.id)
    .single();

  const admin = createSupabaseAdminClient();
  const { data: alvo, error: alvoErr } = await admin
    .from("usuarios")
    .select("cpf, loja_id, is_master")
    .eq("id", usuario_id)
    .single();
  if (alvoErr || !alvo) return { erro: "Colaborador não encontrado." };

  if (!meuPerfil?.is_master) {
    if (!meuPerfil?.is_gerente) return { erro: "Sem permissão." };
    if (alvo.loja_id !== meuPerfil.loja_id) return { erro: "Você só reseta senha da própria loja." };
    if (alvo.is_master) return { erro: "Não é possível resetar a senha de um master." };
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(usuario_id, {
    password: alvo.cpf,
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
