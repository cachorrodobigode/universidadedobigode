"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TrocarSenhaState = { erro?: string; ok?: boolean };

const SENHAS_FRACAS = new Set([
  "12345678", "123456789", "1234567890", "11111111", "00000000", "senha", "password",
  "qwerty", "abcdef", "abcd1234", "bigode", "cachorro",
]);

export async function trocarSenhaAction(
  _prev: TrocarSenhaState,
  formData: FormData,
): Promise<TrocarSenhaState> {
  const novaSenha = String(formData.get("nova_senha") ?? "");
  const confirma = String(formData.get("confirma") ?? "");

  if (novaSenha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (!/[0-9]/.test(novaSenha)) return { erro: "A senha precisa ter pelo menos um número." };
  if (!/[A-Za-zÀ-ÿ]/.test(novaSenha)) return { erro: "A senha precisa ter pelo menos uma letra." };
  if (novaSenha !== confirma) return { erro: "As senhas não conferem." };
  if (SENHAS_FRACAS.has(novaSenha.toLowerCase())) {
    return { erro: "Essa senha é muito comum. Escolha outra." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { erro: "Sessão expirada. Faça login novamente." };

  // Lê CPF do user via ADMIN client (bypass RLS pra evitar recursão).
  const admin = createSupabaseAdminClient();
  const { data: usuario } = await admin
    .from("usuarios")
    .select("cpf")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (usuario?.cpf && novaSenha.replace(/\D/g, "") === usuario.cpf) {
    return { erro: "A nova senha não pode ser o seu CPF." };
  }

  // Atualiza a senha via Supabase Auth (precisa do JWT do user, não admin).
  const { error: updErr } = await supabase.auth.updateUser({ password: novaSenha });
  if (updErr) return { erro: `Não foi possível trocar agora: ${updErr.message}` };

  // Marca primeiro_login=false via admin (bypass RLS).
  await admin.from("usuarios").update({ primeiro_login: false }).eq("id", userData.user.id);

  redirect("/trilha");
}
