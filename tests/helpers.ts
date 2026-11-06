import { db } from "@/lib/db";
import { setClockOffsetMs, invalidateClockCache } from "@/lib/clock";

/** Truncates all data tables except reference data (holidays, synonyms). */
export async function resetData(): Promise<void> {
  await db().unsafe(`
    do $$ declare t text; begin
      for t in select tablename from pg_tables where schemaname = 'public'
        and tablename not in ('holiday_calendar', 'search_synonyms', 'schema_migrations', 'spatial_ref_sys')
      loop execute format('alter table %I disable trigger user', t); execute format('truncate %I restart identity cascade', t);
        execute format('alter table %I enable trigger user', t); end loop;
    end $$;`);
  invalidateClockCache();
}

/** Pins the app clock at a given instant by setting the demo offset relative to real time. */
export async function setNow(at: Date): Promise<void> {
  const offset = at.getTime() - Date.now();
  await db()`
    insert into settings (key, value, changed_at) values ('demo_clock_offset_ms', ${JSON.stringify(offset)}::jsonb, now())
    on conflict (key) do update set value = excluded.value`;
  invalidateClockCache();
  void setClockOffsetMs;
}
