import { db } from "@/lib/db";
import { seedDemoCustomers, seedKnowledgeBase } from "@/lib/seed-data";
import { resetRateLimits } from "@/lib/rate-limit";
import type { SessionUser } from "@/types";

export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("_test")) throw new Error("resetDb() refused: not a _test database");
  await db.$executeRawUnsafe(`TRUNCATE "EvalRun","SupportTicket","Order","Message","Conversation","DocumentChunk","Document","User" CASCADE`);
  resetRateLimits();
}

export async function makeUser(role: "USER" | "AGENT" | "ADMIN" = "USER", email = `u${Math.random().toString(36).slice(2)}@test.dev`): Promise<SessionUser> {
  const u = await db.user.create({ data: { email, name: "Test User", role }, select: { id: true, email: true, name: true, role: true } });
  return u;
}

export async function seedAll() {
  await seedDemoCustomers();
  await seedKnowledgeBase();
  const byEmail = async (email: string): Promise<SessionUser> =>
    db.user.findUniqueOrThrow({ where: { email }, select: { id: true, email: true, name: true, role: true } });
  return { alice: await byEmail("alice@example.com"), bob: await byEmail("bob@example.com"), admin: await byEmail("admin@example.com") };
}
