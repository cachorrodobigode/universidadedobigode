import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UsuarioComCargo } from "@/lib/types/db";

/**
 * Lê o usuário autenticado + cargo + loja.
 *
 * Usa o ADMIN client pra fazer o select de public.usuarios porque a RLS
 * desta tabela tem recursão (a policy chama fn_sou_master que faz select
 * em usuarios, que dispara a policy de novo). Como o middleware já
 * autenticou via auth.getUser(), o id do auth é confiável.
 */
export async function getUsuarioAtual(): Promise<UsuarioComCargo | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("usuarios")
    .select("*, cargo:cargos(nome, nivel), loja:lojas(nome)")
    .eq("id", user.id)
    .maybeSingle();

  return (data as UsuarioComCargo | null) ?? null;
}
