"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ManualState = { erro?: string; ok?: string };

async function exigeMaster(): Promise<{ erro?: string; userId?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("usuarios").select("is_master").eq("id", user.id).maybeSingle();
  if (!data?.is_master) return { erro: "Só master pode gerenciar manuais." };
  return { userId: user.id };
}

export async function criarManualAction(_p: ManualState, fd: FormData): Promise<ManualState> {
  const titulo = String(fd.get("titulo") ?? "").trim();
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const arquivo_path = String(fd.get("arquivo_path") ?? "").trim();
  const nivel_minimo = parseInt(String(fd.get("nivel_minimo") ?? "0"), 10);
  const ordem = parseInt(String(fd.get("ordem") ?? "0"), 10);

  if (titulo.length < 2) return { erro: "Título muito curto." };
  if (!arquivo_path) return { erro: "Faça o upload do PDF antes de salvar." };
  if (!Number.isFinite(nivel_minimo) || nivel_minimo < 0) return { erro: "Nível inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("manuais").insert({
    titulo, descricao, arquivo_path, nivel_minimo, ordem, ativo: true,
  });
  if (error) return { erro: error.message };

  revalidatePath("/admin/manuais");
  revalidatePath("/manuais");
  return { ok: `Manual "${titulo}" criado com sucesso.` };
}

export async function toggleAtivoManualAction(_p: ManualState, fd: FormData): Promise<ManualState> {
  const id = String(fd.get("id") ?? "");
  const novoEstado = String(fd.get("ativo") ?? "true") === "true";
  if (!id) return { erro: "ID inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("manuais").update({ ativo: novoEstado }).eq("id", id);
  if (error) return { erro: error.message };

  revalidatePath("/admin/manuais");
  revalidatePath("/manuais");
  return { ok: novoEstado ? "Manual reativado." : "Manual inativado." };
}

export async function deletarManualAction(_p: ManualState, fd: FormData): Promise<ManualState> {
  const id = String(fd.get("id") ?? "");
  const arquivo_path = String(fd.get("arquivo_path") ?? "").trim();
  if (!id) return { erro: "ID inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();

  // Remove do DB primeiro
  const { error } = await admin.from("manuais").delete().eq("id", id);
  if (error) return { erro: error.message };

  // Remove do Storage (falha silenciosa — pode já ter sido removido)
  if (arquivo_path) {
    await admin.storage.from("manuais").remove([arquivo_path]);
  }

  revalidatePath("/admin/manuais");
  revalidatePath("/manuais");
  return { ok: "Manual removido." };
}

export async function editarManualAction(_p: ManualState, fd: FormData): Promise<ManualState> {
  const id = String(fd.get("id") ?? "");
  const titulo = String(fd.get("titulo") ?? "").trim();
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const nivel_minimo = parseInt(String(fd.get("nivel_minimo") ?? "0"), 10);
  const ordem = parseInt(String(fd.get("ordem") ?? "0"), 10);

  if (!id) return { erro: "ID inválido." };
  if (titulo.length < 2) return { erro: "Título muito curto." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("manuais")
    .update({ titulo, descricao, nivel_minimo, ordem })
    .eq("id", id);
  if (error) return { erro: error.message };

  revalidatePath("/admin/manuais");
  revalidatePath("/manuais");
  return { ok: "Manual atualizado." };
}
