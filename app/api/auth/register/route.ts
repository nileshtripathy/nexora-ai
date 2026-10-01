import { db } from "@/lib/db";
import { AppError, handleError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    rateLimit(`register:${clientIp(req)}`, 10);
    const { email, name, password } = registerSchema.parse(await req.json());
    if (await db.user.findUnique({ where: { email }, select: { id: true } }))
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists.");
    // role is never taken from the client: new accounts are always USER
    const user = await db.user.create({
      data: { email, name, passwordHash: await hashPassword(password) },
      select: { id: true, email: true, name: true, tokenVersion: true },
    });
    await setSessionCookie(user.id, user.tokenVersion);
    return Response.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
