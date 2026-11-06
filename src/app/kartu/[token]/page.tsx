import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { Ticket } from "lucide-react";
import { t } from "@/lib/i18n";
import { now } from "@/lib/clock";
import { formatTime, formatWeekdayDate, tzLabel } from "@/lib/time";
import { passView } from "@/server/event-pages";
import { absoluteUrl } from "@/server/notify";
import { getSession } from "@/web/session";
import { Form, Submit } from "@/components/Form";
import { Notice, PilotEventLabel, StateBlock, Status } from "@/components/kit";
import { checkInAction } from "@/web/actions/after";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Pass (FR-M31-01..07) and check-in by opening the QR while logged in as an organizer member (FR-M32-01..08). */
export default async function PassPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string; who?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const s = await getSession();
  const v = await passView(token, s?.userId ?? null);
  if (!v) {
    return (
      <div className="narrow">
        <StateBlock icon={Ticket} title={t("passPage.notFoundTitle")}>
          {t("passPage.notFoundBody")}
        </StateBlock>
      </div>
    );
  }
  if (v.role === "public") {
    // FR-M31-02: nothing beyond the first name and the event for anyone else.
    return (
      <div className="narrow">
        <PilotEventLabel className="mb-3" />
        <h1>{t("passPage.publicTitle", { name: v.firstName ?? "" })}</h1>
        <p>{v.title}</p>
        <p className="small muted">{t("passPage.publicHint")}</p>
        {!s ? <Link className="btn btn-secondary" href={`/masuk?next=/kartu/${token}`}>{t("passPage.login")}</Link> : null}
      </div>
    );
  }
  const p = v.pass;
  const tz = String(p.timezone);
  const day = p.day instanceof Date ? p.day.toISOString().slice(0, 10) : String(p.day);
  const status = String(p.status);
  const qr = await QRCode.toDataURL(absoluteUrl(`/kartu/${token}`), { margin: 1, width: 240 });
  const at = await now();
  const canUndo = status === "checked_in" && at.getTime() - new Date(p.checked_in_at as Date).getTime() <= 5 * 60_000;
  const tone = status === "issued" ? "positive" : status === "checked_in" ? "info" : "danger";
  return (
    <div className="narrow">
      <PilotEventLabel className="mb-3" />
      {v.role === "organizer" ? <Notice tone="info" className="mb-3" title={t("passPage.asOrganizer")} /> : null}
      {sp.done === "checkin" || sp.done === "undo" ? <Notice tone="positive" className="alert-ok mb-3" title={t(sp.done === "undo" ? "checkinPanel.undone" : "checkinPanel.done", { name: String(sp.who ?? "") })} /> : null}
      <article className="pilot-watermark rounded-lg border border-line-strong bg-white p-5" aria-label={t("passPage.cardLabel")}>
        <p className="small muted m-0">{t("passPage.number", { number: String(p.number) })}</p>
        <h1 className="mt-1 mb-2">{String(p.title)}</h1>
        <Status tone={tone}>{t(`passStatus.${status}`)}</Status>
        <dl className="mt-3 grid gap-2 text-sm">
          <div><dt className="muted">{t("passPage.name")}</dt><dd className="m-0 font-semibold">{String(p.name)}</dd></div>
          <div><dt className="muted">{t("passPage.session")}</dt><dd className="m-0">{formatWeekdayDate(day)} · {formatTime(p.starts_at as Date, tz)}–{formatTime(p.ends_at as Date, tz)} {tzLabel(tz)}</dd></div>
          <div>
            <dt className="muted">{t("passPage.venue")}</dt>
            <dd className="m-0">
              {t("common.spaceAtPropertyAddress", { space: String(p.space_name), property: String(p.property_name), address: String(p.address_text) })}{" "}
              {p.lat != null ? <a href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`} target="_blank" rel="noopener noreferrer">{t("passPage.map")}</a> : null}
            </dd>
          </div>
        </dl>
        {status === "issued" || status === "checked_in" ? <img src={qr} alt={t("passPage.qrAlt")} width={200} height={200} className="mx-auto mt-4 block" /> : null}
        <p className="small muted mt-3 mb-0 text-center">{t("pilot.eventLabel")}</p>
      </article>

      {v.role === "organizer" ? (
        <div className="mt-4 grid gap-3">
          {status === "checked_in" ? (
            <Notice tone="info" title={t("checkin.already", { time: formatTime(p.checked_in_at as Date, tz), member: String(p.checked_in_by_name ?? "") })} />
          ) : null}
          {status === "cancelled" || status === "voided" ? <Notice tone="danger" title={t(`passStatus.${status}`)}>{t("passPage.invalid")}</Notice> : null}
          {status === "issued" && p.registration_status === "confirmed" ? (
            <Form action={checkInAction}>
              <input type="hidden" name="passId" value={String(p.id)} />
              <input type="hidden" name="name" value={String(p.name).split(/\s+/)[0]} />
              <input type="hidden" name="back" value={`/kartu/${token}`} />
              <Submit>{t("passPage.checkIn", { name: String(p.name).split(/\s+/)[0] ?? "" })}</Submit>
            </Form>
          ) : null}
          {canUndo ? (
            <Form action={checkInAction}>
              <input type="hidden" name="passId" value={String(p.id)} />
              <input type="hidden" name="name" value={String(p.name).split(/\s+/)[0]} />
              <input type="hidden" name="back" value={`/kartu/${token}`} />
              <Submit name="op" value="undo" variant="secondary">{t("passPage.undo")}</Submit>
            </Form>
          ) : null}
        </div>
      ) : (
        <p className="small mt-4">
          <Link href="/kartu-saya">{t("passPage.allPasses")}</Link> · <Link href={`/e/${p.slug}`}>{t("passPage.eventPage")}</Link>
        </p>
      )}
    </div>
  );
}
