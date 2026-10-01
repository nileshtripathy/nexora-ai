import { embedMany } from "ai";
import { db } from "@/lib/db";
import { getEmbeddingModel, toVector } from "@/lib/ai";
import { AppError, logError } from "@/lib/errors";

/** Paragraph-aware chunking (~900 chars) with a small overlap so context isn't cut mid-thought. */
export function chunkText(text: string, size = 900, overlap = 120): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paragraphs) {
    if (cur && cur.length + p.length + 2 > size) {
      chunks.push(cur);
      cur = cur.slice(-overlap).replace(/^\S*\s/, "") + "\n\n" + p; // overlap starts at a word boundary
    } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

type IngestInput = { userId: string; title: string; content: string; source?: string; mimeType?: string };

/** document → chunks → embeddings → pgvector. Re-ingesting the same `source` replaces the old version (only once the new one is ready). */
export async function ingestDocument({ userId, title, content, source, mimeType }: IngestInput) {
  const pieces = chunkText(content);
  if (!pieces.length) throw new AppError(400, "EMPTY_DOCUMENT", "The document has no content.");

  const doc = await db.document.create({ data: { userId, title, source, mimeType, status: "PROCESSING" } });

  try {
    // Prefix the title so short chunks still carry their topic.
    const { embeddings } = await embedMany({ model: await getEmbeddingModel(), values: pieces.map((p) => `${title}\n\n${p}`) });
    await db.$transaction(
      pieces.map(
        (text, i) => db.$executeRaw`
          INSERT INTO "DocumentChunk" ("id", "documentId", "index", "content", "tokenCount", "embedding")
          VALUES (gen_random_uuid()::text, ${doc.id}, ${i}, ${text}, ${Math.ceil(text.length / 4)}, ${toVector(embeddings[i])}::vector)`,
      ),
    );
    // Swap in the new version and drop the old one atomically; a failed re-index never loses the existing document.
    await db.$transaction([
      db.document.update({ where: { id: doc.id }, data: { status: "READY" } }),
      ...(source ? [db.document.deleteMany({ where: { userId, source, id: { not: doc.id } } })] : []),
    ]);
    return { id: doc.id, title, chunks: pieces.length };
  } catch (err) {
    await db.document.update({ where: { id: doc.id }, data: { status: "FAILED" } }).catch(() => {});
    if (err instanceof AppError) throw err;
    logError("[ingest] failed:", err);
    throw new AppError(502, "INGEST_FAILED", "Could not index the document. Please try again.");
  }
}
