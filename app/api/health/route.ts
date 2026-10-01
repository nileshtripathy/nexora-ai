import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe for load balancers and CI. Reports which checks failed, never their values. */
export async function GET() {
  const checks = { env: false, database: false };
  try { env(); checks.env = true; } catch { /* misconfigured */ }
  try { await db.$queryRaw`SELECT 1`; checks.database = true; } catch { /* db down */ }
  const ok = checks.env && checks.database;
  return Response.json({ status: ok ? "ok" : "degraded", checks }, { status: ok ? 200 : 503 });
}
