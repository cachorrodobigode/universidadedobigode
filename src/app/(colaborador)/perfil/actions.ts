"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TrocarSenhaState = { erro?: string; ok?: string };

const SENHAS_FRACAS = new Set([
  "12345678", "123456789", "1234567890", "11111111", "00000000", "senha", "password",
  "qwerty", "abcdef", "abcd1234", "bigode", "cachorro",
]);

export async function trocarSenhaPerfilAction(
  _prev: TrocarSenhaState,
  formData: FormData,
): Promise<TrocarSenhaState> {
  const novaSenha = String(formData.get("nova_senha") ?? "");
  const confirma = String(formData.get("confirma") ?? "");

  if (novaSenha.length < 8) return { erro: "Senha precisa ter pelo menos 8 caracteres." };
  if (!/[0-9]/.test(novaSenha)) return { erro: "Senha precisa de pelo menos um número." };
  if (!/[A-Za-zÀ-ÿ]/.test(novaSenha)) return { erro: "Senha precisa de pelo menos uma letra." };
  if (novaSenha !== confirma) return { erro: "As senhas não conferem." };
  if (SENHAS_FRACAS.has(novaSenha.toLowerCase())) {
    return { erro: "Essa senha é muito comum. Escolha outra." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { erro: "Sessão expirada. Faça login de novo." };

  const admin = createSupabaseAdminClient();
  const { data: usuario } = await admin
    .from("usuarios")
    .select("cpf")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (usuario?.cpf && novaSenha.replace(/\D/g, "") === usuario.cpf) {
    return { erro: "A nova senha não pode ser o seu CPF." };
  }

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { erro: `Não foi possível trocar: ${error.message}` };

  return { ok: "Senha alterada com sucesso!" };
}
