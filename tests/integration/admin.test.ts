import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getConversationTrace, getOverview, listConversations, listTickets } from "@/lib/admin/queries";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetDb, seedAll } from "../helpers/db";
import { signInAs } from "../helpers/auth-mock";
import { postChat } from "../helpers/chat";

vi.mock("@/lib/auth", async () => (await import("../helpers/auth-mock")).authMock);
import { POST as chat } from "@/app/api/chat/route";
import { PATCH as patchTicket } from "@/app/api/admin/tickets/[id]/route";
import { POST as runEvals } from "@/app/api/admin/evals/route";

let alice: Awaited<ReturnType<typeof seedAll>>["alice"], admin: typeof alice;
let convId: string;
beforeAll(async () => {
  await resetDb(); ({ alice, admin } = await seedAll());
  signInAs(alice); resetRateLimits();
  convId = randomUUID();
  await postChat(chat, "How long do refunds take after I return an item?", convId);
  await postChat(chat, "Where is my order SA-1001?", convId);
  await postChat(chat, "Where is my order SA-9999?", convId); // a failing tool call
  await postChat(chat, "What is the capital of Mongolia?");   // ungrounded
  await postChat(chat, "Please create a ticket, my headphones stopped working", convId);
});

describe("admin analytics", () => {
  it("summarises conversations, RAG usage and tool calls", async () => {
    const o = await getOverview(30);
    expect(o.conversations).toBe(2);
    expect(o.questions).toBe(5);
    expect(o.openTickets).toBe(1);
    expect(o.rag.answers).toBe(5);
    expect(o.rag.withSources).toBeGreaterThanOrEqual(1);
    expect(o.rag.withSources).toBeLessThan(5);
    expect(o.rag.avgTopScore).toBeGreaterThan(0);
    const order = o.tools.find((t) => t.tool === "getOrderStatus")!;
    expect(order).toMatchObject({ calls: 2, failures: 1 });
    expect(o.tools.find((t) => t.tool === "createSupportTicket")?.calls).toBe(1);
    const hits = Object.fromEntries(o.topDocs.map((d) => [d.title, d.hits]));
    expect(hits["Refund Policy"]).toBeGreaterThanOrEqual(1);
    expect(hits["Orders and Tracking"]).toBeGreaterThan(hits["Refund Policy"]); // three of the five questions were about orders
    expect(o.topDocs.map((d) => d.hits)).toEqual([...o.topDocs.map((d) => d.hits)].sort((a, b) => b - a)); // sorted by usage
  });

  it("lists conversations with counts in a single query shape", async () => {
    const { rows, total } = await listConversations(1);
    expect(total).toBe(2);
    expect(rows.find((r) => r.id === convId)?._count).toMatchObject({ messages: 8, tickets: 1 });
  });

  it("inspection shows user → retrieved context → tool calls → response, per turn", async () => {
    const t = (await getConversationTrace(convId))!;
    expect(t.turns).toHaveLength(4);
    expect(t.turns[0].user?.content).toMatch(/refunds/);
    expect(t.turns[0].assistant?.sources[0].title).toBe("Refund Policy");
    expect(t.turns[0].assistant?.trace?.query).toMatch(/refunds/);
    expect(t.turns[1].assistant?.toolCalls[0]).toMatchObject({ name: "getOrderStatus", state: "output-available" });
    expect((t.turns[2].assistant?.toolCalls[0].output as any).ok).toBe(false);
    expect(t.turns[1].assistant?.content).toMatch(/SA-1001/);
    expect(t.tickets).toHaveLength(1);
    expect(await getConversationTrace(randomUUID())).toBeNull();
  });

  it("filters tickets by status", async () => {
    expect(await listTickets("OPEN")).toHaveLength(1);
    expect(await listTickets("CLOSED")).toHaveLength(0);
    expect(await listTickets("bogus")).toHaveLength(1); // unknown filter is ignored, not an injection vector
  });
});

describe("admin API authorization", () => {
  const patch = (id: string, body: unknown) => patchTicket(new Request("http://x", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
  let ticketId: string;
  beforeEach(async () => { ticketId = (await db.supportTicket.findFirstOrThrow()).id; });

  it("blocks regular customers and signed-out visitors", async () => {
    signInAs(alice);
    expect((await patch(ticketId, { status: "CLOSED" })).status).toBe(403);
    expect((await runEvals()).status).toBe(403);
    signInAs(null);
    expect((await patch(ticketId, { status: "CLOSED" })).status).toBe(401);
  });
  it("lets staff update a ticket, and validates input", async () => {
    signInAs(admin);
    const ok = await patch(ticketId, { status: "RESOLVED" });
    expect(ok.status).toBe(200);
    expect((await db.supportTicket.findUniqueOrThrow({ where: { id: ticketId } })).status).toBe("RESOLVED");
    expect((await patch(ticketId, { status: "DELETED" })).status).toBe(400);
    expect((await patch(ticketId, { status: "OPEN", userId: "x" })).status).toBe(400); // strict schema
    expect((await patch(ticketId, {})).status).toBe(400);
    expect((await patch("not-a-uuid", { status: "OPEN" })).status).toBe(404);
    expect((await patch(randomUUID(), { status: "OPEN" })).status).toBe(404);
  });
});
