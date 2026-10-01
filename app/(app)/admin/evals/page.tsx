import { EvalRunner } from "@/components/admin/eval-runner";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { EVAL_CASES } from "@/lib/evals/cases";
import type { EvalResult } from "@/lib/evals/run";

export default async function EvalsPage() {
  const latest = await db.evalRun.findFirst({ orderBy: { createdAt: "desc" } });
  const initial = latest && { id: latest.id, passed: latest.passed, total: latest.total, durationMs: latest.durationMs, createdAt: latest.createdAt.toISOString(), results: latest.results as unknown as EvalResult[] };
  return (
    <>
      <PageHeader title="AI evaluation" subtitle={`${EVAL_CASES.length} test questions covering retrieval, tool use, hallucination and leak guards`} />
      <EvalRunner initial={initial} />
    </>
  );
}
