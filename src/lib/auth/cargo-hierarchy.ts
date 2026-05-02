export const NIVEL_CARGO = {
  ATENDENTE: 0,
  COZINHA: 1,
  MONITOR: 2,
  LIDER: 3,
  SUPERVISOR: 4,
  GERENTE: 5,
  FRANQUEADO: 6,
  FRANQUEADORA: 7,
  MASTER: 99,
} as const;

export type NivelCargo = (typeof NIVEL_CARGO)[keyof typeof NIVEL_CARGO];

export const NOME_POR_NIVEL: Record<number, string> = {
  0: "Atendente",
  1: "Cozinha",
  2: "Monitor",
  3: "Líder",
  4: "Supervisor",
  5: "Gerente",
  6: "Franqueado",
  7: "Franqueadora",
  99: "Master",
};

/**
 * Cargo com acesso a TODAS as lojas (sem restrição de loja_id).
 * Franqueadora (matriz) e Master.
 * Usado pra bypass da regra "só edita usuário das suas lojas".
 */
export function temAcessoTotalLojas(nivel: number): boolean {
  return nivel >= NIVEL_CARGO.FRANQUEADORA;
}

export function podeVerModulo(
  nivelUsuario: number,
  nivelMinimoModulo: number,
  isPreparativo: boolean,
): boolean {
  if (nivelMinimoModulo <= nivelUsuario) return true;
  if (isPreparativo && nivelMinimoModulo === nivelUsuario + 1) return true;
  return false;
}

export function eGerenteOuAcima(nivel: number, isMaster: boolean, isGerente: boolean): boolean {
  return isMaster || isGerente || nivel >= NIVEL_CARGO.GERENTE;
}
