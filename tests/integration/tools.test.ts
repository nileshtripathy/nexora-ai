import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createTools } from "@/lib/tools";
import { makeUser, resetDb, seedAll } from "../helpers/db";

const opts = { toolCallId: "t", messages: [] };
let alice: Awaited<ReturnType<typeof seedAll>>["alice"], bob: typeof alice;
const toolsFor = (userId: string, conversationId = "c") => createTools({ userId, conversationId });

beforeAll(async () => { await resetDb(); ({ alice, bob } = await seedAll()); });

describe("getOrderStatus", () => {
  it("returns the signed-in customer's own order", async () => {
    const r = (await toolsFor(alice.id).getOrderStatus.execute!({ orderId: "SA-1001" }, opts)) as any;
    expect(r).toMatchObject({ ok: true, orderNumber: "SA-1001", status: "SHIPPED", carrier: "UPS", trackingNumber: "1Z999AA10123456784" });
  });
  it("treats another customer's order exactly like a nonexistent one", async () => {
    const other = (await toolsFor(alice.id).getOrderStatus.execute!({ orderId: "SA-2001" }, opts)) as any;
    const missing = (await toolsFor(alice.id).getOrderStatus.execute!({ orderId: "SA-9999" }, opts)) as any;
    expect(other).toMatchObject({ ok: false, code: "ORDER_NOT_FOUND" });
    expect(other.message.replace("SA-2001", "X")).toBe(missing.message.replace("SA-9999", "X"));
    expect(JSON.stringify(other)).not.toMatch(/FedEx|794644790138|Keyboard/);
  });
});

describe("getCustomerAccount", () => {
  it("returns only the caller's data and never the password hash", async () => {
    const r = (await toolsFor(bob.id).getCustomerAccount.execute!({}, opts)) as any;
    expect(r).toMatchObject({ ok: true, email: "bob@example.com" });
    expect(r.recentOrders.map((o: any) => o.orderNumber)).toEqual(["SA-2001"]);
    expect(JSON.stringify(r)).not.toMatch(/passwordHash|scrypt|alice/i);
  });
});

describe("createSupportTicket", () => {
  let user: typeof alice, convId: string;
  const input = { subject: "Headphones stopped working", description: "My headphones stopped working after two days of use." };
  beforeEach(async () => {
    await db.supportTicket.deleteMany();
    user = await makeUser();
    convId = (await db.conversation.create({ data: { userId: user.id, title: "t" } })).id;
  });

  it("saves a ticket linked to the user and conversation", async () => {
    const r = (await toolsFor(user.id, convId).createSupportTicket.execute!(input, opts)) as any;
    expect(r).toMatchObject({ ok: true, duplicate: false, status: "OPEN", priority: "MEDIUM" });
    const row = await db.supportTicket.findFirstOrThrow();
    expect(row).toMatchObject({ userId: user.id, conversationId: convId, subject: input.subject });
    expect(r.ticketNumber).toBe(`T-${row.id.slice(0, 8).toUpperCase()}`);
  });
  it("is idempotent for retries", async () => {
    const t = toolsFor(user.id, convId);
    await t.createSupportTicket.execute!(input, opts);
    expect(((await t.createSupportTicket.execute!(input, opts)) as any).duplicate).toBe(true);
    expect(await db.supportTicket.count()).toBe(1);
  });
  it("creates exactly one ticket when called concurrently", async () => {
    const t = toolsFor(user.id, convId);
    await Promise.all(Array.from({ length: 6 }, () => t.createSupportTicket.execute!(input, opts)));
    expect(await db.supportTicket.count()).toBe(1);
  });
  it("caps tickets per hour and reports it as a graceful failure", async () => {
    const t = toolsFor(user.id, convId);
    for (let i = 0; i < 5; i++) await t.createSupportTicket.execute!({ ...input, subject: `Problem number ${i}` }, opts);
    expect(await t.createSupportTicket.execute!({ ...input, subject: "One problem too many" }, opts)).toMatchObject({ ok: false, code: "RATE_LIMITED" });
    expect(await db.supportTicket.count()).toBe(5);
  });
});
