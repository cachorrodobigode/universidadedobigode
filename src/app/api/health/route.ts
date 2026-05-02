import { NextResponse } from "next/server";

// Endpoint de saúde — não autenticado. Confirma que o app está respondendo
// e que as variáveis de ambiente do Supabase estão presentes.
export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      internalAuth: !!process.env.INTERNAL_AUTH_DOMAIN,
    },
    deployId: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) ?? "local",
  });
}
