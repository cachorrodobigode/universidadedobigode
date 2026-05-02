import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LojaDeBrindes } from "./LojaDeBrindes";

export default async function LojaDeBrindesPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createSupabaseAdminClient();

  const [{ data: brindes }, { data: saldo }, { data: meusResgates }] = await Promise.all([
    admin
      .from("brindes")
      .select("id, nome, descricao, custo_bigocoins, estoque, foto_url")
      .eq("ativo", true)
      .order("custo_bigocoins"),
    admin.from("saldo_bigocoins").select("saldo").eq("usuario_id", usuario.id).maybeSingle(),
    admin
      .from("resgates")
      .select("id, codigo_unico, status, custo, criado_em, expira_em, brinde:brindes(nome)")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);

  return (
    <LojaDeBrindes
      saldo={(saldo?.saldo as number | undefined) ?? 0}
      brindes={(brindes ?? []) as {
        id: string;
        nome: string;
        descricao: string | null;
        custo_bigocoins: number;
        estoque: number;
        foto_url: string | null;
      }[]}
      meusResgates={(meusResgates ?? []) as {
        id: string;
        codigo_unico: string;
        status: string;
        custo: number;
        criado_em: string;
        expira_em: string;
        brinde: { nome: string } | null;
      }[]}
    />
  );
}
