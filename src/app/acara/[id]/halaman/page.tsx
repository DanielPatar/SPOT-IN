import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarX } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatTime, formatWeekdayDate } from "@/lib/time";
import { PermissionError } from "@/lib/permissions";
import { CATEGORIES } from "@/server/enquiries";
import { requireOrganizerPage } from "@/web/view";
import { absoluteUrl } from "@/server/notify";
import { eventPageSetup } from "@/server/event-pages";
import { Form, Submit } from "@/components/Form";
import { Notice, PageTitle, Panel, PilotEventLabel, StateBlock, Status } from "@/components/kit";
import { PageEditorForm } from "@/components/PageEditorForm";
import { ShareLink } from "@/components/ShareLink";
import { registrationOpenAction, saveEventPageAction } from "@/web/actions/after";

/** Organizer's event page editor (FR-M28-01..13). */
export default async function EventPageEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const { id } = await params;
  const { done } = await searchParams;
  const { session } = await requireOrganizerPage(`/acara/${id}/halaman`);
  let setup;
  try {
    setup = await eventPageSetup({ userId: session.userId }, id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const { event, booking, page, sessions, venue } = setup;
  const back = { href: `/acara/${id}`, label: t("pageEditor.back") };
  if (!booking && !page) {
    return (
      <div>
        <PageTitle back={back} title={t("pageEditor.titleNew")} />
        <StateBlock icon={CalendarX} title={t("pageEditor.needsBookingTitle")}>
          {t("pageEditor.needsBookingBody")}
        </StateBlock>
      </div>
    );
  }
  const tz = String(booking?.timezone ?? "Asia/Jakarta");
  const days = ((booking?.days ?? event.days) as { date: string; start: string; end: string }[]) ?? [];
  const url = page ? absoluteUrl(`/e/${page.slug}`) : null;
  const editable = page ? !["cancelled", "removed", "ended"].includes(String(page.status)) : true;
  return (
    <div>
      <PageTitle back={back} title={page ? String(page.title) : t("pageEditor.titleNew")} description={t("pageEditor.intro")} actions={page ? <Status tone={page.status === "live" ? "positive" : "neutral"}>{t(`pageStatus.${String(page.status)}`)}</Status> : undefined} />
      <PilotEventLabel className="mb-3" />
      <div className="mb-4 grid gap-3">
        {done === "published" ? <Notice tone="positive" className="alert-ok" title={t("pageEditor.publishedTitle")}>{t("pageEditor.publishedBody")}</Notice> : null}
        {done === "saved" ? <Notice tone="positive" className="alert-ok" title={t("pageEditor.saved")} /> : null}
        {page?.status === "cancelled" ? <Notice tone="danger" title={t("pageEditor.cancelledTitle")}>{t("pageEditor.cancelledBody")}</Notice> : null}
        {page?.status === "ended" ? <Notice tone="neutral" title={t("pageEditor.endedTitle")}>{t("pageEditor.endedBody")}</Notice> : null}
        {page?.status === "removed" ? <Notice tone="danger" title={t("pageEditor.removedTitle")}>{String(page.removed_reason ?? "")}</Notice> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {editable && booking ? (
            <PageEditorForm
              action={saveEventPageAction}
              eventId={id}
              isDraft={!page || page.status === "draft"}
              maxCapacity={Number(booking.max_capacity)}
              categories={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))}
              initial={{
                title: String(page?.title ?? event.name),
                summary: String(page?.summary ?? ""),
                description: String(page?.description ?? ""),
                category: String(page?.category ?? event.category ?? "other"),
                ageNote: String(page?.age_note ?? t("pageEditor.ageDefault")),
                closeMode: String(page?.close_mode ?? "session_start"),
                questions: (page?.questions ?? []) as never,
                hasCover: !!page?.cover_file_id,
              }}
              sessions={days.map((d) => {
                const s = sessions.find((x) => (x.day instanceof Date ? x.day.toISOString().slice(0, 10) : String(x.day)) === d.date);
                return {
                  day: d.date,
                  label: formatWeekdayDate(d.date),
                  start: s ? formatTime(s.starts_at as Date, tz).replace(".", ":") : d.start,
                  end: s ? formatTime(s.ends_at as Date, tz).replace(".", ":") : d.end,
                  bookedStart: d.start,
                  bookedEnd: d.end,
                  capacity: s ? Number(s.capacity) : "",
                  taken: s ? Number(s.taken) : 0,
                };
              })}
            />
          ) : null}
        </div>
        <div className="grid h-fit gap-4">
          <Panel>
            <h2 className="mt-0">{t("pageEditor.venue")}</h2>
            <p className="m-0 font-medium">{t("common.spaceAtProperty", { space: String(venue?.space_name ?? ""), property: String(venue?.property_name ?? "") })}</p>
            <p className="small muted m-0">{String(venue?.address_text ?? "")}</p>
            <p className="small muted">{t("pageEditor.venueLocked")}</p>
          </Panel>
          {page && url && page.status !== "draft" ? (
            <Panel>
              <h2 className="mt-0">{t("pageEditor.shareTitle")}</h2>
              <p className="small muted">{t("pageEditor.shareHint")}</p>
              <ShareLink url={url} title={String(page.title)} />
              <p className="small mt-2">
                <Link href={`/e/${page.slug}`}>{t("pageEditor.preview")}</Link> · <Link href={`/acara/${id}/peserta`}>{t("pageEditor.attendees")}</Link>
              </p>
            </Panel>
          ) : null}
          {page && (page.status === "live" || page.status === "registration_closed") ? (
            <Panel>
              <h2 className="mt-0">{t("pageEditor.registration")}</h2>
              <Form action={registrationOpenAction}>
                <input type="hidden" name="pageId" value={String(page.id)} />
                <input type="hidden" name="eventId" value={id} />
                {page.status === "live" ? (
                  <Submit name="op" value="close" variant="secondary">{t("pageEditor.closeNow")}</Submit>
                ) : (
                  <Submit name="op" value="open" variant="secondary">{t("pageEditor.reopen")}</Submit>
                )}
              </Form>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
