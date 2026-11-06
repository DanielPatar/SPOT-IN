import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { db, num } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { formatRupiah } from "@/lib/money";
import { PermissionError } from "@/lib/permissions";
import { requireSession } from "@/web/session";
import { requestForActor, paymentForActor } from "@/server/bookings";
import { isTestMode } from "@/adapters/payments";
import { Form, Submit } from "@/components/Form";
import { MoneyRow, Notice, PageTitle, Panel, Status } from "@/components/kit";
import { simulatePaymentAction, startPaymentAction } from "@/web/actions/booking";

const METHODS = ["test_va", "test_qris", "test_ewallet", "test_card"] as const;

/** Sandbox payment page (FR-M14-01..04). No real money moves; test mode is shown on the page. */
export default async function PayPage({ params, searchParams }: { params: Promise<{ id: string; requestId: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { id, requestId } = await params;
  const { payment: paymentId } = await searchParams;
  const s = await requireSession(`/pemesanan/${id}/bayar/${requestId}`);
  const a = { userId: s.userId };
  let r, booking;
  try {
    ({ request: r, booking } = await requestForActor(a, requestId));
    if (String(booking.id) !== id) notFound();
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  let p: Record<string, unknown> | null = null;
  if (paymentId) {
    try {
      p = (await paymentForActor(a, paymentId)).payment;
      if (String(p.request_id) !== requestId) p = null;
    } catch (e) {
      if (!(e instanceof PermissionError)) throw e;
    }
  }
  const [ctx] = await db()`select p.timezone, e.name as event_name from bookings b join spaces s on s.id = b.space_id join properties p on p.id = s.property_id join events e on e.id = b.event_id where b.id = ${id}`;
  const tz = String(ctx!.timezone);
  const instr = (p?.instructions ?? {}) as Record<string, string>;
  const status = String(p?.status ?? "");
  const [receipt] = r.status === "paid" ? await db()`select id, number from receipts where booking_id = ${id} and kind = 'receipt' order by created_at desc limit 1` : [];
  return (
    <div className="max-w-2xl">
      <PageTitle back={{ href: `/pemesanan/${id}`, label: t("pay.back") }} title={t("pay.title", { kind: t(`payments.kinds.${String(r.kind)}`) })} description={String(ctx!.event_name)} />
      {isTestMode() ? <Notice tone="waiting" className="mb-4" title={t("pay.testTitle")}>{t("pay.testBody")}</Notice> : null}
      <Panel className="mb-4">
        <MoneyRow label={t("pay.amount")} value={formatRupiah(num(r.amount))} strong />
        {num(r.fee_part) ? <MoneyRow label={t("quoteBuilder.spotinFee")} value={formatRupiah(num(r.fee_part))} muted /> : null}
        <p className="small muted m-0">{t("pay.due", { at: formatDateTime(r.due_at as Date, tz) })}</p>
      </Panel>

      {r.status === "paid" ? (
        <Notice tone="positive" title={t("pay.paidTitle")} action={<Link className="btn btn-primary" href={`/pemesanan/${id}`}>{t("pay.toWorkspace")}</Link>}>
          {t("pay.paidBody")}
          {receipt ? (
            <>
              {" "}
              <Link href={`/api/documents/receipt/${receipt.id}`}>{t("pay.receipt", { number: String(receipt.number) })}</Link>
            </>
          ) : null}
        </Notice>
      ) : r.status !== "open" ? (
        <Notice tone="danger" title={t("pay.closedTitle")}>{t("pay.closedBody")}</Notice>
      ) : (
        <>
          {status === "failed" ? <Notice tone="danger" className="mb-4" title={t("pay.failedTitle")}>{t("pay.failedBody")}</Notice> : null}
          {status === "expired" ? <Notice tone="danger" className="mb-4" title={t("pay.expiredTitle")}>{t("pay.expiredBody")}</Notice> : null}
          {p && status === "pending" ? (
            <Panel className="mb-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="m-0">{t(`pay.methods.${String(p.method)}`)}</h2>
                <Status tone="waiting">{t("pay.processing")}</Status>
              </div>
              {instr.vaNumber ? (
                <dl className="mt-3 grid gap-1">
                  <dt className="small muted">{t("pay.bank")}</dt>
                  <dd className="m-0">{instr.bank}</dd>
                  <dt className="small muted">{t("pay.vaNumber")}</dt>
                  <dd className="num m-0 text-lg font-bold">{instr.vaNumber}</dd>
                </dl>
              ) : null}
              {instr.qrString ? <p className="num mt-3">{t("pay.qris", { code: instr.qrString })}</p> : null}
              {instr.wallet ? <p className="mt-3">{t("pay.wallet", { wallet: instr.wallet })}</p> : null}
              {instr.cardHint ? <p className="mt-3">{t("pay.card", { card: instr.cardHint })}</p> : null}
              <p className="small muted">{t("pay.pendingHint", { at: formatDateTime(p.expires_at as Date, tz) })}</p>
              {isTestMode() ? (
                <div className="mt-3 rounded-md border border-dashed border-warm/60 p-3">
                  <p className="small m-0 mb-2 font-semibold">{t("pay.simulateTitle")}</p>
                  <div className="row">
                    {(["paid", "failed", "expired"] as const).map((o) => (
                      <Form key={o} action={simulatePaymentAction}>
                        <input type="hidden" name="paymentId" value={String(p.id)} />
                        <input type="hidden" name="bookingId" value={id} />
                        <input type="hidden" name="requestId" value={requestId} />
                        <Submit name="outcome" value={o} variant={o === "paid" ? "primary" : "secondary"}>{t(`pay.simulate.${o}`)}</Submit>
                      </Form>
                    ))}
                  </div>
                </div>
              ) : null}
            </Panel>
          ) : null}
          <Panel>
            <h2 className="mt-0">{p && status === "pending" ? t("pay.otherMethod") : t("pay.chooseMethod")}</h2>
            <Form action={startPaymentAction}>
              <input type="hidden" name="requestId" value={requestId} />
              <input type="hidden" name="bookingId" value={id} />
              <fieldset>
                <legend className="sr-only">{t("pay.chooseMethod")}</legend>
                {METHODS.map((m, i) => (
                  <label key={m} className="check">
                    <input type="radio" name="method" value={m} defaultChecked={i === 0} /> {t(`pay.methods.${m}`)}
                  </label>
                ))}
              </fieldset>
              <Submit>{t("pay.start")}</Submit>
            </Form>
          </Panel>
        </>
      )}
    </div>
  );
}
