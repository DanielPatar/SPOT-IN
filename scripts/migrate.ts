/**
 * Applies db/migrations/*.sql in order, once each. `--reset` drops everything first
 * (refused in the pilot environment).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

export async function migrate(databaseUrl: string, opts: { reset?: boolean; quiet?: boolean } = {}): Promise<void> {
  const sql = postgres(databaseUrl, { onnotice: () => {}, max: 1 });
  try {
    if (opts.reset) {
      if (process.env.APP_ENV === "pilot") throw new Error("Refusing to reset the pilot database.");
      await sql.unsafe("drop schema public cascade; create schema public;");
    }
    await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const dir = path.resolve(process.cwd(), "db/migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name as string));
    for (const f of files) {
      if (done.has(f)) continue;
      const body = await readFile(path.join(dir, f), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`insert into schema_migrations (name) values (${f})`;
      });
      if (!opts.quiet) console.log(`applied ${f}`);
    }
  } finally {
    await sql.end();
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  migrate(url, { reset: process.argv.includes("--reset") }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
