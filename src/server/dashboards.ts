import { db, num } from "@/lib/db";
import { now } from "@/lib/clock";
import { t } from "@/lib/i18n";
import { businessHoursBetween } from "@/lib/business-days";
import { loadHolidays } from "@/lib/holidays";
import { requirePermission } from "./access";
import type { Actor } from "./accounts";

/** Dashboards (M22). Every figure is derived from the same rows a raw export would show. */

export const PIPELINE_COLUMNS = ["new", "discussion", "quoted", "pending_approval", "accepted", "confirmed", "lost"] as const;
export type PipelineColumn = (typeof PIPELINE_COLUMNS)[number];

function column(e: { status: string; quote_status: string | null; booking_status: string | null }): PipelineColumn {
  if (e.booking_status) {
    if (e.booking_status === "pending_agreement_and_deposit") return "accepted";
    if (["lapsed", "cancelled_by_organizer", "cancelled_by_venue"].includes(e.booking_status)) return "lost";
    return "confirmed";
  }
  if (["declined", "expired", "withdrawn", "lost"].includes(e.status)) return "lost";
  if (e.quote_status === "pending_approval") return "pending_approval";
  if (e.status === "quoted" || e.quote_status === "sent") return "quoted";
  if (["info_requested", "responded"].includes(e.status)) return "discussion";
  return "new";
}

/** FR-M22-01: venue pipeline with overdue-reply badges. */
export async function venuePipeline(actor: Actor) {
  const m = await requirePermission(actor.userId, "venue_operator", "enquiry.view");
  const at = await now();
  const rows = await db()`
    select q.id, q.status, q.created_at, q.response_deadline_at, q.first_response_at, e.name as event_name, s.name as space_name, o.display_name as organizer_name,
      (select qt.status from quotes qt where qt.enquiry_id = q.id order by qt.version desc limit 1) as quote_status,
      (select b.status from bookings b where b.enquiry_id = q.id order by b.created_at desc limit 1) as booking_status,
      (select b.id from bookings b where b.enquiry_id = q.id order by b.created_at desc limit 1) as booking_id
    from enquiries q join spaces s on s.id = q.space_id join properties p on p.id = s.property_id join events e on e.id = q.event_id
    join organizations o on o.id = e.organizer_org_id
    where p.operator_id = ${m.orgId} order by q.created_at desc`;
  return rows.map((r) => ({
    id: String(r.id),
    eventName: String(r.event_name),
    spaceName: String(r.space_name),
    organizerName: String(r.organizer_name),
    status: String(r.status),
    bookingId: r.booking_id ? String(r.booking_id) : null,
    column: column({ status: String(r.status), quote_status: (r.quote_status as string) ?? null, booking_status: (r.booking_status as string) ?? null }),
    overdue: !r.first_response_at && ["submitted", "viewed"].includes(String(r.status)) && new Date(r.response_deadline_at as Date) < at,
    deadline: r.response_deadline_at as Date,
  }));
}

/** FR-M22-02: venue "This week". */
export async function venueThisWeek(actor: Actor) {
  const m = await requirePermission(actor.userId, "venue_operator", "enquiry.view");
  const at = await now();
  const weekEnd = new Date(at.getTime() + 7 * 86_400_000);
  const events = await db()`
    select b.id, b.reference, b.event_start_at, b.status, e.name as event_name, s.name as space_name, p.timezone
    from bookings b join events e on e.id = b.event_id join spaces s on s.id = b.space_id join properties p on p.id = s.property_id
    where b.operator_id = ${m.orgId} and b.event_start_at between ${at} and ${weekEnd}
      and b.status in ('confirmed', 'balance_due', 'fully_paid', 'in_progress') order by b.event_start_at`;
  const docs = await db()`
    select d.id, d.name, d.booking_id, b.reference, e.name as event_name
    from booking_documents d join bookings b on b.id = d.booking_id join events e on e.id = b.event_id
    where b.operator_id = ${m.orgId} and d.status = 'submitted' order by d.updated_at`;
  const balances = await db()`
    select r.booking_id, r.amount, r.due_at, b.reference, e.name as event_name, p.timezone
    from payment_requests r join bookings b on b.id = r.booking_id join events e on e.id = b.event_id join spaces s on s.id = b.space_id join properties p on p.id = s.property_id
    where b.operator_id = ${m.orgId} and r.kind = 'balance' and r.status = 'open' and r.due_at <= ${weekEnd} order by r.due_at`;
  return { events, docs, balances };
}

