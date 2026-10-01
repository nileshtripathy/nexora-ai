import { embed } from "ai";
import { db } from "@/lib/db";
import { getEmbeddingModel, toVector } from "@/lib/ai";
import { env } from "@/lib/env";
import { AppError, logError } from "@/lib/errors";
import type { Source } from "@/types";

export type RetrievedChunk = { documentId: string; title: string; content: string; score: number };

/** question → embedding → cosine search in pgvector → top-k relevant chunks. */
export async function retrieve(query: string, k = 4): Promise<RetrievedChunk[]> {
  try {
    const { embedding } = await embed({ model: await getEmbeddingModel(), value: query });
    const v = toVector(embedding);
    const rows = await db.$queryRaw<RetrievedChunk[]>`
      SELECT c."documentId", d."title", c."content", 1 - (c."embedding" <=> ${v}::vector) AS "score"
      FROM "DocumentChunk" c
      JOIN "Document" d ON d."id" = c."documentId"
      WHERE d."status" = 'READY' AND c."embedding" IS NOT NULL
      ORDER BY c."embedding" <=> ${v}::vector
      LIMIT ${k}`;
    return rows.filter((r) => r.score >= env().RAG_MIN_SIMILARITY);
  } catch (err) {
    if (err instanceof AppError) throw err;
    logError("[retrieve] failed:", err);
    throw new AppError(502, "RETRIEVAL_FAILED", "The knowledge base is temporarily unavailable. Please try again.");
  }
}

export const toSources = (chunks: RetrievedChunk[]): Source[] =>
  chunks.map((c, i) => ({
    index: i + 1,
    documentId: c.documentId,
    title: c.title,
    snippet: c.content.replace(/^#{1,6}\s.*$/gm, "").replace(/\s+/g, " ").trim().slice(0, 280), // drop markdown headings; the title is shown separately
    score: +c.score.toFixed(3),
  }));
