import { randomUUID } from "node:crypto";
import { db, num } from "@/lib/db";
import { now } from "@/lib/clock";
import { t } from "@/lib/i18n";
import { formatRupiah } from "@/lib/money";
import { formatDate, formatDateTime, tzLabel } from "@/lib/time";
import { lineAmount, type QuoteLine, type QuoteTotals } from "@/lib/quote-math";
import { renderPdf, type DocBlock } from "@/lib/pdf";
import { storage } from "@/adapters/storage";

/** Pilot documents (FR-M12-09, FR-M13-02/07/10, FR-M15-01, FR-M8-05). Every PDF carries the PILOT watermark. */

const rp = (v: unknown) => formatRupiah(num(v));

export async function storeGenerated(bytes: Buffer, filename: string): Promise<string> {
  const id = randomUUID();
  const key = `generated_pdf/${id.slice(0, 2)}/${id}`;
  await storage().put(key, bytes, "application/pdf");
  await db()`
    insert into files (id, storage_key, filename, mime, size_bytes, purpose, scan_status, created_at)
    values (${id}, ${key}, ${filename}, 'application/pdf', ${bytes.length}, 'generated_pdf', 'clean', ${await now()})`;
  return id;
}

function quoteBlocks(lines: QuoteLine[], totals: QuoteTotals): DocBlock[] {
  return [
    {
      type: "table",
      columns: [t("docs.col.item"), t("docs.col.qty"), t("docs.col.unitPrice"), t("docs.col.discount"), t("docs.col.amount")],
      widths: [200, 50, 90, 70, 89],
      alignRight: [1, 2, 3, 4],
      rows: lines.map((l) => [l.label, String(l.quantity), formatRupiah(l.unitPrice), l.discount ? formatRupiah(l.discount) : "—", formatRupiah(lineAmount(l))]),
    },
    { type: "spacer", size: 6 },
    {
      type: "money",
      rows: [
        { label: t("quote.rentalAndAddOns"), value: formatRupiah(totals.rentalAndAddOns) },
        ...(totals.serviceCharge ? [{ label: t("quote.serviceCharge"), value: formatRupiah(totals.serviceCharge) }] : []),
        ...(totals.ppn ? [{ label: t("quote.ppn"), value: formatRupiah(totals.ppn) }] : []),
        { label: t("quote.venueTotal"), value: formatRupiah(totals.venueTotal), strong: true },
        { label: t("quote.spotinFee"), value: formatRupiah(totals.organizerFee) },
        { label: t("quote.organizerTotal"), value: formatRupiah(totals.organizerTotal), strong: true },
      ],
    },
  ];
}

async function quoteContext(quoteId: string) {
  const [q] = await db()`
    select qt.*, e.name as event_name, e.days, s.name as space_name, p.name as property_name, p.address_text, p.timezone,
           p.house_rules, p.required_docs, ov.display_name as venue_name, ov.legal_name as venue_legal, oo.display_name as organizer_name,
           oo.legal_name as organizer_legal
    from quotes qt join enquiries q on q.id = qt.enquiry_id join events e on e.id = q.event_id join spaces s on s.id = q.space_id
    join properties p on p.id = s.property_id join organizations ov on ov.id = p.operator_id join organizations oo on oo.id = e.organizer_org_id
    where qt.id = ${quoteId}`;
  return q!;
}

function dayLines(days: { date: string; start: string; end: string }[], tz: string): string {
  return days.map((d) => t("enquiry.dayLine", { date: formatDate(d.date), start: d.start, end: d.end, tz: tzLabel(tz) })).join("\n");
}

function scheduleText(s: { mode: string; depositBps: number; depositDays: number; balanceDaysBefore: number }): string {
  return s.mode === "full" ? t("quote.scheduleFull") : t("quote.scheduleSplit", { pct: s.depositBps / 100, days: s.depositDays, before: s.balanceDaysBefore });
}

function policyText(tiers: { minDays: number; refundBps: number }[]): string {
  return tiers.map((x) => t("spacePage.policyTier", { days: x.minDays, pct: x.refundBps / 100 })).join("\n");
}

