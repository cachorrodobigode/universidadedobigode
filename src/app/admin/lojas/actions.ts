"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type LojaState = { erro?: string; ok?: string };

export async function criarLojaAction(_prev: LojaState, formData: FormData): Promise<LojaState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim() || null;
  if (nome.length < 2) return { erro: "Digita o nome da loja." };

  // Permissão: master ou gerente. Lê via admin (RLS recursiva em usuarios).
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const admin = createSupabaseAdminClient();
  const { data: meuPerfil } = await admin
    .from("usuarios").select("is_master").eq("id", user.id).maybeSingle();
  if (!meuPerfil?.is_master) return { erro: "Só master cadastra lojas." };

  const { error } = await admin.from("lojas").insert({ nome, cidade });
  if (error) return { erro: error.message };

  revalidatePath("/admin/lojas");
  return { ok: `Loja "${nome}" cadastrada.` };
}
