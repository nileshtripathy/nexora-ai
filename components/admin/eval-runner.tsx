"use client";
import { useState } from "react";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/admin/ui";
import type { EvalResult } from "@/lib/evals/run";

type Run = { id: string; passed: number; total: number; durationMs: number; createdAt: string; results: EvalResult[] };

export function EvalRunner({ initial }: { initial: Run | null }) {
  const [run, setRun] = useState<Run | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/evals", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "The evaluation run failed.");
      setRun(data.run);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The evaluation run failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={start} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{busy ? "Running…" : "Run evaluation"}</Button>
        {run && !busy && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{run.passed}/{run.total} passed</span> · {(run.durationMs / 1000).toFixed(1)}s · {new Date(run.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
          </p>
        )}
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">{error}</p>}
      {!run && !busy && <EmptyState title="No evaluation runs yet" hint="Run the suite to check retrieval, tool use, hallucination and leak guards end to end." />}
      {busy && !run && <div className="space-y-2" aria-busy>{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>}
      {run && (
        <ul className={busy ? "space-y-2 opacity-50" : "space-y-2"}>
          {run.results.map((r) => (
            <li key={r.id} className="rounded-xl border">
              <details>
                <summary className="flex cursor-pointer items-center gap-3 p-3">
                  {r.passed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-label="passed" /> : <XCircle className="h-5 w-5 shrink-0 text-red-500" aria-label="failed" />}
                  <span className="min-w-0 flex-1"><span className="block font-medium">{r.name}</span><span className="block truncate text-xs text-muted-foreground">{r.question}</span></span>
                  <Badge tone={r.passed ? "green" : "red"}>{r.passed ? "pass" : "fail"}</Badge>
                  <span className="text-xs tabular-nums text-muted-foreground">{r.ms} ms</span>
                </summary>
                <div className="space-y-2 border-t p-3 text-sm">
                  <ul className="space-y-1">
                    {r.checks.map((c, i) => (
                      <li key={i} className="flex gap-2 text-xs">
                        <span className={c.passed ? "text-emerald-500" : "text-red-500"}>{c.passed ? "✓" : "✗"}</span>
                        <span>{c.name}{c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">Tools: {r.toolCalls.join(", ") || "none"} · Retrieved: {r.retrieved.join(", ") || "none"}</p>
                  <p className="whitespace-pre-wrap rounded-lg bg-muted p-2 text-xs">{r.answer || "(no answer)"}</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
