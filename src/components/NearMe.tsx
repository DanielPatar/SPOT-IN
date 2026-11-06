"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** FR-M7-13: browser location is used only after the user allows it; otherwise the city filter is used. */
export function NearMe() {
  const t = useTranslations("search");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={(e) => {
          const form = (e.currentTarget as HTMLButtonElement).form!;
          if (!navigator.geolocation) return setMsg(t("nearMeUnavailable"));
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              (form.elements.namedItem("lat") as HTMLInputElement).value = String(pos.coords.latitude);
              (form.elements.namedItem("lon") as HTMLInputElement).value = String(pos.coords.longitude);
              (form.elements.namedItem("sort") as HTMLSelectElement).value = "distance";
              form.requestSubmit();
            },
            () => setMsg(t("nearMeDenied")),
            { timeout: 10000 },
          );
        }}
      >
        {t("nearMe")}
      </button>
      {msg ? <span className="small muted">{msg}</span> : null}
    </>
  );
}
