type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: boolean | undefined | null }
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v) return;
    if (typeof v === "string" || typeof v === "number") classes.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === "object") {
      for (const [k, on] of Object.entries(v)) if (on) classes.push(k);
    }
  };
  inputs.forEach(walk);
  return classes.join(" ");
}
