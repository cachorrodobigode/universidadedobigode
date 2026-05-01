const INTERNAL_DOMAIN = process.env.INTERNAL_AUTH_DOMAIN || "cdb.app";

export function cpfApenasDigitos(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function cpfValido(cpf: string): boolean {
  const digits = cpfApenasDigitos(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDV = (slice: string, factor: number) => {
    let sum = 0;
    for (const ch of slice) sum += parseInt(ch, 10) * factor--;
    const dv = (sum * 10) % 11;
    return dv === 10 ? 0 : dv;
  };

  const dv1 = calcDV(digits.slice(0, 9), 10);
  const dv2 = calcDV(digits.slice(0, 10), 11);
  return dv1 === parseInt(digits[9], 10) && dv2 === parseInt(digits[10], 10);
}

export function cpfParaEmailInterno(cpf: string): string {
  const digits = cpfApenasDigitos(cpf);
  return `${digits}@${INTERNAL_DOMAIN}`;
}

export function emailInternoParaCpf(email: string): string {
  return email.split("@")[0];
}

export function formatarCpf(cpf: string): string {
  const d = cpfApenasDigitos(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
