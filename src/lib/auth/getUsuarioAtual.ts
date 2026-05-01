import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UsuarioComCargo } from "@/lib/types/db";

export async function getUsuarioAtual(): Promise<UsuarioComCargo | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("*, cargo:cargos(nome, nivel), loja:lojas(nome)")
    .eq("id", user.id)
    .maybeSingle();

  return (data as UsuarioComCargo | null) ?? null;
}
