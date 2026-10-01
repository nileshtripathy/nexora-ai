import { describe, expect, it } from "vitest";
import { hashEmbedding } from "@/lib/ai-mock";
import { EMBEDDING_DIMS } from "@/lib/ai";

const cos = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

describe("offline embeddings", () => {
  it("are unit-length with the pgvector column's dimensions", () => {
    const v = hashEmbedding("How long do refunds take?");
    expect(v).toHaveLength(EMBEDDING_DIMS);
    expect(Math.sqrt(v.reduce((s, x) => s + x * x, 0))).toBeCloseTo(1, 5);
  });
  it("rank the topically related text highest", () => {
    const q = hashEmbedding("how long do refunds take after a return");
    expect(cos(q, hashEmbedding("Refunds are issued within 7 days after we receive the returned item"))).toBeGreaterThan(
      cos(q, hashEmbedding("Express shipping takes two business days")),
    );
  });
});
