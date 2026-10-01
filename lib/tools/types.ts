import { logError } from "@/lib/errors";
/** Identity comes from the server session — tools never accept a user id from the model. */
export type ToolContext = { userId: string; conversationId: string };

export type ToolFailure = { ok: false; code: string; message: string };
export const fail = (code: string, message: string): ToolFailure => ({ ok: false, code, message });

/** Tools never throw into the chat: expected problems return `fail(...)`, unexpected ones are logged and reported generically. */
export async function safe<T extends { ok: true }>(name: string, fn: () => Promise<T | ToolFailure>): Promise<T | ToolFailure> {
  try {
    return await fn();
  } catch (err) {
    logError(`[tool:${name}] failed:`, err);
    return fail("TOOL_ERROR", "This lookup is temporarily unavailable. Please try again in a moment.");
  }
}
