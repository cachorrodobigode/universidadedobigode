"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Logout() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createSupabaseBrowserClient().auth.signOut();
        router.replace("/login");
      }}
      className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)] transition"
    >
      Sair
    </button>
  );
}
