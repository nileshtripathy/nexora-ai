import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/rag/ingest";

describe("chunkText", () => {
  it("returns nothing for empty / whitespace input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("  \n\n  ")).toEqual([]);
  });

  it("keeps short text as a single chunk", () => {
    expect(chunkText("# Title\n\nOne short paragraph.")).toHaveLength(1);
  });

  it("splits long text on paragraph boundaries without losing any paragraph", () => {
    const paras = Array.from({ length: 12 }, (_, i) => `Paragraph ${i} ` + "word ".repeat(40).trim());
    const chunks = chunkText(paras.join("\n\n"), 500, 60);
    expect(chunks.length).toBeGreaterThan(2);
    for (const p of paras) expect(chunks.some((c) => c.includes(p))).toBe(true);
  });

  it("carries a small overlap from one chunk into the next", () => {
    const paras = Array.from({ length: 6 }, (_, i) => `P${i} ` + "alpha beta gamma delta ".repeat(15).trim());
    const [first, second] = chunkText(paras.join("\n\n"), 400, 60);
    const tail = first.split(/\s+/).slice(-2).join(" ");
    expect(second).toContain(tail);
  });
});
