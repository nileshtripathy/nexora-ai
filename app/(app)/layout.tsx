import { db } from "@/lib/db";
import { isStaff, requireUserPage } from "@/lib/auth";
import { AppShell } from "@/components/chat/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  const conversations = await db.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true },
  });
  return <AppShell user={{ name: user.name, email: user.email }} isStaff={isStaff(user.role)} conversations={conversations}>{children}</AppShell>;
}
