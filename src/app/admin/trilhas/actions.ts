"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extrairYoutubeId } from "@/lib/video/youtube";

export type ActionState = { erro?: string; ok?: string; id?: string };

async function exigeMaster(): Promise<{ erro?: string; userId?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("usuarios").select("is_master").eq("id", user.id).maybeSingle();
  if (!data?.is_master) return { erro: "Só master pode editar trilhas." };
  return { userId: user.id };
}

export async function criarTrilhaAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const nome = String(fd.get("nome") ?? "").trim();
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const cargoIdRaw = String(fd.get("cargo_id") ?? "");
  const cargo_id = cargoIdRaw || null;
  if (nome.length < 3) return { erro: "Digita o nome da trilha (mín. 3 letras)." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { data: maxOrdem } = await admin.from("trilhas").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
  const proxOrdem = ((maxOrdem?.ordem as number | undefined) ?? -1) + 1;

  const { data: nova, error } = await admin
    .from("trilhas")
    .insert({ nome, descricao, cargo_id, ordem: proxOrdem, ativa: true })
    .select("id")
    .single();
  if (error || !nova) return { erro: error?.message ?? "Erro ao criar trilha." };

  revalidatePath("/admin/trilhas");
  return { ok: `Trilha "${nome}" criada.`, id: nova.id as string };
}

export async function editarTrilhaAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const nome = String(fd.get("nome") ?? "").trim();
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const cargoIdRaw = String(fd.get("cargo_id") ?? "");
  const cargo_id = cargoIdRaw || null;
  const ativa = fd.get("ativa") === "on";

  if (!id) return { erro: "ID inválido." };
  if (nome.length < 3) return { erro: "Nome muito curto." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("trilhas")
    .update({ nome, descricao, cargo_id, ativa })
    .eq("id", id);
  if (error) return { erro: error.message };

  revalidatePath("/admin/trilhas");
  revalidatePath(`/admin/trilhas/${id}`);
  return { ok: "Trilha atualizada." };
}

export async function deletarTrilhaAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  if (!id) return { erro: "ID inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("trilhas").delete().eq("id", id);
  if (error) return { erro: error.message };

  revalidatePath("/admin/trilhas");
  return { ok: "Trilha removida." };
}

export async function criarModuloAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const trilha_id = String(fd.get("trilha_id") ?? "");
  const titulo = String(fd.get("titulo") ?? "").trim();
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const recompensa_bigocoins = parseInt(String(fd.get("recompensa") ?? "10"), 10) || 10;
  const nivel_minimo = parseInt(String(fd.get("nivel_minimo") ?? "0"), 10) || 0;
  const is_preparativo = fd.get("is_preparativo") === "on";

  if (!trilha_id) return { erro: "Trilha não informada." };
  if (titulo.length < 3) return { erro: "Digita o título do módulo." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { data: maxOrdem } = await admin
    .from("modulos")
    .select("ordem")
    .eq("trilha_id", trilha_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proxOrdem = ((maxOrdem?.ordem as number | undefined) ?? 0) + 1;

  const { data: novo, error } = await admin
    .from("modulos")
    .insert({
      trilha_id,
      titulo,
      descricao,
      ordem: proxOrdem,
      recompensa_bigocoins,
      nivel_minimo,
      is_preparativo,
      ativo: true,
    })
    .select("id")
    .single();
  if (error || !novo) return { erro: error?.message ?? "Erro ao criar módulo." };

  revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: `Módulo "${titulo}" criado.`, id: novo.id as string };
}

export async function deletarModuloAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  if (!id) return { erro: "ID inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("modulos").delete().eq("id", id);
  if (error) return { erro: error.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: "Módulo removido." };
}

export async function adicionarConteudoYoutubeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const modulo_id = String(fd.get("modulo_id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  const url = String(fd.get("url") ?? "").trim();
  const titulo = String(fd.get("titulo") ?? "").trim() || null;

  if (!modulo_id) return { erro: "Módulo não informado." };

  const videoId = extrairYoutubeId(url);
  if (!videoId) return { erro: "Não consegui identificar o vídeo. Cole a URL completa do YouTube." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { data: maxOrdem } = await admin
    .from("conteudos")
    .select("ordem")
    .eq("modulo_id", modulo_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proxOrdem = ((maxOrdem?.ordem as number | undefined) ?? -1) + 1;

  const { error } = await admin.from("conteudos").insert({
    modulo_id,
    tipo: "video_youtube",
    url: videoId,
    titulo,
    ordem: proxOrdem,
  });
  if (error) return { erro: error.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: "Vídeo adicionado." };
}

export async function deletarConteudoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  if (!id) return { erro: "ID inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();

  // Se é arquivo enviado, apaga do Storage também
  const { data: c } = await admin.from("conteudos").select("tipo, url").eq("id", id).maybeSingle();
  if (c?.url && (c.tipo === "video_upload" || c.tipo === "imagem" || c.tipo === "pdf")) {
    await admin.storage.from("videos").remove([c.url as string]);
  }

  const { error } = await admin.from("conteudos").delete().eq("id", id);
  if (error) return { erro: error.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: "Conteúdo removido." };
}

type TipoConteudoUpload = "video_upload" | "imagem" | "pdf";

/**
 * Registra um arquivo já enviado ao Supabase Storage como conteúdo do módulo.
 * O upload acontece no client (chunk), esta action só inscreve em public.conteudos.
 * Aceita: video_upload, imagem, pdf.
 */
export async function registrarConteudoUploadAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const modulo_id = String(fd.get("modulo_id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  const storage_path = String(fd.get("storage_path") ?? "").trim();
  const tipo = String(fd.get("tipo") ?? "video_upload") as TipoConteudoUpload;
  const titulo = String(fd.get("titulo") ?? "").trim() || null;

  if (!modulo_id) return { erro: "Módulo não informado." };
  if (!storage_path) return { erro: "Path do arquivo não informado." };
  if (!["video_upload", "imagem", "pdf"].includes(tipo)) {
    return { erro: "Tipo de conteúdo inválido." };
  }

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { data: maxOrdem } = await admin
    .from("conteudos")
    .select("ordem")
    .eq("modulo_id", modulo_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proxOrdem = ((maxOrdem?.ordem as number | undefined) ?? -1) + 1;

  const { error } = await admin.from("conteudos").insert({
    modulo_id,
    tipo,
    url: storage_path,
    titulo,
    ordem: proxOrdem,
  });
  if (error) return { erro: error.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  const nome = tipo === "imagem" ? "Imagem" : tipo === "pdf" ? "PDF" : "Vídeo";
  return { ok: `${nome} enviado e adicionado.` };
}

export async function editarModuloAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  const titulo = String(fd.get("titulo") ?? "").trim();
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const recompensa_bigocoins = parseInt(String(fd.get("recompensa") ?? "10"), 10) || 10;
  const nivel_minimo = parseInt(String(fd.get("nivel_minimo") ?? "0"), 10) || 0;
  const is_preparativo = fd.get("is_preparativo") === "on";
  const ativo = fd.get("ativo") === "on";

  if (!id) return { erro: "ID inválido." };
  if (titulo.length < 3) return { erro: "Título muito curto." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("modulos")
    .update({ titulo, descricao, recompensa_bigocoins, nivel_minimo, is_preparativo, ativo })
    .eq("id", id);
  if (error) return { erro: error.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: "Módulo atualizado." };
}

