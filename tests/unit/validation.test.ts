import { describe, expect, it } from "vitest";
import { createSupportTicketInput } from "@/lib/tools/create-support-ticket";
import { getOrderStatusInput } from "@/lib/tools/get-order-status";
import { chatRequestSchema, documentSchema, loginSchema, registerSchema } from "@/lib/validations";

const uuid = "7f0c1c1e-5b1a-4c0e-9a55-0d6b1f3c2a11";

describe("tool schemas", () => {
  it("normalises order ids", () => expect(getOrderStatusInput.parse({ orderId: " sa-1001 " }).orderId).toBe("SA-1001"));
  it.each(["", "ab", "SA-1001'; DROP TABLE", "SA 1001", "x".repeat(40)])("rejects bad order id %j", (orderId) => expect(getOrderStatusInput.safeParse({ orderId }).success).toBe(false));
  it("is strict: the model cannot smuggle identity fields", () => {
    expect(getOrderStatusInput.safeParse({ orderId: "SA-1001", userId: "other" }).success).toBe(false);
    expect(createSupportTicketInput.safeParse({ subject: "Broken item", description: "x".repeat(30), userId: "other", status: "CLOSED" }).success).toBe(false);
  });
  it("enforces ticket length limits", () => {
    expect(createSupportTicketInput.safeParse({ subject: "hi", description: "x".repeat(30) }).success).toBe(false);
    expect(createSupportTicketInput.safeParse({ subject: "Broken item", description: "short" }).success).toBe(false);
    expect(createSupportTicketInput.safeParse({ subject: "Broken item", description: "x".repeat(2001) }).success).toBe(false);
    expect(createSupportTicketInput.safeParse({ subject: "Broken item", description: "The headphones stopped working" }).success).toBe(true);
  });
});

describe("request schemas", () => {
  const msg = (text: string) => ({ id: uuid, message: { parts: [{ type: "text", text }] } });
  it("accepts a normal chat request", () => expect(chatRequestSchema.safeParse(msg("hello")).success).toBe(true));
  it("rejects bad conversation id, empty and oversized messages", () => {
    expect(chatRequestSchema.safeParse({ ...msg("hi"), id: "nope" }).success).toBe(false);
    expect(chatRequestSchema.safeParse(msg("   ")).success).toBe(false);
    expect(chatRequestSchema.safeParse(msg("a".repeat(4001))).success).toBe(false);
  });
  it("rejects non-text parts", () => expect(chatRequestSchema.safeParse({ id: uuid, message: { parts: [{ type: "file", url: "x" }] } }).success).toBe(false));
  it("lower-cases and validates emails; enforces password length", () => {
    expect(loginSchema.parse({ email: "  Alice@Example.COM ", password: "x" }).email).toBe("alice@example.com");
    expect(registerSchema.safeParse({ email: "a@b.dev", name: "A", password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "not-an-email", name: "A", password: "longenough1" }).success).toBe(false);
  });
  it("validates knowledge-base documents", () => {
    expect(documentSchema.safeParse({ title: "T", content: "tiny" }).success).toBe(false);
    expect(documentSchema.safeParse({ title: "T", content: "x".repeat(50) }).success).toBe(true);
  });
});
