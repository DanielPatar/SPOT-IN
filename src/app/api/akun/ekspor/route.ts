import { exportUserData } from "@/server/accounts";
import { getSession } from "@/web/session";

/** FR-M38-05: every user can download their data as JSON. */
export async function GET() {
  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const data = await exportUserData(s.userId);
  return new Response(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="spot-in-data.json"' },
  });
}
