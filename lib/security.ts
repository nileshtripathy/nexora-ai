/** Heuristic only — a cheap first line of defence. The real protections are server-side authorization and never putting secrets in the prompt. */
const INJECTION_PATTERNS = [
  /ignore (all |any |the )?(previous|prior|above|earlier) (instructions|rules|prompts?)/i,
  /(reveal|show|print|repeat|leak|output).{0,40}(system prompt|instructions|api[ -]?key|secret|password|env)/i,
  /(you are now|act as|pretend to be).{0,40}(admin|developer|dan|unrestricted)/i,
  /(developer|debug|god) mode|jailbreak/i,
];
export const looksLikeInjection = (text: string) => INJECTION_PATTERNS.some((r) => r.test(text));

/** Strip control characters and anything that could close our prompt delimiters. */
export const neutralize = (text: string) =>
  text.replace(/<\/?\s*(knowledge_base|system|tool|instructions?)\b[^>]*>/gi, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

/** Defence in depth: scrub anything that looks like a credential or one of our own env secrets. */
export function redactSecrets(text: string): string {
  let out = text.replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[redacted]").replace(/postgres(ql)?:\/\/\S+/gi, "[redacted]");
  for (const name of ["AUTH_SECRET", "OPENAI_API_KEY", "DATABASE_URL"]) {
    const v = process.env[name];
    if (v && v.length >= 8) out = out.split(v).join("[redacted]");
  }
  return out;
}
