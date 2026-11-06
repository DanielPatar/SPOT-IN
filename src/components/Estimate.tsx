"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { estimateAction } from "@/web/actions/organizer";
import { DayRows } from "./DayRows";

type AddOn = { id: string; name: string; unit: string; price: string; mandatory: boolean };

/** Quick estimate (FR-M5-07): indicative total, labeled non-binding. */
export function Estimate({ spaceId, addOns, initialDays }: { spaceId: string; addOns: AddOn[]; initialDays?: { date: string; start: string; end: string }[] }) {
  const t = useTranslations("estimate");
  const [state, action, pending] = useActionState(estimateAction, {});
  const d = state.data as Record<string, string> & { lines?: { label: string; quantity: number; amount: string }[] } | undefined;
  return (
    <form action={action} className="form">
      <input type="hidden" name="spaceId" value={spaceId} />
      <DayRows initial={initialDays} />
      {addOns.length ? (
        <fieldset>
          <legend>{t("addOns")}</legend>
          {addOns.map((a) => (
            <div className="form-inline" key={a.id}>
              <label className="check">
                <input type="checkbox" name="addOn" value={a.id} defaultChecked={a.mandatory} disabled={a.mandatory} /> {a.name} · {a.price}
                {a.mandatory ? ` (${t("mandatory")})` : ""}
              </label>
              {a.unit !== "per_day" ? (
                <label style={{ width: 100 }}>
                  <span className="sr-only">{t("quantity")}</span>
                  <input name={`qty_${a.id}`} inputMode="numeric" placeholder={t(`qtyHint.${a.unit}`)} />
                </label>
              ) : null}
            </div>
          ))}
        </fieldset>
      ) : null}
      <button className="btn btn-secondary" disabled={pending}>
        {t("calculate")}
      </button>
      {state.error ? <p className="alert alert-error">{state.error}</p> : null}
      {d ? (
        <div className="card small" aria-live="polite">
          <table>
            <tbody>
              {d.lines?.map((l, i) => (
                <tr key={i}>
                  <td>{l.label === "min_spend" ? t("minSpend") : l.label}</td>
                  <td>× {l.quantity}</td>
                  <td>{l.amount}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}>{t("serviceCharge")}</td>
                <td>{d.service}</td>
              </tr>
              <tr>
                <td colSpan={2}>{t("ppn")}</td>
                <td>{d.ppn}</td>
              </tr>
              <tr>
                <td colSpan={2}>{t("fee")}</td>
                <td>{d.fee}</td>
              </tr>
              <tr>
                <th colSpan={2}>{t("total")}</th>
                <th>{d.total}</th>
              </tr>
            </tbody>
          </table>
          <p className="muted">{t("nonBinding")}</p>
        </div>
      ) : null}
    </form>
  );
}
