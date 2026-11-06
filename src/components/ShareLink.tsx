"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";

/** FR-M28-13: copy link and a WhatsApp share link (wa.me, no API). */
export function ShareLink({ url, title }: { url: string; title: string }) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2">
      <label className="small">
        {t("link")}
        <input readOnly value={url} data-testid="page-link" onFocus={(e) => e.currentTarget.select()} />
      </label>
      <div className="row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? t("copied") : t("copy")}
        </button>
        <a className="btn btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer">
          {t("whatsapp")}
        </a>
      </div>
      <p className="sr-only" aria-live="polite">{copied ? t("copied") : ""}</p>
    </div>
  );
}
