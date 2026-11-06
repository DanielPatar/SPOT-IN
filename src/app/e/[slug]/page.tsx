import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX, Share2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { formatTime, formatWeekdayDate, tzLabel } from "@/lib/time";
import { publicPage, sessionOpen, type Question } from "@/server/event-pages";
import { absoluteUrl } from "@/server/notify";
import { getSession } from "@/web/session";
import { fileUrl } from "@/web/view";
import { StaticMap } from "@/components/MapPicker";
import { Form, Submit } from "@/components/Form";
import { PilotNotice } from "@/components/PilotNotice";
import { ShareLink } from "@/components/ShareLink";
import { Notice, PilotEventLabel, StateBlock, Status } from "@/components/kit";
import { registerAction } from "@/web/actions/after";

// FR-M28-05: unlisted only — noindex, nofollow, no structured data, never in a sitemap or list.
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } };

export default async function PublicEventPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sent?: string }> }) {
  const { slug } = await params;
  const { sent } = await searchParams;
  const pub = await publicPage(slug);
  if (!pub || pub.page.status === "removed") {
    return (
      <div className="narrow">
        <StateBlock icon={CalendarX} title={t("publicPage.unavailableTitle")}>
          {t("publicPage.unavailableBody")}
        </StateBlock>
      </div>
    );
  }
  const { page, sessions } = pub;
  const tz = String(page.timezone);
  const s = await getSession();
  const mine = s ? await db()`select r.session_id, p.token from registrations r left join passes p on p.registration_id = r.id where r.page_id = ${page.id as string} and r.user_id = ${s.userId} and r.status = 'confirmed'` : [];
  const states = await Promise.all(sessions.map((x) => sessionOpen(x, page)));
  const anyOpen = states.includes("open");
  const questions = (page.questions ?? []) as Question[];
  const cfg = config();
  const dayLabel = (d: unknown) => formatWeekdayDate(d instanceof Date ? d.toISOString().slice(0, 10) : String(d));
  return (
    <article className="mx-auto max-w-3xl">
      <PilotEventLabel className="mb-3" />
      {page.cover_file_id ? <img src={fileUrl(String(page.cover_file_id))} alt={t("publicPage.coverAlt", { title: String(page.title) })} className="mb-4 aspect-[2/1] w-full rounded-lg object-cover" /> : null}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Status tone={page.status === "live" ? "positive" : page.status === "cancelled" ? "danger" : "neutral"}>{t(`pageStatus.${String(page.status)}`)}</Status>
      </div>
      <h1 className="mb-1">{String(page.title)}</h1>
      <p className="mt-0 text-lg text-muted-foreground">{String(page.summary)}</p>
      <p className="small">
        {t("publicPage.by", { organizer: String(page.organizer_name) })}
        {page.age_note ? ` · ${String(page.age_note)}` : ""}
      </p>
      {page.status === "cancelled" ? <Notice tone="danger" className="mb-4" title={t("publicPage.cancelledTitle")}>{t("publicPage.cancelledBody")}</Notice> : null}
      {sent ? (
        <Notice tone="waiting" className="mb-4 alert-ok" title={t("publicPage.sentTitle")}>
          {t("publicPage.sentBody", { email: sent })}
        </Notice>
      ) : null}

      <section aria-labelledby="when" className="mb-4">
        <h2 id="when">{t("publicPage.when")}</h2>
        <ul className="m-0 grid list-none gap-2 p-0">
          {sessions.map((x, i) => (
            <li key={String(x.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface p-3">
              <span>
                {dayLabel(x.day)} · {formatTime(x.starts_at as Date, tz)}–{formatTime(x.ends_at as Date, tz)} {tzLabel(tz)}
              </span>
              <span className="small muted">
                {states[i] === "full" ? t("registration.full") : states[i] === "open" ? t("publicPage.spotsLeft", { n: Number(x.capacity) - Number(x.taken) }) : t("publicPage.closedShort")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="where" className="mb-4">
        <h2 id="where">{t("publicPage.where")}</h2>
        <p className="m-0 font-medium">{t("common.spaceAtProperty", { space: String(page.space_name), property: String(page.property_name) })}</p>
        <p className="small muted mt-0">{t("common.addressLine", { address: String(page.address_text), area: String(page.area ?? ""), city: String(page.city) })}</p>
        {page.lat != null ? <StaticMap lat={Number(page.lat)} lon={Number(page.lon)} tileUrl={cfg.MAP_TILE_URL} attribution={cfg.MAP_TILE_ATTRIBUTION} /> : null}
      </section>

      {page.description ? (
        <section aria-labelledby="about" className="mb-4">
          <h2 id="about">{t("publicPage.about")}</h2>
          <p className="whitespace-pre-line">{String(page.description)}</p>
        </section>
      ) : null}
      {page.house_rules ? (
        <section aria-labelledby="rules" className="mb-4">
          <h2 id="rules">{t("publicPage.rules")}</h2>
          <p className="whitespace-pre-line">{String(page.house_rules)}</p>
        </section>
      ) : null}

      <section aria-labelledby="register" className="mb-6 rounded-lg border border-line bg-surface p-4">
        <h2 id="register" className="mt-0">{t("publicPage.register")}</h2>
        {mine.length ? (
          <Notice tone="positive" title={t("publicPage.alreadyTitle")} action={<Link className="btn btn-secondary" href={`/kartu/${mine[0]!.token}`}>{t("publicPage.viewPass")}</Link>} />
        ) : null}
        {page.status !== "live" || !anyOpen ? (
          <p className="muted">{page.status === "cancelled" ? t("publicPage.cancelledShort") : t("publicPage.registrationClosed")}</p>
        ) : (
          <Form action={registerAction}>
            <input type="hidden" name="slug" value={slug} />
            <fieldset>
              <legend>{t("publicPage.chooseDay")}</legend>
              {sessions.map((x, i) => (
                <label key={String(x.id)} className="check">
                  <input type="radio" name="sessionId" value={String(x.id)} required disabled={states[i] !== "open"} defaultChecked={states.indexOf("open") === i} />
                  {dayLabel(x.day)} {states[i] === "full" ? `· ${t("registration.full")}` : ""}
                </label>
              ))}
            </fieldset>
            <label>
              {t("publicPage.name")}
              <input name="name" required autoComplete="name" defaultValue={s?.name ?? ""} aria-describedby="name-hint" />
            </label>
            <p id="name-hint" className="small muted m-0">{t("publicPage.nameHint")}</p>
            <label>
              {t("publicPage.email")}
              <input name="email" type="email" required autoComplete="email" defaultValue={s?.email ?? ""} aria-describedby="email-hint" />
            </label>
            <p id="email-hint" className="small muted m-0">{t("publicPage.emailHint")}</p>
            {questions.map((q) =>
              q.kind === "choice" ? (
                <label key={q.id}>
                  {q.label}
                  <select name={`answer_${q.id}`} required defaultValue="">
                    <option value="" disabled>{t("publicPage.choose")}</option>
                    {(q.options ?? []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
              ) : q.kind === "yesno" ? (
                <fieldset key={q.id}>
                  <legend>{q.label}</legend>
                  <label className="check"><input type="radio" name={`answer_${q.id}`} value="yes" required /> {t("publicPage.yes")}</label>
                  <label className="check"><input type="radio" name={`answer_${q.id}`} value="no" /> {t("publicPage.no")}</label>
                </fieldset>
              ) : (
                <label key={q.id}>
                  {q.label}
                  <input name={`answer_${q.id}`} required maxLength={500} />
                </label>
              ),
            )}
            <details>
              <summary>{t("publicPage.pilotNotice")}</summary>
              <PilotNotice />
            </details>
            <label className="check">
              <input type="checkbox" name="age" required /> {t("publicPage.age")}
            </label>
            <label className="check">
              <input type="checkbox" name="pilot" required /> {t("publicPage.pilotAccept")}
            </label>
            <Submit>{t("publicPage.submit")}</Submit>
          </Form>
        )}
      </section>

      <section aria-labelledby="share" className="mb-4">
        <h2 id="share" className="inline-flex items-center gap-2"><Share2 className="size-4" aria-hidden="true" />{t("publicPage.share")}</h2>
        <ShareLink url={absoluteUrl(`/e/${slug}`)} title={String(page.title)} />
      </section>
      <p className="small">
        <Link href={`/lapor?type=event_page&id=${page.id}`}>{t("publicPage.report")}</Link>
        {s ? <> · <Link href={`/bantuan/hubungi?type=event_page&id=${page.id}`}>{t("contactForm.link")}</Link></> : null}
      </p>
    </article>
  );
}
