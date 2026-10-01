import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { loadRecentMessages, toChatMessage } from "@/lib/chat-history";
import { Chat } from "@/components/chat/chat";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const user = await requireUserPage();
  const conversation = await db.conversation.findUnique({ where: { id }, select: { userId: true } });
  if (conversation && conversation.userId !== user.id) notFound(); // someone else's conversation: indistinguishable from missing

  // An id with no conversation yet is a brand-new chat (created on the first message).
  const messages = conversation ? await loadRecentMessages(id, 200) : [];
  return <Chat key={id} id={id} initialMessages={messages.map(toChatMessage)} />;
}
