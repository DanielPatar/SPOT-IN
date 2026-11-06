import { db } from "./db";
import { now } from "./clock";
import { AppError } from "./permissions";

/**
 * Fixed-window rate limiter stored in PostgreSQL (NFR security: login, sign-up,
 * enquiry, registration). Returns true when the call is allowed.
 */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const t = (await now()).getTime();
  const windowStart = new Date(Math.floor(t / (windowSeconds * 1000)) * windowSeconds * 1000);
  const rows = await db()`
    insert into rate_limits (key, window_start, count) values (${key}, ${windowStart}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count`;
  return Number(rows[0]!.count) <= limit;
}

export async function enforce(key: string, limit: number, windowSeconds: number): Promise<void> {
  if (!(await hit(key, limit, windowSeconds))) throw new AppError("errors.rateLimited");
}
