import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { redirect } from "next/navigation";
import Link from "next/link";

type ModuloComProgresso = {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  recompensa_bigocoins: number;
  nivel_minimo: number;
  is_preparativo: boolean;
  trilha_id: string;
  trilhas: { nome: string } | null;
  progresso: { status: string; nota_quiz: number | null }[];
};

export default async function TrilhaPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const supabase = await createSupabaseServerClient();

  // Saldo de bigocoins
  const { data: saldo } = await supabase
    .from("saldo_bigocoins")
    .select("saldo")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  // Módulos visíveis (RLS filtra automaticamente por nível do usuário)
  const { data: modulos } = await supabase
    .from("modulos")
    .select(`
      id, ordem, titulo, descricao, recompensa_bigocoins,
      nivel_minimo, is_preparativo, trilha_id,
      trilhas ( nome ),
      progresso!left ( status, nota_quiz )
    `)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .returns<ModuloComProgresso[]>();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#FFD970] p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--secondary)]">
              Bem-vindo, {usuario.nome.split(" ")[0]}!
            </p>
            <h1 className="text-2xl font-extrabold text-[var(--fg)] mt-1">Sua trilha</h1>
            <p className="text-sm text-[var(--fg)] mt-1">
              Cargo: <span className="font-bold">{usuario.cargo?.nome}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-[var(--secondary)]">Saldo</p>
            <p className="text-3xl font-extrabold text-[var(--fg)]">
              {saldo?.saldo ?? 0} <span className="text-lg">🪙</span>
            </p>
            <p className="text-xs font-bold text-[var(--secondary)]">Bigocoins</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {(modulos ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
            <p className="text-4xl mb-2">🐾</p>
            <h3 className="font-bold text-lg">Sua trilha está sendo preparada</h3>
            <p className="text-sm text-[var(--fg-muted)] mt-1">
              A gestora ainda não publicou módulos pro seu cargo. Volte em breve!
            </p>
          </div>
        ) : (
          (modulos ?? []).map((m) => {
            const concluido = m.progresso?.some((p) => p.status === "concluido");
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
