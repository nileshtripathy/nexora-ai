import { isToolUIPart } from "ai";
import { db } from "@/lib/db";
import type { ChatMessage, Source } from "@/types";

type Row = { id: string; role: "USER" | "ASSISTANT" | "SYSTEM"; content: string; metadata: unknown };

/**
 * DB row → UI message. Assistant rows keep their full parts (text + tool calls/results) in metadata,
 * so the model remembers what tools returned and the UI can redraw tool activity after a reload.
 */
export function toChatMessage(row: Row): ChatMessage {
  const meta = (row.metadata ?? {}) as { sources?: Source[]; parts?: ChatMessage["parts"] };
  const role = row.role === "ASSISTANT" ? "assistant" : "user";
  const stored = role === "assistant" && Array.isArray(meta.parts)
    ? meta.parts.filter((p) => !isToolUIPart(p) || p.state === "output-available" || p.state === "output-error") // drop unfinished tool calls
    : [];
  return {
    id: row.id,
    role,
    parts: stored.length ? stored : [{ type: "text", text: row.content }],
    metadata: meta.sources ? { sources: meta.sources } : undefined, // trace stays server-side/admin-only
  };
}

/** The LATEST `limit` messages in chronological order (a plain `orderBy asc, take` would return the oldest ones). */
export async function loadRecentMessages(conversationId: string, limit: number) {
  const rows = (await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "desc" }, take: limit })).reverse();
  while (rows[0]?.role === "ASSISTANT") rows.shift(); // a window cut mid-exchange must still start with the customer (some providers reject otherwise)
  return rows;
}
