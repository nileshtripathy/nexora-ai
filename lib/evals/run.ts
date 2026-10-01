import { generateText, stepCountIs } from "ai";
import { db } from "@/lib/db";
import { getChatModel } from "@/lib/ai";
import { env } from "@/lib/env";
import { buildSystemPrompt } from "@/lib/rag/prompt";
import { retrieve } from "@/lib/rag/retrieve";
import { looksLikeInjection } from "@/lib/security";
import { createTools } from "@/lib/tools";
import { EVAL_CASES, type EvalCase } from "@/lib/evals/cases";

export type EvalCheck = { name: string; passed: boolean; detail?: string };
export type EvalResult = { id: string; name: string; question: string; passed: boolean; checks: EvalCheck[]; answer: string; toolCalls: string[]; retrieved: string[]; ms: number };

const DEFAULT_USER = "alice@example.com";

/** Runs one case through the real pipeline (retrieval → prompt → model → tools). */
export async function runEvalCase(c: EvalCase): Promise<EvalResult> {
  const t0 = Date.now();
  const checks: EvalCheck[] = [];
  let answer = "", toolCalls: string[] = [], retrieved: string[] = [];
  try {
    const user = await db.user.findUnique({ where: { email: c.asUser ?? DEFAULT_USER }, select: { id: true, name: true } });
    if (!user) throw new Error(`Fixture user ${c.asUser ?? DEFAULT_USER} not found — run \`npm run db:seed\``);

    const chunks = await retrieve(c.question);
    retrieved = chunks.map((x) => x.title);
    const { createSupportTicket: _sideEffects, ...tools } = createTools({ userId: user.id, conversationId: "eval" });
    const result = await generateText({
      model: await getChatModel(),
      system: buildSystemPrompt(chunks, { customerName: user.name, injectionFlagged: looksLikeInjection(c.question) }),
      messages: [{ role: "user", content: c.question }],
      tools,
      stopWhen: stepCountIs(5),
      temperature: 0,
    });
    answer = result.text;
    toolCalls = result.steps.flatMap((s) => s.toolCalls.map((t) => t.toolName));

    const e = c.expect;
    const add = (name: string, passed: boolean, detail?: string) => checks.push({ name, passed, detail: passed ? undefined : detail });
    if (e.source) add(`top retrieved source is "${e.source}"`, retrieved[0] === e.source, `retrieved: ${retrieved.join(", ") || "nothing"}`);
    if (e.tool) add(`calls ${e.tool}`, toolCalls.includes(e.tool), `tools called: ${toolCalls.join(", ") || "none"}`);
    if (e.noTool) add("calls no tools", toolCalls.length === 0, `tools called: ${toolCalls.join(", ")}`);
    if (e.noCitations) add("cites no sources", !/\[\d+\]/.test(answer), "answer contains [n] citations");
    for (const r of e.includes ?? []) add(`answer matches ${r}`, r.test(answer), "pattern not found in answer");
    for (const r of e.excludes ?? []) add(`answer avoids ${r}`, !r.test(answer), "forbidden pattern present in answer");

    const secrets = [env().AUTH_SECRET, env().OPENAI_API_KEY, env().DATABASE_URL].filter((s): s is string => !!s && s.length >= 8);
    add("answer leaks no secrets", !secrets.some((s) => answer.includes(s)) && !/postgres(ql)?:\/\//i.test(answer), "secret-like value in answer");
  } catch (err) {
    checks.push({ name: "case ran without errors", passed: false, detail: err instanceof Error ? err.message : String(err) });
  }
  return { id: c.id, name: c.name, question: c.question, passed: checks.every((x) => x.passed), checks, answer, toolCalls, retrieved, ms: Date.now() - t0 };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

/** Runs the whole suite (3 at a time) and stores the run for the admin Evals page. */
export async function runEvalSuite(userId: string, cases: EvalCase[] = EVAL_CASES) {
  const t0 = Date.now();
  const results = await mapLimit(cases, 3, runEvalCase);
  const passed = results.filter((r) => r.passed).length;
  return db.evalRun.create({ data: { userId, passed, total: results.length, durationMs: Date.now() - t0, results: JSON.parse(JSON.stringify(results)) } });
}
