"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cpfApenasDigitos, cpfParaEmailInterno, cpfValido } from "@/lib/auth/cpf-email";

export type LoginState = { erro?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const cpfRaw = String(formData.get("cpf") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const voltarPara = String(formData.get("voltar_para") ?? "/trilha");

  const cpf = cpfApenasDigitos(cpfRaw);
  if (!cpfValido(cpf)) return { erro: "CPF inválido. Confira os números." };
  if (!senha) return { erro: "Digite sua senha." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: cpfParaEmailInterno(cpf),
    password: senha,
  });

  if (error) {
    const msg =
      error.message?.toLowerCase().includes("invalid")
        ? "CPF ou senha incorretos."
        : "Não foi possível entrar agora. Tenta de novo em instantes.";
    return { erro: msg };
  }

  redirect(voltarPara || "/trilha");
}
