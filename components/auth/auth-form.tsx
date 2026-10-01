"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

const field = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary";

export function AuthForm({ showDemoHint }: { showDemoHint: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? "Something went wrong. Please try again.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="mb-2 flex items-center gap-2 text-lg font-semibold"><LifeBuoy className="h-6 w-6 text-primary" />SupportAI</div>
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Sign in" : "Create your account"}</h1>
        {mode === "register" && <input name="name" placeholder="Name" autoComplete="name" required className={field} />}
        <input name="email" type="email" placeholder="Email" autoComplete="email" required className={field} />
        <input name="password" type="password" placeholder="Password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : 1} className={field} />
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
        <button type="button" className="text-sm text-muted-foreground underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
        {showDemoHint && <p className="text-xs text-muted-foreground">Dev demo (after npm run db:seed): alice@example.com / demo1234</p>}
      </form>
    </div>
  );
}
