import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function MasterDashboardPage() {
  const supabase = createSupabaseAdminClient();
  const [{ count: totalUsuarios }, { count: totalLojas }, { count: totalModulos }, { count: totalBrindes }] =
    await Promise.all([
      supabase.from("usuarios").select("*", { count: "exact", head: true }),
      supabase.from("lojas").select("*", { count: "exact", head: true }),
      supabase.from("modulos").select("*", { count: "exact", head: true }),
      supabase.from("brindes").select("*", { count: "exact", head: true }),
    ]);

  const cards = [
    { label: "Colaboradores", valor: totalUsuarios ?? 0, icone: "👥" },
    { label: "Lojas", valor: totalLojas ?? 0, icone: "🏪" },
    { label: "Módulos", valor: totalModulos ?? 0, icone: "📚" },
    { label: "Brindes", valor: totalBrindes ?? 0, icone: "🎁" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Visão geral</h1>
        <p className="text-sm text-[var(--fg-muted)]">Resumo da rede.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white border border-[var(--border)] p-4">
            <div className="text-3xl">{c.icone}</div>
            <div className="text-2xl font-extrabold mt-2">{c.valor}</div>
            <div className="text-xs font-semibold uppercase text-[var(--fg-muted)]">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-[var(--border)] p-6">
        <h2 className="font-bold mb-2">Próximos passos</h2>
        <ol className="text-sm space-y-2 list-decimal list-inside text-[var(--fg-muted)]">
          <li>Cadastra as lojas em <a className="underline" href="/admin/lojas">Lojas</a></li>
          <li>Cria os primeiros colaboradores em <a className="underline" href="/admin/colaboradores">Cadastrar colaborador</a></li>
          <li>Sobe a primeira trilha em <a className="underline" href="/admin/trilhas">Trilhas e módulos</a></li>
        </ol>
      </div>
    </div>
  );
}
