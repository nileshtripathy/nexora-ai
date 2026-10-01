import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, handleError } from "@/lib/errors";

const body = async (r: Response) => ({ status: r.status, ...(await r.json()) });

describe("handleError", () => {
  it("maps AppError, Zod, JSON and Prisma errors to consistent shapes", async () => {
    expect(await body(handleError(new AppError(403, "FORBIDDEN", "nope")))).toEqual({ status: 403, error: { code: "FORBIDDEN", message: "nope" } });
    const zerr = z.object({ a: z.string() }).safeParse({}).error!;
    expect((await body(handleError(zerr))).status).toBe(400);
    expect((await body(handleError(new SyntaxError("bad json")))).error.code).toBe("INVALID_JSON");
    expect((await body(handleError(Object.assign(new Error("x"), { code: "P2002" })))).status).toBe(409);
    expect((await body(handleError(Object.assign(new Error("x"), { code: "P2025" })))).status).toBe(404);
  });
  it("never leaks internal error details for unexpected failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await body(handleError(new Error("connect ECONNREFUSED postgresql://user:pw@db/x")));
    expect(out.status).toBe(500);
    expect(JSON.stringify(out)).not.toMatch(/postgres|ECONNREFUSED|pw/);
  });
});
