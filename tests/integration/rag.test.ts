import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { ingestDocument } from "@/lib/rag/ingest";
import { retrieve } from "@/lib/rag/retrieve";
import { makeUser, resetDb, seedAll } from "../helpers/db";

vi.mock("@/lib/ai", async (orig) => {
  const actual = await orig<typeof import("@/lib/ai")>();
  return { ...actual, getEmbeddingModel: vi.fn(actual.getEmbeddingModel) };
});
import { getEmbeddingModel } from "@/lib/ai";

beforeAll(async () => { await resetDb(); await seedAll(); });

describe("RAG pipeline (document → chunk → embedding → vector search)", () => {
  it("indexes every knowledge-base document with embeddings", async () => {
    const docs = await db.document.findMany({ where: { status: "READY" } });
    expect(docs.map((d) => d.title).sort()).toEqual(expect.arrayContaining(["Refund Policy", "Shipping Policy", "Order Cancellation Policy", "Payment Methods and Billing", "Orders and Tracking", "Frequently Asked Questions"]));
    const [{ n }] = await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "DocumentChunk" WHERE embedding IS NULL`;
    expect(n).toBe(0);
  });

  it.each([
    ["How long do refunds take after a return?", "Refund Policy"],
    ["How much is express shipping?", "Shipping Policy"],
    ["Which payment methods do you accept?", "Payment Methods and Billing"],
    ["How do I cancel my order or subscription?", "Order Cancellation Policy"],
  ])("ranks the right document first: %s", async (q, title) => {
    expect((await retrieve(q))[0]?.title).toBe(title);
  });

  it("returns nothing for unrelated questions (so the model says 'I don't know')", async () => {
    expect(await retrieve("What is the capital of Mongolia?")).toEqual([]);
  });

  it("re-ingesting the same source replaces the document instead of duplicating it", async () => {
    const owner = await makeUser("ADMIN");
    const content = "# Warranty\n\n" + "Our warranty covers manufacturing defects for twelve months. ".repeat(5);
    await ingestDocument({ userId: owner.id, title: "Warranty", content, source: "warranty.md" });
    await ingestDocument({ userId: owner.id, title: "Warranty", content: content + " Updated.", source: "warranty.md" });
    expect(await db.document.count({ where: { source: "warranty.md" } })).toBe(1);
  });

  it("a failed re-index never destroys the existing document", async () => {
    const owner = await makeUser("ADMIN");
    const content = "# Gift cards\n\n" + "Gift cards never expire and are delivered by email. ".repeat(5);
    await ingestDocument({ userId: owner.id, title: "Gift cards", content, source: "gift.md" });
    vi.mocked(getEmbeddingModel).mockRejectedValueOnce(new Error("embedding provider down"));
    await expect(ingestDocument({ userId: owner.id, title: "Gift cards", content: content + " v2", source: "gift.md" })).rejects.toThrow();
    const docs = await db.document.findMany({ where: { source: "gift.md" }, orderBy: { createdAt: "asc" } });
    expect(docs.map((d) => d.status)).toEqual(["READY", "FAILED"]); // old version still READY and searchable
  });

  it("ignores documents that are not READY", async () => {
    const rows = await retrieve("gift cards never expire");
    expect(rows.every((r) => r.title !== "")).toBe(true);
    expect(rows.filter((r) => r.title === "Gift cards")).toHaveLength(1);
  });
});
