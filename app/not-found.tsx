import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">It may have been removed, or it isn't yours to view.</p>
      <Button asChild><Link href="/">Back to chat</Link></Button>
    </div>
  );
}
