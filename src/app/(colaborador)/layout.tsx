import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { Logout } from "@/components/Logout";

const TABS = [
  { href: "/trilha", label: "Trilha", icon: "🐾" },
  { href: "/ranking", label: "Ranking", icon: "🏆" },
  { href: "/loja-de-brindes", label: "Brindes", icon: "🎁" },
  { href: "/manuais", label: "Manuais", icon: "📄" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
];

export default async function ColaboradorLayout({
  children,
}: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[var(--primary)] text-[var(--primary-fg)] shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <Link href="/trilha" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="text-2xl">🎓</span>
            <span>Universidade do Bigode</span>
          </Link>

          {/* Nav desktop (oculta no mobile, que tem nav inferior) */}
          <nav className="hidden sm:flex items-center gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-white/15 transition"
              >
                <span className="mr-1">{tab.icon}</span>{tab.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden lg:inline">
              {usuario.nome.split(" ")[0]} · {usuario.cargo?.nome}
            </span>
            {(usuario.is_master || usuario.is_gerente) && (
              <Link
                href={usuario.is_master ? "/admin/master" : "/admin/colaboradores"}
                className="rounded-md bg-white/15 px-3 py-1 hover:bg-white/25 transition"
              >
                Admin
              </Link>
            )}
            <Logout />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>

      {/* Nav inferior só no mobile */}
      <nav className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-[var(--border)] flex">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 py-2 flex flex-col items-center justify-center text-xs font-semibold hover:bg-[var(--bg)] transition"
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
