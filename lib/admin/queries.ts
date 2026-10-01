import { db } from "@/lib/db";
import type { MessageTrace, Source } from "@/types";

const DAY = 86_400_000;

export type Overview = Awaited<ReturnType<typeof getOverview>>;

/** Dashboard numbers. Everything runs in parallel; JSON aggregates read the metadata saved on assistant messages. */
export async function getOverview(days = 30) {
  const since = new Date(Date.now() - days * DAY);
  const [users, conversations, questions, openTickets, rag, tools, topDocs, recentTickets] = await Promise.all([
    db.user.count(),
    db.conversation.count({ where: { createdAt: { gte: since } } }),
    db.message.count({ where: { role: "USER", createdAt: { gte: since } } }),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.$queryRaw<{ answers: number; withSources: number; avgTopScore: number | null; avgLatencyMs: number | null }[]>`
      SELECT count(*)::int AS "answers",
             count(*) FILTER (WHERE jsonb_array_length(COALESCE(metadata->'sources', '[]'::jsonb)) > 0)::int AS "withSources",
             avg((metadata->'trace'->>'topScore')::float8) AS "avgTopScore",
             avg((metadata->'trace'->>'latencyMs')::float8) AS "avgLatencyMs"
      FROM "Message" WHERE role = 'ASSISTANT' AND "createdAt" >= ${since}`,
    db.$queryRaw<{ tool: string; calls: number; failures: number }[]>`
      SELECT substr(p->>'type', 6) AS "tool", count(*)::int AS "calls",
             count(*) FILTER (WHERE p->>'state' = 'output-error' OR p->'output'->>'ok' = 'false')::int AS "failures"
      FROM (SELECT CASE WHEN jsonb_typeof(metadata->'parts') = 'array' THEN metadata->'parts' ELSE '[]'::jsonb END AS parts
            FROM "Message" WHERE role = 'ASSISTANT' AND "createdAt" >= ${since}) m,
           jsonb_array_elements(m.parts) p
      WHERE p->>'type' LIKE 'tool-%'
      GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ title: string; hits: number; avgScore: number }[]>`
      SELECT s->>'title' AS "title", count(*)::int AS "hits", avg((s->>'score')::float8) AS "avgScore"
      FROM (SELECT COALESCE(metadata->'sources', '[]'::jsonb) AS sources FROM "Message"
            WHERE role = 'ASSISTANT' AND "createdAt" >= ${since}) m,
           jsonb_array_elements(m.sources) s
      GROUP BY 1 ORDER BY 2 DESC LIMIT 5`,
    db.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, subject: true, status: true, createdAt: true, user: { select: { email: true } } } }),
  ]);
  const r = rag[0] ?? { answers: 0, withSources: 0, avgTopScore: null, avgLatencyMs: null };
  return {
    days, users, conversations, questions, openTickets,
    rag: { answers: r.answers, withSources: r.withSources, hitRate: r.answers ? r.withSources / r.answers : null, avgTopScore: r.avgTopScore, avgLatencyMs: r.avgLatencyMs },
    tools, totalToolCalls: tools.reduce((n, t) => n + t.calls, 0), topDocs, recentTickets,
  };
}

export async function listConversations(page: number, pageSize = 20) {
  const [total, rows] = await Promise.all([
    db.conversation.count(),
    db.conversation.findMany({
      orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, title: true, updatedAt: true, user: { select: { email: true } }, _count: { select: { messages: true, tickets: true } } }, // counts in one query, no N+1
    }),
  ]);
  return { total, rows, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export type ToolCallView = { name: string; state: string; input: unknown; output: unknown; errorText?: string };
export type Turn = {
  user?: { content: string; at: Date };
  assistant?: { content: string; at: Date; sources: Source[]; toolCalls: ToolCallView[]; trace?: MessageTrace };
};

/** Conversation → ordered turns: user message → retrieved context → tool calls → AI response. */
export async function getConversationTrace(id: string) {
  const conversation = await db.conversation.findUnique({
    where: { id },
    select: {
      id: true, title: true, createdAt: true, user: { select: { email: true, name: true } },
      tickets: { select: { id: true, subject: true, status: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 500, select: { role: true, content: true, metadata: true, createdAt: true } },
    },
  });
  if (!conversation) return null;

  const turns: Turn[] = [];
  for (const m of conversation.messages) {
    if (m.role === "USER") turns.push({ user: { content: m.content, at: m.createdAt } });
    else if (m.role === "ASSISTANT") {
      const meta = (m.metadata ?? {}) as { sources?: Source[]; trace?: MessageTrace; parts?: Record<string, any>[] };
      const toolCalls = (meta.parts ?? []).filter((p) => typeof p.type === "string" && p.type.startsWith("tool-")).map((p) => ({
        name: String(p.type).slice(5), state: String(p.state), input: p.input, output: p.output, errorText: p.errorText,
      }));
      const assistant = { content: m.content, at: m.createdAt, sources: meta.sources ?? [], toolCalls, trace: meta.trace };
      const last = turns[turns.length - 1];
      if (last && !last.assistant) last.assistant = assistant;
      else turns.push({ assistant });
    }
  }
  return { ...conversation, turns };
}

export async function listTickets(status?: string) {
  const valid = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
  const where = valid.includes(status as (typeof valid)[number]) ? { status: status as (typeof valid)[number] } : {};
  return db.supportTicket.findMany({
    where, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, subject: true, description: true, status: true, priority: true, createdAt: true, conversationId: true, user: { select: { email: true } } },
  });
}
