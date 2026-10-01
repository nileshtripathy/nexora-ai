import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { clearSessionCookie } from "@/lib/session";

/** `{ "everywhere": true }` also revokes every other session by bumping the user's tokenVersion. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.everywhere === true) {
      const user = await getCurrentUser();
      await db.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
    }
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
