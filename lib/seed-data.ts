import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { ingestDocument } from "@/lib/rag/ingest";

const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day);
const item = (name: string, quantity: number, priceCents: number) => ({ name, quantity, priceCents });

export const DEMO_PASSWORD = "demo1234";

/** Demo admin + two customers (with orders) so per-user data isolation and the admin dashboard can be exercised. */
export async function seedDemoCustomers() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const upsert = (email: string, name: string, role: "USER" | "ADMIN") =>
    db.user.upsert({ where: { email }, update: { passwordHash, role }, create: { email, name, passwordHash, role } });
  const [alice, bob] = await Promise.all([
    upsert("alice@example.com", "Alice Johnson", "USER"),
    upsert("bob@example.com", "Bob Smith", "USER"),
    upsert("admin@example.com", "Dana Admin", "ADMIN"),
  ]);
  const orders = [
    { orderNumber: "SA-1001", userId: alice.id, status: "SHIPPED" as const, totalCents: 7797, items: [item("Wireless Headphones", 1, 5999), item("USB-C Cable", 2, 899)], carrier: "UPS", trackingNumber: "1Z999AA10123456784", shippedAt: ago(1), estimatedDelivery: new Date(Date.now() + 2 * day), createdAt: ago(2) },
    { orderNumber: "SA-1002", userId: alice.id, status: "PROCESSING" as const, totalCents: 3499, items: [item("Desk Lamp", 1, 3499)], createdAt: ago(0) },
    { orderNumber: "SA-1003", userId: alice.id, status: "DELIVERED" as const, totalCents: 2499, items: [item("Water Bottle", 1, 2499)], carrier: "USPS", trackingNumber: "9400111899223197428490", shippedAt: ago(12), deliveredAt: ago(10), createdAt: ago(14) },
    { orderNumber: "SA-2001", userId: bob.id, status: "SHIPPED" as const, totalCents: 8999, items: [item("Mechanical Keyboard", 1, 8999)], carrier: "FedEx", trackingNumber: "794644790138", shippedAt: ago(1), estimatedDelivery: new Date(Date.now() + 3 * day), createdAt: ago(3) },
  ];
  for (const o of orders) await db.order.upsert({ where: { orderNumber: o.orderNumber }, update: {}, create: o });
  return { users: 3, orders: orders.length };
}

/** Indexes every markdown file in /knowledge-base under a system user. Re-running replaces documents by filename. */
export async function seedKnowledgeBase() {
  const owner = await db.user.upsert({
    where: { email: "system@supportai.dev" },
    update: {},
    create: { email: "system@supportai.dev", name: "SupportAI Knowledge Base", role: "ADMIN" },
  });
  const dir = path.join(process.cwd(), "knowledge-base");
  const out: { title: string; chunks: number }[] = [];
  for (const file of (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort()) {
    const content = await fs.readFile(path.join(dir, file), "utf8");
    const title = content.match(/^#\s+(.+)$/m)?.[1] ?? file;
    const { chunks } = await ingestDocument({ userId: owner.id, title, content, source: file, mimeType: "text/markdown" });
    out.push({ title, chunks });
  }
  return out;
}
