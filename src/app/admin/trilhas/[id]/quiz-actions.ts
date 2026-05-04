"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type QuizState = { erro?: string; ok?: string };

async function exigeMaster(): Promise<{ erro?: string; userId?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("usuarios").select("is_master").eq("id", user.id).maybeSingle();
  if (!data?.is_master) return { erro: "Só master mexe em quiz." };
  return { userId: user.id };
}

export async function criarQuizAction(_p: QuizState, fd: FormData): Promise<QuizState> {
  const modulo_id = String(fd.get("modulo_id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  const nota_minima = parseInt(String(fd.get("nota_minima") ?? "70"), 10);
  if (!modulo_id) return { erro: "Módulo inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("quizzes").insert({
    modulo_id,
    nota_minima: Number.isFinite(nota_minima) ? Math.max(0, Math.min(100, nota_minima)) : 70,
    permite_refazer: true,
  });
  if (error) return { erro: error.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: "Quiz criado. Adicione perguntas." };
}

export async function adicionarPerguntaAction(_p: QuizState, fd: FormData): Promise<QuizState> {
  const quiz_id = String(fd.get("quiz_id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  const pergunta = String(fd.get("pergunta") ?? "").trim();
  const explicacao = String(fd.get("explicacao") ?? "").trim() || null;
  const corretaIdx = parseInt(String(fd.get("correta") ?? "-1"), 10);

  if (!quiz_id || !pergunta) return { erro: "Pergunta inválida." };

  // Coleta alternativas (alt_0, alt_1, alt_2, alt_3, alt_4)
  const alternativas: { texto: string; correta: boolean }[] = [];
  for (let i = 0; i < 5; i++) {
    const t = String(fd.get(`alt_${i}`) ?? "").trim();
    if (t) alternativas.push({ texto: t, correta: i === corretaIdx });
  }
  if (alternativas.length < 2) return { erro: "Precisa de pelo menos 2 alternativas." };
  if (!alternativas.some((a) => a.correta)) return { erro: "Marque qual alternativa está correta." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();

  // Próxima ordem da pergunta
  const { count } = await admin
    .from("quiz_perguntas")
    .select("*", { count: "exact", head: true })
    .eq("quiz_id", quiz_id);
  const ordem = (count ?? 0) + 1;

  const { data: pInserida, error: pErr } = await admin
    .from("quiz_perguntas")
    .insert({ quiz_id, ordem, pergunta, explicacao })
    .select("id")
    .single();
  if (pErr || !pInserida) return { erro: pErr?.message ?? "Erro ao salvar." };

  const linhas = alternativas.map((a, i) => ({
    pergunta_id: pInserida.id,
    ordem: i + 1,
    texto: a.texto,
    correta: a.correta,
  }));
  const { error: aErr } = await admin.from("quiz_alternativas").insert(linhas);
  if (aErr) return { erro: aErr.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: "Pergunta adicionada." };
}

export async function editarPerguntaAction(_p: QuizState, fd: FormData): Promise<QuizState> {
  const pergunta_id = String(fd.get("pergunta_id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  const pergunta = String(fd.get("pergunta") ?? "").trim();
  const explicacao = String(fd.get("explicacao") ?? "").trim() || null;
  const corretaIdx = parseInt(String(fd.get("correta") ?? "-1"), 10);

  if (!pergunta_id || !pergunta) return { erro: "Pergunta inválida." };

  const alternativas: { texto: string; correta: boolean }[] = [];
  for (let i = 0; i < 5; i++) {
    const t = String(fd.get(`alt_${i}`) ?? "").trim();
    if (t) alternativas.push({ texto: t, correta: i === corretaIdx });
  }
  if (alternativas.length < 2) return { erro: "Precisa de pelo menos 2 alternativas." };
  if (!alternativas.some((a) => a.correta)) return { erro: "Marque qual alternativa está correta." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();

  // Atualiza texto da pergunta
  const { error: pErr } = await admin
    .from("quiz_perguntas")
    .update({ pergunta, explicacao })
    .eq("id", pergunta_id);
  if (pErr) return { erro: pErr.message };

  // Substitui alternativas (apaga e recria — mais simples que diff).
  await admin.from("quiz_alternativas").delete().eq("pergunta_id", pergunta_id);
  const linhas = alternativas.map((a, i) => ({
    pergunta_id,
    ordem: i + 1,
    texto: a.texto,
    correta: a.correta,
  }));
  const { error: aErr } = await admin.from("quiz_alternativas").insert(linhas);
  if (aErr) return { erro: aErr.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: "Pergunta atualizada." };
}

export async function deletarPerguntaAction(_p: QuizState, fd: FormData): Promise<QuizState> {
  const pergunta_id = String(fd.get("pergunta_id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  if (!pergunta_id) return { erro: "ID inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("quiz_perguntas").delete().eq("id", pergunta_id);
  if (error) return { erro: error.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: "Pergunta removida." };
}

export async function deletarQuizAction(_p: QuizState, fd: FormData): Promise<QuizState> {
  const quiz_id = String(fd.get("quiz_id") ?? "");
  const trilha_id = String(fd.get("trilha_id") ?? "");
  if (!quiz_id) return { erro: "ID inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("quizzes").delete().eq("id", quiz_id);
  if (error) return { erro: error.message };

  if (trilha_id) revalidatePath(`/admin/trilhas/${trilha_id}`);
  return { ok: "Quiz removido." };
}
