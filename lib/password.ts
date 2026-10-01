import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await scryptAsync(password, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [salt, hash] = (stored ?? DUMMY_HASH).split(":");
  const actual = await scryptAsync(password, Buffer.from(salt, "hex"), 64); // always hash, so timing doesn't reveal unknown emails
  return timingSafeEqual(actual, Buffer.from(hash, "hex")) && !!stored;
}

const DUMMY_HASH = `${"00".repeat(16)}:${"00".repeat(64)}`;
