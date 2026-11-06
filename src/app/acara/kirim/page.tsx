import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/time";
import { requireOrganizerPage } from "@/web/view";
import { organizerEvents } from "@/server/enquiries";

/** Step 1 of sending an enquiry: pick the event (project) or create one. */
export default async function PickEventPage({ searchParams }: { searchParams: Promise<{ spaces?: string | string[] }> }) {
  const sp = await searchParams;
  const spaces = (Array.isArray(sp.spaces) ? sp.spaces : sp.spaces ? sp.spaces.split(",") : []).join(",");
  const { session } = await requireOrganizerPage("/acara/kirim");
  const { events } = await organizerEvents({ userId: session.userId });
  return (
    <div className="narrow">
      <h1>{t("send.pickEvent")}</h1>
      {events.map((e) => (
        <div className="card spread" key={String(e.id)}>
          <span>
            <strong>{String(e.name)}</strong>
            <span className="small muted"> · {formatDate((e.days as { date: string }[])[0]!.date)}</span>
          </span>
          <Link className="btn btn-secondary" href={`/acara/${e.id}/kirim?spaces=${encodeURIComponent(spaces)}`}>
            {t("send.useEvent")}
          </Link>
        </div>
      ))}
      <Link className="btn btn-primary" href={`/acara/baru?spaces=${encodeURIComponent(spaces)}`}>
        {t("send.newEvent")}
      </Link>
    </div>
  );
}
