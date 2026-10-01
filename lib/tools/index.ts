import { createCreateSupportTicketTool } from "@/lib/tools/create-support-ticket";
import { createGetCustomerAccountTool } from "@/lib/tools/get-customer-account";
import { createGetOrderStatusTool } from "@/lib/tools/get-order-status";
import type { ToolContext } from "@/lib/tools/types";

/**
 * Tool registry. To add a tool: create lib/tools/<name>.ts exporting a `create…Tool(ctx)` factory,
 * register it here, mention it in lib/rag/prompt.ts, and (optionally) add a label in components/chat/tool-card.tsx.
 */
export function createTools(ctx: ToolContext) {
  return {
    getOrderStatus: createGetOrderStatusTool(ctx),
    getCustomerAccount: createGetCustomerAccountTool(ctx),
    createSupportTicket: createCreateSupportTicketTool(ctx),
  };
}
