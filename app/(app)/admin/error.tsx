"use client";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-6">
      <h2 className="font-semibold">Couldn't load this admin page</h2>
      <p className="text-sm text-muted-foreground">The database may be unreachable. Your data is safe — try again in a moment.</p>
      <Button variant="outline" onClick={reset}>Try again</Button>
    </div>
  );
}