export async function quotePdf(quoteId: string): Promise<Buffer> {
  const q = await quoteContext(quoteId);
  const { bytes } = await renderPdf({
    title: t("docs.quoteTitle"),
    number: t("docs.quoteNumber", { id: String(q.id).slice(0, 8).toUpperCase(), version: Number(q.version) }),
    subtitle: `${String(q.venue_name)} → ${String(q.organizer_name)}`,
    footerNote: t("docs.pilotFooter"),
    blocks: [
      { type: "kv", rows: [[t("docs.event"), String(q.event_name)], [t("docs.space"), `${String(q.space_name)}, ${String(q.property_name)}`], [t("docs.dates"), dayLines(q.days as never, String(q.timezone))], [t("docs.validUntil"), q.valid_until ? formatDateTime(q.valid_until as Date, String(q.timezone)) : "—"]] },
      { type: "heading", text: t("docs.prices") },
      ...quoteBlocks(q.lines as QuoteLine[], q.totals as QuoteTotals),
      { type: "heading", text: t("docs.terms") },
      { type: "kv", rows: [[t("docs.schedule"), scheduleText(q.payment_schedule as never)], [t("docs.cancellation"), `${t(`policies.${String(q.cancellation_policy)}.name`)}\n${policyText(q.policy_snapshot as never)}`]] },
      ...(q.inclusions ? [{ type: "kv" as const, rows: [[t("quote.inclusions"), String(q.inclusions)]] as [string, string][] }] : []),
      ...(q.exclusions ? [{ type: "kv" as const, rows: [[t("quote.exclusions"), String(q.exclusions)]] as [string, string][] }] : []),
      ...(q.special_terms ? [{ type: "kv" as const, rows: [[t("quote.specialTerms"), String(q.special_terms)]] as [string, string][] }] : []),
    ],
  });
  return bytes;
}

/** FR-M13-02, -07, -09, -10: sample agreement generated from the accepted version; acceptances on the last page. */
export async function agreementPdf(bookingId: string): Promise<{ bytes: Buffer; sha256: string }> {
  const [b] = await db()`select b.*, a.acceptances from bookings b left join agreements a on a.booking_id = b.id where b.id = ${bookingId}`;
  const q = await quoteContext(String(b!.quote_id));
  const tz = String(q.timezone);
  const reqs = await db()`select kind, amount, due_at from payment_requests where booking_id = ${bookingId} order by due_at`;
  const docs = (q.required_docs ?? []) as { name: string; mandatory: boolean; dueOffsetDays: number }[];
  const acceptances = (b!.acceptances ?? []) as { side: string; typedName: string; at: string; ip: string | null }[];
  return renderPdf({
    title: t("docs.agreementTitle"),
    number: t("docs.bookingRef", { ref: String(b!.reference) }),
    subtitle: t("docs.agreementNotBinding"),
    footerNote: t("docs.agreementFooter"),
    blocks: [
      { type: "heading", text: t("docs.parties") },
      { type: "kv", rows: [[t("docs.venueParty"), `${String(q.venue_name)}${q.venue_legal ? ` (${String(q.venue_legal)})` : ""}`], [t("docs.organizerParty"), `${String(q.organizer_name)}${q.organizer_legal ? ` (${String(q.organizer_legal)})` : ""}`]] },
      { type: "heading", text: t("docs.subject") },
      { type: "kv", rows: [[t("docs.event"), String(q.event_name)], [t("docs.space"), `${String(q.space_name)}, ${String(q.property_name)}, ${String(q.address_text)}`], [t("docs.dates"), dayLines(q.days as never, tz)], [t("docs.quoteVersion"), t("docs.quoteNumber", { id: String(q.id).slice(0, 8).toUpperCase(), version: Number(q.version) })]] },
      { type: "heading", text: t("docs.prices") },
      ...quoteBlocks(q.lines as QuoteLine[], q.totals as QuoteTotals),
      { type: "heading", text: t("docs.schedule") },
      { type: "table", columns: [t("docs.col.payment"), t("docs.col.dueAt"), t("docs.col.amount")], widths: [180, 180, 139], alignRight: [2], rows: reqs.map((r) => [t(`payments.kinds.${String(r.kind)}`), formatDateTime(r.due_at as Date, tz), rp(r.amount)]) },
      { type: "heading", text: t("docs.cancellation") },
      { type: "text", text: `${t(`policies.${String(q.cancellation_policy)}.name`)}\n${policyText(q.policy_snapshot as never)}` },
      ...(q.house_rules ? [{ type: "heading" as const, text: t("property.houseRules") }, { type: "text" as const, text: String(q.house_rules) }] : []),
      ...(docs.length ? [{ type: "heading" as const, text: t("property.requiredDocs") }, { type: "text" as const, text: docs.map((d) => `• ${d.name} — ${t("spacePage.docDue", { n: d.dueOffsetDays })}`).join("\n") }] : []),
      ...(q.special_terms ? [{ type: "heading" as const, text: t("quote.specialTerms") }, { type: "text" as const, text: String(q.special_terms) }] : []),
      { type: "heading", text: t("docs.acceptances") },
      acceptances.length
        ? { type: "table", columns: [t("docs.col.side"), t("docs.col.name"), t("docs.col.time"), t("docs.col.ip")], widths: [100, 160, 160, 79], rows: acceptances.map((a) => [t(`docs.sides.${a.side}`), a.typedName, formatDateTime(new Date(a.at), tz), a.ip ?? "—"]) }
        : { type: "text", text: t("docs.noAcceptancesYet"), muted: true },
    ],
  });
}

