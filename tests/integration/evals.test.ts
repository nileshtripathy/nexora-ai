import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { EVAL_CASES } from "@/lib/evals/cases";
import { runEvalCase, runEvalSuite } from "@/lib/evals/run";
import { resetDb, seedAll } from "../helpers/db";

let admin: Awaited<ReturnType<typeof seedAll>>["admin"];
beforeAll(async () => { await resetDb(); ({ admin } = await seedAll()); });

describe("AI evaluation suite", () => {
  it("passes every case end to end and stores the run", async () => {
    const run = await runEvalSuite(admin.id);
    const results = run.results as any[];
    expect(results.filter((r) => !r.passed).map((r) => `${r.id}: ${r.checks.filter((c: any) => !c.passed).map((c: any) => c.name + " " + (c.detail ?? "")).join("; ")}`)).toEqual([]);
    expect(run).toMatchObject({ passed: EVAL_CASES.length, total: EVAL_CASES.length });
    expect(await db.evalRun.count()).toBe(1);
  });

  it("actually detects failures (a wrong expectation fails with a useful detail)", async () => {
    const r = await runEvalCase({ id: "x", name: "wrong", question: "How long do refunds take?", expect: { tool: "getOrderStatus", source: "Shipping Policy", includes: [/zebra/] } });
    expect(r.passed).toBe(false);
    expect(r.checks.filter((c) => !c.passed)).toHaveLength(3);
    expect(r.checks.find((c) => c.name.includes("top retrieved"))?.detail).toMatch(/Refund Policy/);
  });

  it("fails clearly (not crashes) when fixture data is missing", async () => {
    const r = await runEvalCase({ id: "y", name: "no fixture", question: "hi", asUser: "nobody@example.com", expect: {} });
    expect(r.passed).toBe(false);
    expect(r.checks[0].detail).toMatch(/db:seed/);
  });
});
