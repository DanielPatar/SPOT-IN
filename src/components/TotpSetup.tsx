"use client";
import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { beginTotpAction, confirmTotpAction } from "@/web/actions/auth";
import { Form, Submit } from "./Form";

export function TotpSetup({ next }: { next: string }) {
  const t = useTranslations("account");
  const [state, begin, pending] = useActionState(beginTotpAction, {});
  const [qr, setQr] = useState<string | null>(null);
  const uri = state.data?.uri as string | undefined;
  useEffect(() => {
    if (uri) QRCode.toDataURL(uri).then(setQr);
  }, [uri]);
  if (!uri) {
    return (
      <form action={begin}>
        {state.error ? <p className="alert alert-error">{state.error}</p> : null}
        <p className="small">{t("twoFactorHelp")}</p>
        <button className="btn btn-secondary" disabled={pending}>
          {t("twoFactorStart")}
        </button>
      </form>
    );
  }
  return (
    <div className="form">
      <p className="small">{t("twoFactorScan")}</p>
      {qr ? <img src={qr} alt={t("twoFactorQrAlt")} width={180} height={180} /> : null}
      <p className="small muted">
        {t("twoFactorSecret")} <code>{String(state.data?.secret)}</code>
      </p>
      <Form action={confirmTotpAction}>
        <input type="hidden" name="next" value={next} />
        <label>
          {t("twoFactorCode")}
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" />
        </label>
        <Submit>{t("twoFactorConfirm")}</Submit>
      </Form>
    </div>
  );
}
