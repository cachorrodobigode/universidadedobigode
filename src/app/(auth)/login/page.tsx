import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

// Login depende de cookies/auth → sempre dynamic, nunca prerenderizar.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
