"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ConcluirState = {
  erro?: string;
  ok?: boolean;
  bigocoinsCreditados?: number;
  saldoApos?: number;
};

export async function concluirModuloAction(_p: ConcluirState, fd: FormData): Promise<ConcluirState> {
  const modulo_id = String(fd.get("modulo_id") ?? "");
  if (!modulo_id) return { erro: "Módulo inválido." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const admin = createSupabaseAdminClient();

  // Lê módulo + recompensa + verifica se já concluído (idempotente)
  const { data: modulo } = await admin
    .from("modulos")
    .select("id, recompensa_bigocoins, ativo")
    .eq("id", modulo_id)
    .maybeSingle();
  if (!modulo || !modulo.ativo) return { erro: "Módulo não encontrado." };

  const { data: progressoAtual } = await admin
    .from("progresso")
    .select("status")
    .eq("usuario_id", user.id)
    .eq("modulo_id", modulo_id)
    .maybeSingle();

  if (progressoAtual?.status === "concluido") {
    // Já concluído antes: retorna saldo atual sem creditar de novo
    const { data: saldoRow } = await admin
      .from("saldo_bigocoins")
      .select("saldo")
      .eq("usuario_id", user.id)
      .maybeSingle();
    return { ok: true, bigocoinsCreditados: 0, saldoApos: (saldoRow?.saldo as number) ?? 0 };
  }

  // Upsert progresso = concluído
  const { error: progErr } = await admin.from("progresso").upsert({
    usuario_id: user.id,
    modulo_id,
    status: "concluido",
    video_assistido: true,
    concluido_em: new Date().toISOString(),
    tentativas: (progressoAtual ? 0 : 1),
  }, { onConflict: "usuario_id,modulo_id" });

  if (progErr) return { erro: progErr.message };

  // Credita Bigocoins
  const recompensa = modulo.recompensa_bigocoins as number;
  if (recompensa > 0) {
    await admin.from("bigocoins_extrato").insert({
      usuario_id: user.id,
      valor: recompensa,
      motivo: "modulo_concluido",
      modulo_id,
    });
  }

  const { data: saldoRow } = await admin
    .from("saldo_bigocoins")
    .select("saldo")
    .eq("usuario_id", user.id)
    .maybeSingle();

  revalidatePath("/trilha");
  revalidatePath(`/modulo/${modulo_id}`);

  return {
    ok: true,
    bigocoinsCreditados: recompensa,
    saldoApos: (saldoRow?.saldo as number) ?? recompensa,
  };
}
