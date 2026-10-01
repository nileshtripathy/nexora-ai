import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** "New chat": every visit gets a fresh conversation id. The conversation row is created when the first message is sent. */
export default function NewChatPage() {
  redirect(`/chat/${randomUUID()}`);
}
