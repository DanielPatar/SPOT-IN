import postgres from "postgres";
import { config } from "./config";

type Sql = postgres.Sql<Record<string, unknown>>;
export type Tx = postgres.TransactionSql<Record<string, unknown>> | Sql;

const g = globalThis as unknown as { __spotinSql?: Sql };

/** Shared connection pool. All timestamps go over the wire as timestamptz. */
export function db(): Sql {
  if (!g.__spotinSql) {
    g.__spotinSql = postgres(config().DATABASE_URL, {
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idle_timeout: 20,
      onnotice: () => {},
      types: {
        bigint: postgres.BigInt,
      },
      transform: { undefined: null },
    }) as unknown as Sql;
  }
  return g.__spotinSql;
}

export async function closeDb(): Promise<void> {
  if (g.__spotinSql) {
    await g.__spotinSql.end({ timeout: 5 });
    g.__spotinSql = undefined;
  }
}

/** bigint columns come back as JS bigint; money helpers want number (safe below 2^53). */
export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "bigint" ? Number(v) : Number(v);
}
