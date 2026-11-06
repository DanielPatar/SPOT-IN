"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

type Day = { date: string; start: string; end: string };

/** Event days with daily start/end times (FR-M9-01). An end earlier than the start means the next calendar day. */
export function DayRows({ initial }: { initial?: Day[] }) {
  const t = useTranslations("events");
  const [days, setDays] = useState<Day[]>(initial?.length ? initial : [{ date: "", start: "10:00", end: "21:00" }]);
  const update = (i: number, k: keyof Day, v: string) => setDays(days.map((d, j) => (j === i ? { ...d, [k]: v } : d)));
  return (
    <fieldset>
      <legend>{t("days")}</legend>
      {days.map((d, i) => (
        <div className="form-inline" key={i}>
          <label>
            {t("date")}
            <input type="date" name="dayDate" value={d.date} onChange={(e) => update(i, "date", e.target.value)} required={i === 0} />
          </label>
          <label>
            {t("start")}
            <input type="time" name="dayStart" value={d.start} onChange={(e) => update(i, "start", e.target.value)} />
          </label>
          <label>
            {t("end")}
            <input type="time" name="dayEnd" value={d.end} onChange={(e) => update(i, "end", e.target.value)} />
          </label>
          {days.length > 1 ? (
            <button type="button" className="link-btn small" onClick={() => setDays(days.filter((_, j) => j !== i))}>
              {t("removeDay")}
            </button>
          ) : null}
        </div>
      ))}
      <div className="row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const last = days[days.length - 1]!;
            const next = last.date ? new Date(Date.parse(last.date + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10) : "";
            setDays([...days, { date: next, start: last.start, end: last.end }]);
          }}
        >
          {t("addDay")}
        </button>
      </div>
    </fieldset>
  );
}
