/**
 * Gives every listing without real photos an illustrative stock photo (UI v2), chosen by space type.
 * "Without real photos" = no photo at all, or only tiny placeholder files (< 6 KB, like the demo seed).
 * Listings whose venue uploaded real photos are never touched. Needs only DATABASE_URL.
 *
 *   npm run demo:photos            # set illustrative photos
 *   npm run demo:photos -- --clear # remove them again
 */
import postgres from "postgres";

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1400&q=70&auto=format&fit=crop`;
const STOCK: Record<string, string[]> = {
  atrium: [u("1567958451986-2de427a4a0be"), u("1441986300917-64674bd600d8")],
  event_hall: [
    u("1519167758481-83f550bb49b3"),
    u("1523580494863-6f3031224c94"),
    u("1511578314322-379afb476865"),
    u("1464366400600-7168b8af9bc3"),
  ],
  function_room: [u("1497366216548-37526070297c"), u("1600508774634-4e11d34730e2")],
  booth: [u("1441986300917-64674bd600d8"), u("1567958451986-2de427a4a0be")],
  popup_unit: [u("1441986300917-64674bd600d8"), u("1555396273-367ea4eb4db5")],
  outdoor_area: [u("1472653431158-6364773b2a56")],
  other: [u("1531058020387-3be344556be6"), u("1555396273-367ea4eb4db5")],
};

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL first (see docs/ops/database.md).");
const sql = postgres(url, {
  max: 1,
  onnotice: () => {},
  prepare: process.env.DB_PREPARE !== "false",
});
try {
  if (process.argv.includes("--clear")) {
    const r = await sql`update spaces set demo_photo_url = null where demo_photo_url is not null`;
    console.log(`Cleared ${r.count} illustrative photos.`);
  } else {
    const rows = await sql`
      select s.id, s.name, s.type from spaces s
      where not exists (
        select 1 from jsonb_array_elements(coalesce(s.media, '[]'::jsonb)) m
        join files f on f.id = (m->>'fileId')::uuid where f.size_bytes >= 6000)
      order by s.created_at`;
    const used: Record<string, number> = {};
    for (const r of rows) {
      const list = STOCK[String(r.type)] ?? STOCK.other!;
      const i = (used[String(r.type)] = (used[String(r.type)] ?? -1) + 1);
      await sql`update spaces set demo_photo_url = ${list[i % list.length]!} where id = ${r.id as string}`;
      console.log(`· ${String(r.name)} (${String(r.type)})`);
    }
    console.log(`Set illustrative photos on ${rows.length} listings.`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
