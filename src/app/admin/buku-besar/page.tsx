import Link from "next/link";
import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { requireAdminPage } from "@/web/session";
import { reconcile } from "@/server/ledger";
import { Status } from "@/components/kit";
import { AdminNav } from "../AdminNav";

/** FR-M24-05: ledger and reconciliation per booking; mismatches are flagged. */
export default async function AdminLedgerPage() {
  await requireAdminPage();
  const bookings = await db()`
    select b.id, b.reference, b.status, e.name as event_name from bookings b join events e on e.id = b.event_id order by b.created_at desc limit 200`;
  const rows = await Promise.all(bookings.map(async (b) => ({ b, r: await reconcile(String(b.id)) })));
  const flagged = rows.filter((x) => !x.r.ok).length;
  return (
    <div>
      <h1>{t("ledger.title")}</h1>
      <AdminNav />
      <p className="muted">{flagged ? t("ledger.flagged", { n: flagged }) : t("ledger.allOk")}</p>
      {rows.length === 0 ? <p className="muted">{t("ledger.empty")}</p> : null}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{t("ledger.booking")}</th>
              <th scope="col">{t("ledger.paid")}</th>
              <th scope="col">{t("ledger.refunded")}</th>
              <th scope="col">{t("ledger.receipts")}</th>
              <th scope="col">{t("ledger.quoteTotal")}</th>
              <th scope="col">{t("ledger.check")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ b, r }) => (
              <tr key={String(b.id)}>
                <td>
                  <Link href={`/pemesanan/${b.id}`}>{String(b.reference)}</Link>
                  <div className="small muted">{String(b.event_name)}</div>
                </td>
                <td className="num">{formatRupiah(r.figures.paid!)}</td>
                <td className="num">{formatRupiah(r.figures.refunded!)}</td>
                <td className="num">{formatRupiah(r.figures.receipts! - r.figures.creditNotes!)}</td>
                <td className="num">{formatRupiah(r.figures.quoteTotal!)}</td>
                <td>
                  {r.ok ? (
                    <Status tone="positive">{t("ledger.ok")}</Status>
                  ) : (
                    <>
                      <Status tone="danger">{t("ledger.mismatch")}</Status>
                      <ul className="small m-0 pl-4">
                        {r.problems.map((p) => (
                          <li key={p}>{t(`ledger.problems.${p}`)}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
