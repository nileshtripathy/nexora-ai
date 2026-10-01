import { requireRole } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { runEvalSuite } from "@/lib/evals/run";

export const maxDuration = 120;

/** Runs the evaluation suite (staff only). Rate limited because every run costs model calls. */
export async function POST() {
  try {
    const user = await requireRole(["ADMIN", "AGENT"]);
    rateLimit(`evals:${user.id}`, 3);
    const run = await runEvalSuite(user.id);
    return Response.json({ run });
  } catch (err) {
    return handleError(err);
  }
}
