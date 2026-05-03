import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { podeVerModulo } from "@/lib/auth/cargo-hierarchy";
import { formatarCpf } from "@/lib/auth/cpf-email";
import { VideoYouTubeProtegido } from "@/components/VideoYouTubeProtegido";
import { VideoUploadProtegido } from "@/components/VideoUploadProtegido";
import { ConcluirModuloForm } from "./ConcluirModuloForm";
import { QuizPlayer } from "./QuizPlayer";

type Conteudo = {
  id: string;
  tipo: "video_youtube" | "video_upload" | "pdf";
  url: string;
  titulo: string | null;
  ordem: number;
};

type Alternativa = { id: string; texto: string; ordem: number };
type Pergunta = { id: string; pergunta: string; ordem: number; alternativas: Alternativa[] };
type QuizDb = { id: string; nota_minima: number; perguntas: Pergunta[] };

type ModuloComConteudos = {
  id: string;
  titulo: string;
  descricao: string | null;
  recompensa_bigocoins: number;
  nivel_minimo: number;
  is_preparativo: boolean;
  ativo: boolean;
  trilha: { nome: string } | null;
  conteudos: Conteudo[];
  quiz: QuizDb | QuizDb[] | null;
};

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data } = await admin
    .from("modulos")
    .select(`
      id, titulo, descricao, recompensa_bigocoins, nivel_minimo, is_preparativo, ativo,
      trilha:trilhas(nome),
      conteudos(id, tipo, url, titulo, ordem),
      quiz:quizzes(
        id, nota_minima,
        perguntas:quiz_perguntas(
          id, pergunta, ordem,
          alternativas:quiz_alternativas(id, texto, ordem)
        )
      )
    `)
    .eq("id", id)
    .maybeSingle()
    .returns<ModuloComConteudos>();

  if (!data || !data.ativo) notFound();

  const nivelUsuario = usuario.cargo?.nivel ?? 0;
  if (
    !usuario.is_master &&
    !podeVerModulo(nivelUsuario, data.nivel_minimo, data.is_preparativo)
  ) {
    redirect("/trilha");
  }

  // Busca progresso do usuário neste módulo
  const { data: progresso } = await admin
    .from("progresso")
    .select("status")
    .eq("usuario_id", usuario.id)
    .eq("modulo_id", id)
    .maybeSingle();
  const concluido = progresso?.status === "concluido";

  const conteudos = (data.conteudos ?? []).sort((a, b) => a.ordem - b.ordem);

  // Pre-gera signed URLs pros vídeos hospedados (server-side, inline pra evitar
  // qualquer overhead de Server Action chamada de Server Component).
  const signedUrls = new Map<string, string>();
  for (const c of conteudos) {
    if (c.tipo !== "video_upload") continue;
    try {
      const { data: sig } = await admin.storage.from("videos").createSignedUrl(c.url, 300);
      if (sig?.signedUrl) signedUrls.set(c.id, sig.signedUrl);
    } catch (e) {
      console.error("[modulo] signed url falhou", c.id, (e as Error).message);
    }
  }

  const cpfLabel = formatarCpf(usuario.cpf);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/trilha" className="text-xs text-[var(--fg-muted)] hover:underline">
          ← Trilha
        </Link>
        <h1 className="text-2xl font-extrabold mt-1">{data.titulo}</h1>
        {data.trilha?.nome && (
          <p className="text-xs text-[var(--fg-muted)]">Trilha: {data.trilha.nome}</p>
        )}
        {data.descricao && (
          <p className="text-sm text-[var(--fg)] mt-2">{data.descricao}</p>
        )}
      </div>

      {conteudos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
          <p className="text-4xl mb-2">⏳</p>
          <p className="text-sm text-[var(--fg-muted)]">
            Esse módulo ainda não tem vídeos publicados.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {conteudos.map((c) => {
            if (c.titulo) {
              return (
                <div key={c.id} className="space-y-2">
                  <p className="text-sm font-semibold">{c.titulo}</p>
                  <Player conteudo={c} signedUrls={signedUrls} cpfLabel={cpfLabel} nome={usuario.nome} />
                </div>
              );
            }
            return (
              <Player key={c.id} conteudo={c} signedUrls={signedUrls} cpfLabel={cpfLabel} nome={usuario.nome} />
            );
          })}
        </div>
      )}

      {(() => {
        const quizDb = Array.isArray(data.quiz) ? data.quiz[0] : data.quiz;
        const temQuiz = quizDb && (quizDb.perguntas?.length ?? 0) > 0;

        if (temQuiz) {
          return (
            <QuizPlayer
              moduloId={data.id}
              notaMinima={quizDb!.nota_minima}
              perguntas={quizDb!.perguntas ?? []}
              jaConcluido={concluido}
              recompensa={data.recompensa_bigocoins}
            />
          );
        }

        return (
          <div className="rounded-xl bg-white border border-[var(--border)] p-6">
            {concluido ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="font-bold">Você já concluiu esse módulo!</p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Já recebeu {data.recompensa_bigocoins} 🪙 Bigocoins por isso.
                  </p>
                </div>
              </div>
            ) : (
              <ConcluirModuloForm
                moduloId={data.id}
                recompensa={data.recompensa_bigocoins}
              />
            )}
          </div>
        );
      })()}
    </div>
  );
}

function Player({
  conteudo,
  signedUrls,
  cpfLabel,
  nome,
}: {
  conteudo: Conteudo;
  signedUrls: Map<string, string>;
  cpfLabel: string;
  nome: string;
}) {
  if (conteudo.tipo === "video_youtube") {
    return <VideoYouTubeProtegido videoId={conteudo.url} cpfLabel={cpfLabel} nome={nome} />;
  }
  if (conteudo.tipo === "video_upload") {
    const url = signedUrls.get(conteudo.id);
    if (!url) {
      return (
        <div className="rounded-xl border border-[var(--danger)] bg-red-50 p-4 text-sm text-[var(--danger)]">
          Não foi possível gerar o link do vídeo. Tenta de novo em instantes.
        </div>
      );
    }
    return <VideoUploadProtegido signedUrl={url} cpfLabel={cpfLabel} nome={nome} />;
  }
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--fg-muted)]">
      Tipo de conteúdo não suportado ainda: {conteudo.tipo}
    </div>
  );
}
