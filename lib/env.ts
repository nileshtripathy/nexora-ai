import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().optional(),
  /** "mock" runs fully offline (deterministic embeddings + canned LLM) for local dev and tests. */
  AI_PROVIDER: z.enum(["openai", "mock"]).default("openai"),
  CHAT_MODEL: z.string().default("gpt-4o-mini"),
  /** Minimum cosine similarity for a chunk to count as relevant. Tune per embedding model. */
  /** Allow AI_PROVIDER=mock under NODE_ENV=production (E2E only). */
  ALLOW_MOCK_PROVIDER: z.string().optional(),
  RAG_MIN_SIMILARITY: z.coerce.number().min(0).max(1).default(0.3),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  /** Signs session cookies. Generate with: openssl rand -base64 32 */
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
});

let cached: z.infer<typeof schema> | undefined;

/** Validated server env. Parsed lazily so `next build` doesn't need secrets. */
export function env() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment: ${issues}`);
    }
    const c = parsed.data;
    if (process.env.NODE_ENV === "production") {
      // Fail fast on misconfiguration instead of serving a broken or fake assistant.
      if (c.AI_PROVIDER === "mock" && c.ALLOW_MOCK_PROVIDER !== "1")
        throw new Error("Invalid environment: AI_PROVIDER=mock is not allowed in production");
      if (c.AI_PROVIDER === "openai" && !c.OPENAI_API_KEY) throw new Error("Invalid environment: OPENAI_API_KEY is required in production");
    }
    cached = c;
  }
  return cached;
}
