import type { UIMessage } from "ai";
import type { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type ConversationSummary = {
  id: string;
  title: string;
};

/** A knowledge-base excerpt shown to the user as a citation. */
export type Source = {
  index: number; // matches the [n] marker in the answer
  documentId: string;
  title: string;
  snippet: string;
  score: number; // cosine similarity, 0..1
};

/** What happened while producing one answer (stored on assistant messages, shown in admin inspection). */
export type MessageTrace = { query: string; retrieved: number; topScore: number | null; latencyMs: number; injectionFlagged: boolean; model: string };

export type MessageMetadata = { sources?: Source[]; trace?: MessageTrace };
export type ChatMessage = UIMessage<MessageMetadata>;

export type ApiError = { error: { code: string; message: string } };
