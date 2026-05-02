import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Endpoint de debug — retorna o que o app está vendo pro user logado.
// Se algo lançar, capturamos e devolvemos como JSON.
export async function GET() {
  const out: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    out.auth = { hasUser: !!user, userId: user?.id ?? null, authErr: authErr?.message ?? null };

    if (user) {
      const admin = createSupabaseAdminClient();
      const { data: usuario, error: uErr } = await admin
        .from("usuarios")
        .select("id, cpf, nome, primeiro_login, ativo, is_master, is_gerente, cargo:cargos(nome, nivel), loja:lojas!loja_id(nome)")
        .eq("id", user.id)
        .maybeSingle();
      out.publicProfile = { found: !!usuario, data: usuario, err: uErr?.message ?? null };

      const { data: modulos, error: mErr } = await admin
        .from("modulos")
        .select("id, titulo")
        .eq("ativo", true)
        .limit(3);
      out.modulosSample = { count: modulos?.length ?? 0, sample: modulos, err: mErr?.message ?? null };

      const { data: lojas, error: lErr } = await admin
        .from("lojas").select("id, nome").limit(5);
      out.lojas = { count: lojas?.length ?? 0, sample: lojas, err: lErr?.message ?? null };
    }
  } catch (e) {
    const err = e as Error;
    out.fatal = { message: err.message, stack: err.stack?.split("\n").slice(0, 5) };
  }

  return NextResponse.json(out, { status: 200 });
}
