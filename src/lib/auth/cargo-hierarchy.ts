export const NIVEL_CARGO = {
  ATENDENTE: 0,
  COZINHA: 1,
  MONITOR: 2,
  LIDER: 3,
  SUPERVISOR: 4,
  GERENTE: 5,
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
  99: "Master",
};

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
