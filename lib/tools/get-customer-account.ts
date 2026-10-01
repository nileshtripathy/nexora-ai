import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, safe, type ToolContext } from "@/lib/tools/types";

export const createGetCustomerAccountTool = (ctx: ToolContext) =>
  tool({
    description:
      "Get the signed-in customer's own account summary: name, email, member-since date, recent orders and open ticket count. " +
      "Use when they ask about their account, profile, or want to see their orders. Takes no arguments.",
    inputSchema: z.object({}).strict(),
    execute: () =>
      safe("getCustomerAccount", async () => {
        const user = await db.user.findUnique({
          where: { id: ctx.userId },
          select: { name: true, email: true, createdAt: true }, // explicit select: never touches passwordHash
        });
        if (!user) return fail("ACCOUNT_NOT_FOUND", "Your account could not be found.");
        const [orders, openTickets] = await Promise.all([
          db.order.findMany({ where: { userId: ctx.userId }, orderBy: { createdAt: "desc" }, take: 5, select: { orderNumber: true, status: true, createdAt: true } }),
          db.supportTicket.count({ where: { userId: ctx.userId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        ]);
        return {
          ok: true as const,
          name: user.name,
          email: user.email,
          memberSince: user.createdAt.toISOString(),
          recentOrders: orders.map((o) => ({ orderNumber: o.orderNumber, status: o.status, placedAt: o.createdAt.toISOString() })),
          openTickets,
        };
      }),
  });
