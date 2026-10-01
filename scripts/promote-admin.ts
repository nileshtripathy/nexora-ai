import { db } from "@/lib/db";

/** Usage: npm run admin:promote -- someone@example.com  (the account must already exist: register first). */
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run admin:promote -- <email>");
  const user = await db.user.update({ where: { email }, data: { role: "ADMIN", tokenVersion: { increment: 1 } }, select: { email: true, role: true } });
  console.log(`✓ ${user.email} is now ${user.role}`);
}

main().catch((e) => { console.error(e.code === "P2025" ? "No user with that email. Register first." : e.message); process.exit(1); }).finally(() => db.$disconnect());
