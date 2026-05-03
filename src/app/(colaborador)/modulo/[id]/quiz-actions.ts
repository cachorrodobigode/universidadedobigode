"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ResponderQuizState = {
  erro?: string;
  resultado?: {
    total: number;
    acertos: number;
    nota: number;
    passou: boolean;
    bigocoins_creditados: number;
    saldo_apos: number;
  };
};

export async function responderQuizAction(
  _prev: ResponderQuizState,
  formData: FormData,
): Promise<ResponderQuizState> {
  const modulo_id = String(formData.get("modulo_id") ?? "");
  if (!modulo_id) return { erro: "Módulo não informado." };

  // Coleta as respostas (perguntaId → alternativaId)
  const respostas: { pergunta_id: string; alternativa_id: string }[] = [];
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("p_") && typeof v === "string" && v) {
      respostas.push({ pergunta_id: k.slice(2), alternativa_id: v });
    }
  }
  if (respostas.length === 0) return { erro: "Responda pelo menos uma pergunta." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  // Chama RPC com JWT (a função é SECURITY DEFINER e usa auth.uid())
  const { data, error } = await supabase.rpc("fn_responder_quiz", {
    p_modulo_id: modulo_id,
    p_respostas: respostas,
  });

  if (error) {
    const traducoes: Record<string, string> = {
      QUIZ_NAO_ENCONTRADO: "Esse módulo não tem quiz.",
      NAO_AUTENTICADO: "Sessão expirada.",
    };
    const code = error.message.match(/^[A-Z_]+/)?.[0] ?? "";
    return { erro: traducoes[code] ?? error.message };
  }

  const linha = Array.isArray(data) && data[0] ? data[0] : null;
  if (!linha) return { erro: "Quiz não retornou resultado." };

  revalidatePath("/trilha");
  revalidatePath(`/modulo/${modulo_id}`);

  return {
    resultado: {
      total: linha.total_perguntas as number,
      acertos: linha.acertos as number,
      nota: linha.nota as number,
      passou: linha.passou as boolean,
      bigocoins_creditados: linha.bigocoins_creditados as number,
      saldo_apos: linha.saldo_apos as number,
    },
  };
}
