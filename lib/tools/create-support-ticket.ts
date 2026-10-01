import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { neutralize } from "@/lib/security";
import { fail, safe, type ToolContext } from "@/lib/tools/types";

export const createSupportTicketInput = z
  .object({
    subject: z.string().trim().min(5, "Subject is too short").max(120),
    description: z.string().trim().min(20, "Describe the problem in at least a sentence").max(2000),
  })
  .strict();

const MAX_TICKETS_PER_HOUR = 5;
export const ticketNumber = (id: string) => `T-${id.slice(0, 8).toUpperCase()}`;

export const createCreateSupportTicketTool = (ctx: ToolContext) =>
  tool({
    description:
      "Create a support ticket so a human agent follows up. Use ONLY when the customer asks for a human/ticket, or you cannot resolve the issue " +
      "and the customer agrees to escalate. Write a clear subject and a self-contained description of the problem (include order numbers the customer mentioned). " +
      "Tell the customer the ticket number afterwards.",
    inputSchema: createSupportTicketInput,
    execute: ({ subject, description }) =>
      safe("createSupportTicket", () =>
        db.$transaction(async (tx) => {
          // Serialize per user: two parallel identical tool calls must not both pass the duplicate check.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ctx.userId}))`;
          const recent = await tx.supportTicket.count({ where: { userId: ctx.userId, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
          if (recent >= MAX_TICKETS_PER_HOUR)
            return fail("RATE_LIMITED", "You've opened several tickets recently. Please wait for a reply to those before opening another.");

          const cleanSubject = neutralize(subject);
          // Idempotency: if the model retries, return the ticket we already made instead of duplicating it.
          const existing = await tx.supportTicket.findFirst({
            where: { userId: ctx.userId, conversationId: ctx.conversationId, subject: cleanSubject, status: { in: ["OPEN", "IN_PROGRESS"] } },
          });
          const ticket = existing ?? (await tx.supportTicket.create({
            data: { userId: ctx.userId, conversationId: ctx.conversationId, subject: cleanSubject, description: neutralize(description) },
          }));
          return { ok: true as const, ticketNumber: ticketNumber(ticket.id), status: ticket.status, priority: ticket.priority, subject: ticket.subject, duplicate: !!existing };
        }),
      ),
  });