/** FR-M15-01: pilot receipt with the venue lines (and PPN) and a separate Spot-In fee line. */
export async function receiptPdf(receiptId: string): Promise<Buffer> {
  const [r] = await db()`
    select r.*, b.reference, o.display_name as issuer from receipts r join bookings b on b.id = r.booking_id join organizations o on o.id = r.issuer_org_id
    where r.id = ${receiptId}`;
  const lines = r!.lines as { label: string; amount: number }[];
  const { bytes } = await renderPdf({
    title: r!.kind === "credit_note" ? t("docs.creditNoteTitle") : t("docs.receiptTitle"),
    number: String(r!.number),
    subtitle: `${String(r!.issuer)} · ${t("docs.bookingRef", { ref: String(r!.reference) })}`,
    footerNote: t("docs.receiptFooter"),
    blocks: [
      { type: "kv", rows: [[t("docs.issuedAt"), formatDateTime(r!.created_at as Date, "Asia/Jakarta")]] },
      { type: "money", rows: [...lines.map((l) => ({ label: l.label, value: formatRupiah(l.amount) })), { label: t("docs.total"), value: rp(r!.amount), strong: true }] },
    ],
  });
  return bytes;
}

/** FR-M8-05: comparison of the latest quotes in one event, exported as a watermarked PDF. */
export async function comparisonPdf(event: { name: string }, rows: { space: string; total: string; perDay: string; inclusions: string; deposit: string; deadlines: string; cancellation: string; response: string }[]): Promise<Buffer> {
  const { bytes } = await renderPdf({
    title: t("docs.compareTitle"),
    subtitle: String(event.name),
    footerNote: t("docs.pilotFooter"),
    blocks: [
      {
        type: "table",
        columns: [t("compare.space"), t("compare.total"), t("compare.perDay"), t("compare.deposit"), t("compare.cancellation"), t("compare.response")],
        widths: [100, 85, 80, 80, 90, 64],
        rows: rows.map((r) => [r.space, r.total, r.perDay, `${r.deposit}\n${r.deadlines}`, r.cancellation, r.response]),
      },
      { type: "heading", text: t("compare.inclusions") },
      ...rows.map((r) => ({ type: "kv" as const, rows: [[r.space, r.inclusions || "—"]] as [string, string][] })),
    ],
  });
  return bytes;
}
