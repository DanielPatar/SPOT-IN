import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { requireSession } from "@/web/session";
import { listBookings } from "@/server/bookings";
import { PageTitle, StateBlock } from "@/components/kit";
import { BookingStatus } from "@/components/BookingStatus";

export default async function BookingsPage() {
  const s = await requireSession("/pemesanan");
  const rows = await listBookings({ userId: s.userId });
  return (
    <div>
      <PageTitle title={t("bookings.title")} description={t("bookings.intro")} />
      {rows.length === 0 ? (
        <StateBlock icon={CalendarCheck} title={t("bookings.emptyTitle")}>
          {t("bookings.emptyBody")}
        </StateBlock>
      ) : (
        <ul className="grid list-none gap-3 p-0">
          {rows.map((b) => (
            <li key={String(b.id)} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/pemesanan/${b.id}`} className="font-semibold">
                  {String(b.event_name)} · {String(b.space_name)}
                </Link>
                <BookingStatus status={String(b.status)} />
              </div>
              <p className="small muted m-0">
                {String(b.reference)}
                {b.status === "pending_agreement_and_deposit" ? ` · ${t("bookings.depositDue", { at: formatDateTime(b.deposit_due_at as Date, "Asia/Jakarta") })}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
