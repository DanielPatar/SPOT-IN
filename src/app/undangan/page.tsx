import { t } from "@/lib/i18n";
import { Form, Submit } from "@/components/Form";
import { acceptInviteAction } from "@/web/actions/auth";
import { inviteByToken } from "@/server/orgs";
import { getSession } from "@/web/session";
import Link from "next/link";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const inv = await inviteByToken(token);
  const s = await getSession();
  return (
    <div className="narrow card">
      <h1>{t("invite.title")}</h1>
      {!inv || inv.state === "revoked" ? <p className="alert alert-error">{t("orgs.inviteInvalid")}</p> : null}
      {inv?.state === "expired" ? <p className="alert alert-error">{t("orgs.inviteExpired")}</p> : null}
      {inv?.state === "accepted" ? <p className="alert alert-ok">{t("invite.alreadyAccepted")}</p> : null}
      {inv?.state === "open" ? (
        <>
          <p>{t("invite.body", { org: String(inv.display_name), role: t(`roles.${String(inv.role)}`) })}</p>
          {s ? (
            <Form action={acceptInviteAction}>
              <input type="hidden" name="token" value={token} />
              <Submit>{t("invite.accept")}</Submit>
            </Form>
          ) : (
            <p>
              <Link href={`/masuk?next=${encodeURIComponent(`/undangan?token=${token}`)}`}>{t("invite.loginFirst")}</Link> ·{" "}
              <Link href={`/daftar?email=${encodeURIComponent(String(inv.email))}`}>{t("invite.signUpFirst")}</Link>
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
