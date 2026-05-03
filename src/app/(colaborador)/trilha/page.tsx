import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { podeVerModulo } from "@/lib/auth/cargo-hierarchy";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ComoFuncionaCard } from "@/components/ComoFuncionaCard";

type Modulo = {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  recompensa_bigocoins: number;
  nivel_minimo: number;
  is_preparativo: boolean;
  trilha_id: string;
};

export default async function TrilhaPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createSupabaseAdminClient();
  const nivelUsuario = usuario.cargo?.nivel ?? 0;

  // Saldo (envolto em try pra não quebrar a página se a view não existir)
  let saldo = 0;
  try {
    const { data } = await admin
      .from("saldo_bigocoins")
      .select("saldo")
      .eq("usuario_id", usuario.id)
      .maybeSingle();
    saldo = (data?.saldo as number | undefined) ?? 0;
  } catch (e) {
    console.error("[trilha] saldo:", (e as Error).message);
  }

  // Módulos (sem left join pra evitar resolução ambígua de relação)
  let modulosTodos: Modulo[] = [];
  try {
    const { data, error } = await admin
      .from("modulos")
      .select("id, ordem, titulo, descricao, recompensa_bigocoins, nivel_minimo, is_preparativo, trilha_id")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    if (error) throw error;
    modulosTodos = (data as Modulo[] | null) ?? [];
  } catch (e) {
    console.error("[trilha] modulos:", (e as Error).message);
  }

  const modulos = modulosTodos.filter((m) =>
    podeVerModulo(nivelUsuario, m.nivel_minimo, m.is_preparativo),
  );

  // Progresso do user atual em uma query separada
  let progressoMap = new Map<string, string>();
  if (modulos.length > 0) {
    try {
      const { data: progressos } = await admin
        .from("progresso")
        .select("modulo_id, status")
        .eq("usuario_id", usuario.id);
      for (const p of progressos ?? []) {
        progressoMap.set(p.modulo_id as string, p.status as string);
      }
    } catch (e) {
      console.error("[trilha] progresso:", (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <ComoFuncionaCard />

      <section className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#FFD970] p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--secondary)]">
              Bem-vindo, {usuario.nome.split(" ")[0]}!
            </p>
            <h1 className="text-2xl font-extrabold text-[var(--fg)] mt-1">Sua trilha</h1>
            <p className="text-sm text-[var(--fg)] mt-1">
              Cargo: <span className="font-bold">{usuario.cargo?.nome ?? "—"}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-[var(--secondary)]">Saldo</p>
            <p className="text-3xl font-extrabold text-[var(--fg)]">
              {saldo} <span className="text-lg">🪙</span>
            </p>
            <p className="text-xs font-bold text-[var(--secondary)]">Bigocoins</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {modulos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
            <p className="text-4xl mb-2">🐾</p>
            <h3 className="font-bold text-lg">Sua trilha está sendo preparada</h3>
            <p className="text-sm text-[var(--fg-muted)] mt-1">
              A gestora ainda não publicou módulos pro seu cargo. Volte em breve!
            </p>
            {usuario.is_master && (
              <p className="text-xs text-[var(--fg-muted)] mt-4">
                Você é Master — pode criar trilhas em{" "}
                <Link className="underline" href="/admin/trilhas">/admin/trilhas</Link>.
              </p>
            )}
          </div>
        ) : (
          modulos.map((m) => {
            const concluido = progressoMap.get(m.id) === "concluido";
            return (
              <Link
                key={m.id}
                href={`/modulo/${m.id}`}
                className="block rounded-xl border border-[var(--border)] bg-white p-4 hover:shadow-md hover:border-[var(--primary)] transition"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xl shrink-0 ${
                      concluido
                        ? "bg-[var(--success)] text-white"
                        : "bg-[var(--accent)] text-[var(--accent-fg)]"
                    }`}
                  >
                    {concluido ? "✓" : m.ordem}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base">{m.titulo}</h3>
                      {m.is_preparativo && (
                        <span className="text-[10px] font-bold uppercase bg-[var(--secondary)] text-[var(--secondary-fg)] px-2 py-0.5 rounded">
                          Preparativo
                        </span>
                      )}
                    </div>
                    {m.descricao && (
                      <p className="text-sm text-[var(--fg-muted)] mt-1 line-clamp-2">
                        {m.descricao}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-[var(--primary)] mt-2">
                      +{m.recompensa_bigocoins} 🪙 ao concluir
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
