export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
