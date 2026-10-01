import { BookOpen } from "lucide-react";
import type { Source } from "@/types";

/** Shows only the sources the answer actually cites ([n] markers), so "I don't know" replies show none. */
export function Sources({ text, sources }: { text: string; sources?: Source[] }) {
  const cited = new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  const used = (sources ?? []).filter((s) => cited.has(s.index));
  if (!used.length) return null;

  return (
    <div className="mt-3 space-y-1.5" aria-label="Sources">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><BookOpen className="h-3.5 w-3.5" />Sources</p>
      {used.map((s) => (
        <details key={s.index} className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <summary className="cursor-pointer select-none">
            <span className="font-medium">[{s.index}] {s.title}</span>
            <span className="ml-2 text-xs text-muted-foreground">{Math.round(s.score * 100)}% match</span>
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.snippet}…</p>
        </details>
      ))}
    </div>
  );
}
