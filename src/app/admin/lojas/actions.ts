"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LojaState = { erro?: string; ok?: string };

export async function criarLojaAction(_prev: LojaState, formData: FormData): Promise<LojaState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim() || null;
  if (nome.length < 2) return { erro: "Digita o nome da loja." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("lojas").insert({ nome, cidade });
  if (error) return { erro: error.message };

  revalidatePath("/admin/lojas");
  return { ok: `Loja "${nome}" cadastrada.` };
}
