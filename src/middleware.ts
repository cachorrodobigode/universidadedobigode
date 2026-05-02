import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROTAS_PUBLICAS = ["/login", "/api/health"];
const ROTAS_PRIMEIRO_ACESSO = ["/primeiro-acesso", "/api/auth/trocar-senha"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const ehPublica = ROTAS_PUBLICAS.some((p) => pathname.startsWith(p));

  if (!user && !ehPublica) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("voltar_para", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const { data: usuario, error: usuarioErr } = await supabase
      .from("usuarios")
      .select("primeiro_login, ativo")
      .eq("id", user.id)
      .maybeSingle();

    // Se o auth existe mas o perfil em public.usuarios não foi achado
    // (ou a RLS bloqueou o select), força logout pra evitar loop de redirect.
    if (!usuario || usuarioErr) {
      console.error("[middleware] perfil nao encontrado para auth.user", {
        userId: user.id,
        err: usuarioErr?.message,
      });
      await supabase.auth.signOut();
      const u = new URL("/login", request.url);
      u.searchParams.set("erro", "perfil_nao_encontrado");
      return NextResponse.redirect(u);
    }

    if (!usuario.ativo) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?erro=inativo", request.url));
    }

    if (
      usuario.primeiro_login &&
      !ROTAS_PRIMEIRO_ACESSO.some((p) => pathname.startsWith(p))
    ) {
      return NextResponse.redirect(new URL("/primeiro-acesso", request.url));
    }

    if (pathname === "/login" || pathname === "/") {
      return NextResponse.redirect(new URL("/trilha", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
