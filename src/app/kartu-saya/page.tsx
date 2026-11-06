import Link from "next/link";
import { Ticket } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatTime, formatWeekdayDate, localDate, tzLabel } from "@/lib/time";
import { requireSession } from "@/web/session";
import { myPasses, pendingRegistrations } from "@/server/event-pages";
import { Form, Submit } from "@/components/Form";
import { Notice, PageTitle, StateBlock, Status } from "@/components/kit";
import { cancelRegistrationAction } from "@/web/actions/after";

/** My passes (FR-M31-01) with cancellation until the session starts (FR-M30-07). */
export default async function MyPassesPage() {
  const s = await requireSession("/kartu-saya");
  const passes = await myPasses(s.userId);
  const pending = await pendingRegistrations(s.userId);
  return (
    <div className="narrow">
      <PageTitle title={t("myPasses.title")} description={t("myPasses.intro")} />
      {pending.map((p) => (
        <Notice key={String(p.id)} tone="waiting" className="mb-3" title={t("myPasses.pendingTitle", { title: String(p.title) })}>
          {t("myPasses.pendingBody")}
        </Notice>
      ))}
      {passes.length === 0 ? (
        <StateBlock icon={Ticket} title={t("myPasses.emptyTitle")}>
          {t("myPasses.emptyBody")}
        </StateBlock>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {passes.map((p) => {
            const tz = String(p.timezone);
            const live = p.status === "issued";
            return (
              <li key={String(p.token)} className="rounded-lg border border-line bg-surface p-4" data-testid="my-pass">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/kartu/${p.token}`} className="font-semibold">{String(p.title)}</Link>
                  <Status tone={live ? "positive" : p.status === "checked_in" ? "info" : "danger"}>{t(`passStatus.${String(p.status)}`)}</Status>
                </div>
                <p className="small muted m-0">
                  {formatWeekdayDate(localDate(p.starts_at as Date, tz))} · {formatTime(p.starts_at as Date, tz)}–{formatTime(p.ends_at as Date, tz)} {tzLabel(tz)} · {t("common.spaceAtProperty", { space: String(p.space_name), property: String(p.property_name) })}
                </p>
                <p className="small muted m-0">{t("passPage.number", { number: String(p.number) })}</p>
                {live ? (
                  <details className="mt-2">
                    <summary className="small">{t("myPasses.cancel")}</summary>
                    <Form action={cancelRegistrationAction}>
                      <input type="hidden" name="registrationId" value={String(p.registration_id)} />
                      <p className="small m-0">{t("myPasses.cancelBody")}</p>
                      <Submit variant="danger">{t("myPasses.cancelSubmit")}</Submit>
                    </Form>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
