// Tipos derivados manualmente do schema Postgres em supabase/migrations/0001_schema.sql.
// Quando a Supabase CLI estiver configurada localmente, podem ser gerados via:
//   supabase gen types typescript --project-id <id> --schema public > src/lib/types/db.ts

export type StatusModulo = "bloqueado" | "disponivel" | "concluido";
export type TipoConteudo = "video_youtube" | "pdf";
export type StatusResgate = "pendente" | "validado" | "cancelado" | "expirado";

export type Cargo = {
  id: string;
  nome: string;
  nivel: number;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
};

export type Loja = {
  id: string;
  nome: string;
  cidade: string | null;
  ativa: boolean;
  criado_em: string;
};

export type Usuario = {
  id: string;
  cpf: string;
  nome: string;
  cargo_id: string;
  loja_id: string | null;
  is_master: boolean;
  is_gerente: boolean;
  primeiro_login: boolean;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type UsuarioComCargo = Usuario & {
  cargo: Pick<Cargo, "nome" | "nivel">;
  loja: Pick<Loja, "nome"> | null;
};

export type Trilha = {
  id: string;
  nome: string;
  descricao: string | null;
  cargo_id: string | null;
  ordem: number;
  ativa: boolean;
};

export type Modulo = {
  id: string;
  trilha_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  recompensa_bigocoins: number;
  nivel_minimo: number;
  is_preparativo: boolean;
  ativo: boolean;
};

export type Conteudo = {
  id: string;
  modulo_id: string;
  ordem: number;
  tipo: TipoConteudo;
  url: string;
  titulo: string | null;
  duracao_seg: number | null;
};

export type Brinde = {
  id: string;
  nome: string;
  descricao: string | null;
  custo_bigocoins: number;
  estoque: number;
  foto_url: string | null;
  ativo: boolean;
};

export type Resgate = {
  id: string;
  usuario_id: string;
  brinde_id: string;
  codigo_unico: string;
  status: StatusResgate;
  custo: number;
  criado_em: string;
  validado_em: string | null;
  expira_em: string;
};