/** FR-M22-03: counts for a period (dates in YYYY-MM-DD, inclusive), with the raw rows for CSV. */
export async function venueCounts(actor: Actor, from: string, to: string) {
  const m = await requirePermission(actor.userId, "venue_operator", "enquiry.view");
  const start = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86_400_000);
  const enquiries = await db()`
    select q.id, q.created_at, q.first_response_at, q.status, p.timezone, e.name as event_name, s.name as space_name
    from enquiries q join spaces s on s.id = q.space_id join properties p on p.id = s.property_id join events e on e.id = q.event_id
    where p.operator_id = ${m.orgId} and q.created_at >= ${start} and q.created_at < ${end} order by q.created_at`;
  const [quotes] = await db()`
    select count(*)::int as n from quotes qt join enquiries q on q.id = qt.enquiry_id join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    where p.operator_id = ${m.orgId} and qt.sent_at >= ${start} and qt.sent_at < ${end}`;
  const bookings = await db()`
    select b.id, b.reference, b.confirmed_at, (qt.totals ->> 'venueTotal')::bigint as venue_total
    from bookings b join quotes qt on qt.id = b.quote_id
    where b.operator_id = ${m.orgId} and b.confirmed_at >= ${start} and b.confirmed_at < ${end}`;
  const holidays = await loadHolidays();
  const hours = enquiries
    .filter((e) => e.first_response_at)
    .map((e) => businessHoursBetween(new Date(e.created_at as Date), new Date(e.first_response_at as Date), String(e.timezone), holidays))
    .sort((a, b) => a - b);
  const median = hours.length ? (hours.length % 2 ? hours[(hours.length - 1) / 2]! : (hours[hours.length / 2 - 1]! + hours[hours.length / 2]!) / 2) : null;
  const revenue = bookings.reduce((s, b) => s + num(b.venue_total), 0);
  return {
    enquiries: enquiries.length,
    quotes: Number(quotes!.n),
    bookings: bookings.length,
    conversionPct: enquiries.length ? Math.round((bookings.length / enquiries.length) * 1000) / 10 : 0,
    medianResponseHours: median === null ? null : Math.round(median * 10) / 10,
    revenue,
    rows: enquiries,
    bookingRows: bookings,
  };
}

export async function venueCountsCsv(actor: Actor, from: string, to: string): Promise<string> {
  const c = await venueCounts(actor, from, to);
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = ["enquiry", "created", "event", "space", "status", "firstResponse"].map((k) => t(`counts.csv.${k}`));
  const lines = c.rows.map((r) =>
    [String(r.id), (r.created_at as Date).toISOString(), String(r.event_name), String(r.space_name), t(`enquiryStatus.${String(r.status)}`), r.first_response_at ? (r.first_response_at as Date).toISOString() : ""].map(esc).join(","),
  );
  return [head.join(","), ...lines].join("\n") + "\n";
}

/** FR-M22-06: organizer events with next action and registrations vs capacity. */
export async function organizerEvents(actor: Actor) {
  const m = await requirePermission(actor.userId, "organizer", "enquiry.view");
  const rows = await db()`
    select e.id, e.name, e.days, e.created_at,
      (select count(*)::int from enquiries q where q.event_id = e.id) as enquiries,
      (select count(*)::int from enquiries q join quotes qt on qt.enquiry_id = q.id where q.event_id = e.id and qt.status = 'sent') as open_quotes,
      (select b.status from bookings b where b.event_id = e.id order by b.created_at desc limit 1) as booking_status,
      (select b.id from bookings b where b.event_id = e.id order by b.created_at desc limit 1) as booking_id,
      ep.id as page_id, ep.status as page_status,
      (select coalesce(sum(taken), 0)::int from event_sessions s where s.page_id = ep.id) as registered,
      (select coalesce(sum(capacity), 0)::int from event_sessions s where s.page_id = ep.id) as capacity
    from events e left join event_pages ep on ep.event_id = e.id
    where e.organizer_org_id = ${m.orgId} order by e.created_at desc`;
  return rows.map((r) => ({ ...r, nextAction: nextAction(r) }));
}

function nextAction(r: Record<string, unknown>): string {
  const bs = r.booking_status as string | null;
  if (bs === "pending_agreement_and_deposit") return "agreementAndDeposit";
  if (bs === "balance_due") return "payBalance";
  if (bs && ["confirmed", "fully_paid"].includes(bs) && !r.page_id) return "createPage";
  if (bs && ["confirmed", "balance_due", "fully_paid"].includes(bs) && r.page_status === "draft") return "publishPage";
  if (bs === "post_event_window") return "postEvent";
  if (bs && ["confirmed", "fully_paid", "in_progress", "settled"].includes(bs)) return "none";
  if (Number(r.open_quotes) > 0) return "reviewQuotes";
  if (Number(r.enquiries) === 0) return "sendEnquiries";
  return "waitForQuotes";
}
