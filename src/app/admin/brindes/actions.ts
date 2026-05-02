"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BrindeState = { erro?: string; ok?: string };

async function exigeMaster(): Promise<{ erro?: string; userId?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("usuarios").select("is_master").eq("id", user.id).maybeSingle();
  if (!data?.is_master) return { erro: "Só master pode mexer em brindes." };
  return { userId: user.id };
}

export async function criarBrindeAction(_p: BrindeState, fd: FormData): Promise<BrindeState> {
  const nome = String(fd.get("nome") ?? "").trim();
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const foto_url = String(fd.get("foto_url") ?? "").trim() || null;
  const custo_bigocoins = parseInt(String(fd.get("custo") ?? "0"), 10);
  const estoque = parseInt(String(fd.get("estoque") ?? "0"), 10);

  if (nome.length < 2) return { erro: "Digita o nome do brinde." };
  if (!Number.isFinite(custo_bigocoins) || custo_bigocoins < 1) return { erro: "Custo precisa ser maior que zero." };
  if (!Number.isFinite(estoque) || estoque < 0) return { erro: "Estoque inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("brindes").insert({
    nome, descricao, foto_url, custo_bigocoins, estoque, ativo: true,
  });
  if (error) return { erro: error.message };

  revalidatePath("/admin/brindes");
  revalidatePath("/loja-de-brindes");
  return { ok: `Brinde "${nome}" cadastrado.` };
}

export async function editarBrindeAction(_p: BrindeState, fd: FormData): Promise<BrindeState> {
  const id = String(fd.get("id") ?? "");
  const nome = String(fd.get("nome") ?? "").trim();
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const foto_url = String(fd.get("foto_url") ?? "").trim() || null;
  const custo_bigocoins = parseInt(String(fd.get("custo") ?? "0"), 10);
  const estoque = parseInt(String(fd.get("estoque") ?? "0"), 10);

  if (!id) return { erro: "ID inválido." };
  if (nome.length < 2) return { erro: "Nome muito curto." };
  if (!Number.isFinite(custo_bigocoins) || custo_bigocoins < 1) return { erro: "Custo inválido." };
  if (!Number.isFinite(estoque) || estoque < 0) return { erro: "Estoque inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("brindes")
    .update({ nome, descricao, foto_url, custo_bigocoins, estoque })
    .eq("id", id);
  if (error) return { erro: error.message };

  revalidatePath("/admin/brindes");
  revalidatePath("/loja-de-brindes");
  return { ok: "Brinde atualizado." };
}

export async function toggleAtivoBrindeAction(_p: BrindeState, fd: FormData): Promise<BrindeState> {
  const id = String(fd.get("id") ?? "");
  const novoEstado = String(fd.get("ativo") ?? "true") === "true";
  if (!id) return { erro: "ID inválido." };

  const auth = await exigeMaster();
  if (auth.erro) return { erro: auth.erro };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("brindes").update({ ativo: novoEstado }).eq("id", id);
  if (error) return { erro: error.message };

  revalidatePath("/admin/brindes");
  revalidatePath("/loja-de-brindes");
  return { ok: novoEstado ? "Brinde reativado." : "Brinde inativado." };
}

/**
 * Resgate disparado pelo colaborador na loja-de-brindes.
 * Chama a função SQL fn_resgatar_brinde que faz a transação atômica
 * (lock no estoque + débito do saldo).
 */
export type ResgatarState = {
  erro?: string;
  resgate?: { id: string; codigo_unico: string; custo: number; saldo_apos: number };
};

export async function resgatarBrindeAction(
  _p: ResgatarState,
  fd: FormData,
): Promise<ResgatarState> {
  const brinde_id = String(fd.get("brinde_id") ?? "");
  if (!brinde_id) return { erro: "Brinde não informado." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  // Chama via supabase regular (com JWT) — a função é SECURITY DEFINER,
  // então bypassa RLS, mas precisa de auth.uid() do JWT pra saber quem é.
  const { data, error } = await supabase.rpc("fn_resgatar_brinde", { p_brinde_id: brinde_id });
  if (error) {
    const traducoes: Record<string, string> = {
      BRINDE_NAO_ENCONTRADO: "Brinde não existe.",
      BRINDE_INATIVO: "Brinde indisponível no momento.",
      SEM_ESTOQUE: "Esse brinde acabou. 😕",
      SALDO_INSUFICIENTE: "Você não tem Bigocoins suficientes.",
      NAO_AUTENTICADO: "Sessão expirada.",
    };
    const code = error.message.match(/^[A-Z_]+/)?.[0] ?? "";
    return { erro: traducoes[code] ?? error.message };
  }
  const linha = Array.isArray(data) && data[0] ? data[0] : null;
  if (!linha) return { erro: "Resgate não retornou dados." };

  revalidatePath("/loja-de-brindes");
  return {
    resgate: {
      id: linha.resgate_id as string,
      codigo_unico: linha.codigo_unico as string,
      custo: linha.custo as number,
      saldo_apos: linha.saldo_apos as number,
    },
  };
}
