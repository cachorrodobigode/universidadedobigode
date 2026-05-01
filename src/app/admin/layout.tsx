import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { Logout } from "@/components/Logout";

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  if (!usuario.is_master && !usuario.is_gerente) redirect("/trilha");

  const linksMaster = [
    { href: "/admin/master", label: "Visão geral" },
    { href: "/admin/usuarios", label: "Usuários" },
    { href: "/admin/colaboradores", label: "Cadastrar colaborador" },
    { href: "/admin/cargos", label: "Cargos" },
    { href: "/admin/lojas", label: "Lojas" },
    { href: "/admin/trilhas", label: "Trilhas e módulos" },
    { href: "/admin/quizzes", label: "Quizzes" },
    { href: "/admin/manuais", label: "Manuais (PDF)" },
    { href: "/admin/brindes", label: "Brindes" },
    { href: "/admin/relatorios", label: "Relatórios" },
  ];

  const linksGerente = [
    { href: "/admin/colaboradores", label: "Cadastrar colaborador" },
    { href: "/admin/validar-cupom", label: "Validar cupom" },
    { href: "/admin/dashboard-loja", label: "Equipe da loja" },
  ];

  const links = usuario.is_master ? linksMaster : linksGerente;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[var(--secondary)] text-[var(--secondary-fg)] shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={usuario.is_master ? "/admin/master" : "/admin/colaboradores"} className="flex items-center gap-2 font-extrabold">
            <span className="text-2xl">⚙️</span>
            <span>Admin · {usuario.is_master ? "Master" : "Gerente"}</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/trilha" className="rounded-md bg-white/15 px-3 py-1 hover:bg-white/25 transition">
              Voltar pro app
            </Link>
            <Logout />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:border-r md:border-[var(--border)] md:pr-4">
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-[var(--bg)] whitespace-nowrap"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}
