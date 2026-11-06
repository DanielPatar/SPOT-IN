import Link from "next/link";
import { notFound } from "next/navigation";
import { t, hasMessage } from "@/lib/i18n";
import { db, num } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { formatRupiah } from "@/lib/money";
import { PermissionError, can } from "@/lib/permissions";
import { requireSession } from "@/web/session";
import { bookingWorkspace } from "@/server/bookings";
import { Form, Submit } from "@/components/Form";
import { BookingProgress, DocPreview, Facts, MoneyRow, Notice, PageTitle, Panel, PilotEventLabel, Status } from "@/components/kit";
import { BookingStatus, bookingStep } from "@/components/BookingStatus";
import { agreementAction, extendBalanceAction, markLostAction } from "@/web/actions/booking";
import { checklist, problemsFor, organizerCancellationFigures } from "@/server/lifecycle";
import { localDate } from "@/lib/time";
import { now } from "@/lib/clock";
import { AfterEventPanel, AtRiskPanel, CancelPanel, ChecklistPanel, StatementLinks } from "@/components/AfterPanels";

/** Booking workspace (FR-M13, FR-M14, FR-M15-01, FR-M1-05, FR-M9-10). */
export default async function BookingWorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ accepted?: string; done?: string }> }) {
  const { id } = await params;
  const { accepted, done } = await searchParams;
  const s = await requireSession(`/pemesanan/${id}`);
  let w;
  try {
    w = await bookingWorkspace({ userId: s.userId }, id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const { booking: b, side, membership, ctx, quote, agreement, requests, payments, receipts, contacts, timeline } = w;
  const tz = String(ctx.timezone);
  const status = String(b.status);
  const acc = (agreement?.acceptances ?? []) as { side: string; typedName: string; at: string }[];
  const agreementDone = agreement?.status === "accepted_by_both";
  const myTurn = agreement && ((side === "organizer" && agreement.status === "generated") || (side === "venue" && agreement.status === "accepted_by_organizer"));
  const canSign = side === "organizer" ? can("organizer", membership.role, "quote.accept") : can("venue_operator", membership.role, "quote.send");
  const [u] = await db()`select name from users where id = ${s.userId}`;
  const otherOpen = side === "organizer" && accepted
    ? await db()`select q.id, s.name as space_name from enquiries q join spaces s on s.id = q.space_id
        where q.event_id = ${b.event_id as string} and q.id <> ${b.enquiry_id as string} and q.status in ('submitted', 'viewed', 'info_requested', 'responded', 'quoted')`
    : [];
  const balanceReq = requests.find((r) => r.kind === "balance");
  const a = { userId: s.userId };
  const docs = await checklist(a, id);
  const problems = await problemsFor(id);
  const live = ["confirmed", "balance_due", "fully_paid"].includes(status);
  const role = String(membership.role);
  const canCancel = role === "owner" && (live || (side === "venue" && status === "pending_agreement_and_deposit"));
  const figures = side === "organizer" && canCancel && live ? await organizerCancellationFigures(id) : null;
  const today = localDate(await now(), tz);
  const eventDay = (b.days as { date: string }[]).some((d) => d.date === today) && ["in_progress", ...["confirmed", "balance_due", "fully_paid"]].includes(status);
  const [page] = await db()`select ep.id, ep.slug, ep.status, (select coalesce(sum(taken), 0)::int from event_sessions s where s.page_id = ep.id) as taken,
    (select coalesce(sum(capacity), 0)::int from event_sessions s where s.page_id = ep.id) as capacity from event_pages ep where ep.booking_id = ${id}`;
  const cancelled = status.startsWith("cancelled");
  const cx = (b.cancellation ?? null) as { refundTotal?: number; venueKeeps?: number; noShow?: boolean } | null;
  const totals = quote.totals as { organizerTotal: number; venueTotal: number; organizerFee: number };
  return (
    <div>
      <PageTitle
        back={{ href: "/pemesanan", label: t("workspace.back") }}
        title={`${String(ctx.event_name)} · ${String(ctx.space_name)}`}
        description={`${String(b.reference)} · ${String(ctx.property_name)}`}
        actions={<BookingStatus status={status} />}
      />
      <PilotEventLabel className="mb-3" />
      <div className="mb-4">
        <BookingProgress current={bookingStep(status, agreementDone)} />
      </div>
      <div className="mb-4 grid gap-3">
        {done === "agreement" ? <Notice tone="positive" className="alert-ok" title={t("agreementPanel.accepted")} /> : null}
        {done === "extended" ? <Notice tone="positive" className="alert-ok" title={t("workspace.extended")} /> : null}
        {accepted && status === "pending_agreement_and_deposit" ? (
          <Notice tone="positive" title={t("workspace.acceptedTitle")}>{t("workspace.acceptedBody", { at: formatDateTime(b.deposit_due_at as Date, tz) })}</Notice>
        ) : null}
        {status === "confirmed" || status === "balance_due" || status === "fully_paid" ? <Notice tone="positive" title={t("workspace.confirmedTitle")}>{t("workspace.confirmedBody")}</Notice> : null}
        {status === "lapsed" ? <Notice tone="danger" title={t("workspace.lapsedTitle")}>{t("workspace.lapsedBody")}</Notice> : null}
        {done === "cancelled" ? <Notice tone="positive" className="alert-ok" title={t("cancelPanel.done")} /> : null}
        {cancelled ? (
          <Notice tone="danger" title={t(cx?.noShow ? "workspace.noShowTitle" : status === "cancelled_by_venue" ? "workspace.cancelledByVenue" : "workspace.cancelledByOrganizer")}>
            {t("workspace.cancelledBody", { reason: String(b.cancel_reason ?? ""), refund: formatRupiah(cx?.refundTotal ?? 0), keeps: formatRupiah(cx?.venueKeeps ?? 0) })}
          </Notice>
        ) : null}
        {b.at_risk && !cancelled ? <Notice tone="danger" title={t("atRisk.isAtRisk")}>{String(b.at_risk_reason ?? "")}</Notice> : null}
        {otherOpen.length ? (
          <Notice tone="info" title={t("workspace.otherOpenTitle", { n: otherOpen.length })}>
            <p className="m-0">{t("workspace.otherOpenBody")}</p>
            <ul className="mt-2 grid list-none gap-2 p-0">
              {otherOpen.map((o) => (
                <li key={String(o.id)} className="flex flex-wrap items-center gap-2">
                  <span>{String(o.space_name)}</span>
                  <form action={markLostAction}>
                    <input type="hidden" name="enquiryId" value={String(o.id)} />
                    <input type="hidden" name="bookingId" value={id} />
                    <input type="hidden" name="feedback" value={t("workspace.lostFeedback")} />
                    <button type="submit" className="btn btn-secondary btn-sm">{t("workspace.markLost")}</button>
                  </form>
                </li>
              ))}
            </ul>
          </Notice>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4">
          <Panel>
            <h2 className="mt-0">{t("workspace.agreement")}</h2>
            {!agreement || agreement.status === "generating" ? <p className="small muted">{t("workspace.agreementGenerating")}</p> : null}
            {agreement && agreement.status !== "generating" ? (
              <>
                <DocPreview title={t("docs.agreementTitle")} number={String(b.reference)} footer={t("docs.pilotFooter")}>
                  <Facts
                    cols={2}
                    items={[
                      { k: t("workspace.venue"), v: String(ctx.venue_name) },
                      { k: t("workspace.organizer"), v: String(ctx.organizer_name) },
                      { k: t("workspace.space"), v: `${String(ctx.space_name)}, ${String(ctx.property_name)}` },
                      { k: t("workspace.total"), v: formatRupiah(totals.organizerTotal) },
                    ]}
                  />
                </DocPreview>
                <p className="small mt-2">
                  <Link href={`/api/documents/agreement/${id}`}>{t("workspace.downloadAgreement")}</Link>
                  {agreement.sha256 ? <span className="muted"> · {t("workspace.fingerprint", { hash: String(agreement.sha256).slice(0, 12) })}</span> : null}
                </p>
                <ul className="small grid list-none gap-1 p-0">
                  {(["organizer", "venue"] as const).map((sd) => {
                    const x = acc.find((a) => a.side === sd);
                    return (
                      <li key={sd} className="flex flex-wrap items-center gap-2">
                        <span>{t(`docs.sides.${sd}`)}:</span>
                        {x ? <Status tone="positive">{t("workspace.acceptedBy", { name: x.typedName, at: formatDateTime(new Date(x.at), tz) })}</Status> : <Status tone="waiting">{t("workspace.notYet")}</Status>}
                      </li>
                    );
                  })}
                </ul>
                {myTurn && canSign && status === "pending_agreement_and_deposit" ? (
                  <Form action={agreementAction}>
                    <input type="hidden" name="bookingId" value={id} />
                    <label className="check">
                      <input type="checkbox" name="read" required /> {t("workspace.agreementTick")}
                    </label>
                    <label>
                      {t("workspace.typedName")}
                      <input name="typedName" autoComplete="name" required aria-describedby="typed-hint" />
                    </label>
                    <p id="typed-hint" className="small muted">{t("workspace.typedNameHint", { name: String(u?.name ?? "") })}</p>
                    <Submit>{t("workspace.acceptAgreement")}</Submit>
                  </Form>
                ) : null}
                {side === "venue" && agreement.status === "generated" ? <p className="small muted">{t("workspace.waitOrganizer")}</p> : null}
              </>
            ) : null}
          </Panel>

          <Panel>
            <h2 className="mt-0">{t("workspace.payments")}</h2>
            {requests.map((r) => {
              const paid = r.status === "paid";
              return (
                <div key={String(r.id)} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-0">
                  <div>
                    <p className="m-0 font-medium">{t(`payments.kinds.${String(r.kind)}`)} · {formatRupiah(num(r.amount))}</p>
                    <p className="small muted m-0">{paid ? t("workspace.paidAt", { at: formatDateTime(r.paid_at as Date, tz) }) : t("workspace.dueAt", { at: formatDateTime(r.due_at as Date, tz) })}</p>
                  </div>
                  {paid ? (
                    <Status tone="positive">{t("workspace.paid")}</Status>
                  ) : r.status === "open" && side === "organizer" && status !== "lapsed" ? (
                    <Link className="btn btn-primary" href={`/pemesanan/${id}/bayar/${r.id}`}>
                      {t("workspace.pay")}
                    </Link>
                  ) : (
                    <Status tone="waiting">{t(`workspace.requestStatus.${String(r.status)}`)}</Status>
                  )}
                </div>
              );
            })}
            {!balanceReq && b.balance_request_at ? <p className="small muted">{t("workspace.balanceLater", { at: formatDateTime(b.balance_request_at as Date, tz) })}</p> : null}
            {side === "venue" && membership.role === "owner" && balanceReq?.status === "open" && !b.balance_extended ? (
              <details className="mt-2">
                <summary>{t("workspace.extend")}</summary>
                <Form action={extendBalanceAction}>
                  <input type="hidden" name="bookingId" value={id} />
                  <label>
                    {t("workspace.extendDays")}
                    <select name="days" defaultValue="3">
                      {[1, 2, 3].map((d) => (
                        <option key={d} value={d}>
                          {t("workspace.daysN", { n: d })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Submit variant="secondary">{t("workspace.extendSubmit")}</Submit>
                </Form>
              </details>
            ) : null}
            {payments.some((p) => p.status === "failed" || p.status === "expired") ? <p className="small muted">{t("workspace.failedAttempts", { n: payments.filter((p) => p.status === "failed" || p.status === "expired").length })}</p> : null}
          </Panel>

          <Panel>
            <h2 className="mt-0">{t("workspace.receipts")}</h2>
            {receipts.length === 0 ? <p className="small muted">{t("workspace.noReceipts")}</p> : null}
            <ul className="grid list-none gap-1 p-0">
              {receipts.map((r) => (
                <li key={String(r.id)} className="flex flex-wrap justify-between gap-2">
                  <Link href={`/api/documents/receipt/${r.id}`}>
                    {t(r.kind === "credit_note" ? "workspace.creditNote" : "workspace.receipt", { number: String(r.number) })}
                  </Link>
                  <span className="num small">{formatRupiah(num(r.amount))}</span>
                </li>
              ))}
            </ul>
            <p className="small muted">{t("workspace.receiptNote")}</p>
            {receipts.length || b.settlement || cancelled ? <StatementLinks bookingId={id} /> : null}
          </Panel>

          {!["pending_agreement_and_deposit", "lapsed"].includes(status) ? (
            <ChecklistPanel
              bookingId={id}
              items={docs}
              side={side}
              tz={tz}
              canUpload={side === "organizer" && can("organizer", membership.role, "documents.upload") && !cancelled}
              canReview={side === "venue" && can("venue_operator", membership.role, "documents.review") && !cancelled}
            />
          ) : null}
          <AfterEventPanel bookingId={id} booking={b} problems={problems} tz={tz} canReport={side === "organizer" ? can("organizer", membership.role, "quote.accept") : can("venue_operator", membership.role, "quote.send")} />
          {canCancel ? <CancelPanel bookingId={id} side={side} figures={figures} eventDay={eventDay} /> : null}
        </div>

        <div className="grid h-fit gap-4">
          <Panel>
            <h2 className="mt-0">{t("workspace.summary")}</h2>
            <MoneyRow label={t("quoteBuilder.venueTotal")} value={formatRupiah(totals.venueTotal)} />
            <MoneyRow label={t("quoteBuilder.spotinFee")} value={formatRupiah(totals.organizerFee)} muted />
            <MoneyRow label={t("quoteView.youPay")} value={formatRupiah(totals.organizerTotal)} strong />
            <p className="small">
              <Link href={`/api/documents/quote/${quote.id}`}>{t("quoteView.pdf")}</Link>
            </p>
          </Panel>
          {side === "venue" && live ? <AtRiskPanel bookingId={id} atRisk={!!b.at_risk} reason={(b.at_risk_reason as string) ?? null} canEdit={can("venue_operator", membership.role, "documents.review")} /> : null}
          <Panel>
            <h2 className="mt-0">{t("workspace.eventPage")}</h2>
            {page ? (
              <>
                <p className="small m-0">
                  <Status tone={page.status === "live" ? "positive" : "neutral"}>{t(`pageStatus.${String(page.status)}`)}</Status>
                </p>
                <p className="small">{t("workspace.registrations", { taken: Number(page.taken), capacity: Number(page.capacity) })}</p>
                {side === "organizer" ? (
                  <p className="small">
                    <Link href={`/acara/${b.event_id}/halaman`}>{t("workspace.managePage")}</Link> · <Link href={`/acara/${b.event_id}/peserta`}>{t("workspace.attendees")}</Link>
                  </p>
                ) : page.status !== "draft" ? (
                  <p className="small"><Link href={`/e/${page.slug}`}>{t("workspace.viewPage")}</Link></p>
                ) : null}
              </>
            ) : side === "organizer" && live ? (
              <Link className="btn btn-secondary" href={`/acara/${b.event_id}/halaman`}>{t("workspace.createPage")}</Link>
            ) : (
              <p className="small muted">{t("workspace.noPage")}</p>
            )}
          </Panel>
          <Panel>
            <h2 className="mt-0">{t("workspace.contacts")}</h2>
            {contacts ? (
              <ul className="small grid list-none gap-2 p-0">
                {(side === "organizer" ? contacts.venue : contacts.organizer).map((c, i) => (
                  <li key={i}>
                    <strong>{String(c.name)}</strong>
                    <br />
                    {String(c.email)}
                    {c.phone ? ` · ${String(c.phone)}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">{t("workspace.contactsLater")}</p>
            )}
            <p className="small">
              <Link href={side === "organizer" ? `/enquiry/${b.enquiry_id}` : `/venue/enquiry/${b.enquiry_id}`}>{t("workspace.messages")}</Link>
            </p>
            <p className="small">
              <Link href={`/bantuan/hubungi?type=booking&id=${id}`}>{t("contactForm.link")}</Link>
            </p>
          </Panel>
          <Panel>
            <h2 className="mt-0">{t("workspace.timeline")}</h2>
            <ol className="small grid gap-1 pl-4">
              {timeline.map((x, i) => (
                <li key={i}>
                  {hasMessage(`workspace.events.${String(x.action)}`) ? t(`workspace.events.${String(x.action)}`) : String(x.action)} <span className="muted">· {formatDateTime(x.at as Date, tz)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
