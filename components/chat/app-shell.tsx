"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LifeBuoy, LogOut, Menu, MessageSquare, Plus, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/types";

export function AppShell({ user, isStaff, conversations, children }: { user: { name: string | null; email: string }; isStaff: boolean; conversations: ConversationSummary[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false); // close the mobile drawer after navigating
  }, [pathname]);

  return (
    <div className="flex h-dvh">
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-sidebar p-3 transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="flex items-center gap-2 font-semibold"><LifeBuoy className="h-5 w-5 text-primary" />SupportAI</span>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Close sidebar" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <Button asChild variant="outline" className="mb-3 justify-start"><Link href="/"><Plus className="h-4 w-4" />New chat</Link></Button>
        {isStaff && (
          <Button asChild variant="ghost" className="mb-3 justify-start"><Link href="/admin"><ShieldCheck className="h-4 w-4" />Admin dashboard</Link></Button>
        )}
        <nav className="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1" aria-label="Conversations">
          {conversations.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">No conversations yet.</p>}
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className={cn("flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted", pathname === `/chat/${c.id}` && "bg-muted font-medium")}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{c.title}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{user.name ?? "Account"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b px-3 md:hidden">
          <Button variant="ghost" size="icon" aria-label="Open sidebar" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <span className="font-semibold">SupportAI</span>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
