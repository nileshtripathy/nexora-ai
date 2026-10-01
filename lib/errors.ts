import { ZodError } from "zod";
import { redactSecrets } from "@/lib/security";

/** Server-side logging that never prints credentials (connection strings, keys) that libraries put in error messages. */
export function logError(tag: string, err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(tag, redactSecrets(`${e.name}: ${e.message}`), redactSecrets(e.stack?.split("\n").slice(1, 4).join("\n") ?? ""));
}

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Converts any thrown value into a consistent JSON error response. */
export function handleError(err: unknown): Response {
  if (err instanceof AppError) return json(err.status, err.code, err.message);
  if ((err as { code?: string } | null)?.code === "P2002") return json(409, "CONFLICT", "That record already exists.");
  if ((err as { code?: string } | null)?.code === "P2025") return json(404, "NOT_FOUND", "Record not found.");
  if (err instanceof SyntaxError) return json(400, "INVALID_JSON", "Request body must be valid JSON.");
  if (err instanceof ZodError) return json(400, "INVALID_REQUEST", err.issues[0]?.message ?? "Invalid request");
  logError("[api] unhandled error:", err);
  return json(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

const json = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });
