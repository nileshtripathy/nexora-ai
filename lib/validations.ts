import { z } from "zod";

export const chatRequestSchema = z.object({
  id: z.string().uuid("Invalid conversation id"),
  message: z.object({
    parts: z
      .array(z.object({ type: z.literal("text"), text: z.string().trim().min(1, "Message is empty").max(4000, "Message is too long (max 4000 characters)") }))
      .min(1),
  }),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const documentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  content: z.string().trim().min(20, "Content is too short").max(200_000, "Content is too long (max 200,000 characters)"),
  source: z.string().trim().max(200).optional(),
});

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const loginSchema = z.object({ email, password: z.string().min(1, "Password is required").max(200) });

export const registerSchema = z.object({
  email,
  name: z.string().trim().min(1, "Name is required").max(80),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
