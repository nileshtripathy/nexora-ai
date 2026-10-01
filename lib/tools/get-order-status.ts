import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, safe, type ToolContext } from "@/lib/tools/types";

export const getOrderStatusInput = z
  .object({
    orderId: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .regex(/^[A-Za-z0-9-]+$/, "Order numbers look like SA-1001")
      .transform((s) => s.toUpperCase()),
  })
  .strict();

type OrderItem = { name: string; quantity: number };

export const createGetOrderStatusTool = (ctx: ToolContext) =>
  tool({
    description:
      "Look up the status, tracking and delivery estimate of ONE of the signed-in customer's orders. " +
      "Use when the customer gives an order number (like SA-1001) and asks where it is, its status, or tracking. " +
      "Only use an order number the customer typed; if they haven't given one, ask for it.",
    inputSchema: getOrderStatusInput,
    execute: ({ orderId }) =>
      safe("getOrderStatus", async () => {
        // Authorization: the lookup is always scoped to the session user. Someone else's order is
        // indistinguishable from a nonexistent one.
        const order = await db.order.findFirst({
          where: { orderNumber: orderId, userId: ctx.userId },
          select: { orderNumber: true, status: true, items: true, totalCents: true, currency: true, carrier: true, trackingNumber: true, estimatedDelivery: true, shippedAt: true, deliveredAt: true, createdAt: true },
        });
        if (!order) return fail("ORDER_NOT_FOUND", `No order ${orderId} was found on your account.`);
        return {
          ok: true as const,
          orderNumber: order.orderNumber,
          status: order.status,
          placedAt: order.createdAt.toISOString(),
          items: (order.items as OrderItem[]).slice(0, 20).map((i) => ({ name: String(i.name).slice(0, 80), quantity: i.quantity })),
          total: new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency }).format(order.totalCents / 100),
          carrier: order.carrier,
          trackingNumber: order.trackingNumber,
          estimatedDelivery: order.estimatedDelivery?.toISOString() ?? null,
          shippedAt: order.shippedAt?.toISOString() ?? null,
          deliveredAt: order.deliveredAt?.toISOString() ?? null,
        };
      }),
  });
