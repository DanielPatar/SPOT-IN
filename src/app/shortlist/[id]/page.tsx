import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { absoluteUrl } from "@/server/notify";
import { PermissionError } from "@/lib/permissions";
import { requireOrganizerPage, coverUrl, rp } from "@/web/view";
import { shortlistDetail } from "@/server/search";
import { Form, Submit } from "@/components/Form";
import { shareLinkAction, shortlistItemAction, deleteShortlistAction } from "@/web/actions/organizer";

export default async function ShortlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireOrganizerPage(`/shortlist/${id}`);
  let d;
  try {
    d = await shortlistDetail({ userId: session.userId }, id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  return (
    <div>
      <div className="spread">
        <h1>{String(d.list.name)}</h1>
        <form action={deleteShortlistAction}>
          <input type="hidden" name="shortlistId" value={id} />
          <button className="link-btn small">{t("shortlist.delete")}</button>
        </form>
      </div>
      <div className="cols">
        <form className="card" action="/acara/kirim" method="get">
          <h2 style={{ marginTop: 0 }}>{t("shortlist.spaces")}</h2>
          {d.items.length === 0 ? <p className="muted">{t("shortlist.emptyList")}</p> : null}
          {d.items.map((i) => {
            const img = coverUrl(i.media);
            return (
              <div key={String(i.id)} className="row" style={{ marginBottom: 12, alignItems: "flex-start" }}>
                <input type="checkbox" name="spaces" value={String(i.id)} defaultChecked={i.status === "published"} disabled={i.status !== "published"} aria-label={t("shortlist.select", { name: String(i.name) })} />
                <div style={{ width: 120 }}>{img ? <img className="thumb" src={img} alt="" /> : <div className="thumb-empty" />}</div>
                <div style={{ flex: 1 }}>
                  <Link href={`/ruang/${i.id}`}>
                    <strong>{String(i.name)}</strong>
                  </Link>
                  <div className="small muted">
                    {String(i.property_name)} · {String(i.city)} · {t("spaces.fromPrice", { price: rp(i.from_price) })}
                  </div>
                  {i.note ? <div className="small">{String(i.note)}</div> : null}
                </div>
              </div>
            );
          })}
          {d.items.length ? <button className="btn btn-primary">{t("shortlist.enquireSelected")}</button> : null}
        </form>
        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("shortlist.share")}</h2>
            <p className="small muted">{t("shortlist.shareHelp")}</p>
            {d.links.map((l) => (
              <Form action={shareLinkAction} key={String(l.id)}>
                <input type="hidden" name="shortlistId" value={id} />
                <input type="hidden" name="linkId" value={String(l.id)} />
                <input readOnly value={absoluteUrl(`/s/${l.token}`)} aria-label={t("shortlist.link")} data-testid="share-link" />
                <Submit name="op" value="revoke" variant="secondary">{t("shortlist.revoke")}</Submit>
              </Form>
            ))}
            <Form action={shareLinkAction}>
              <input type="hidden" name="shortlistId" value={id} />
              <Submit name="op" value="create" variant="secondary">{t("shortlist.createLink")}</Submit>
            </Form>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("shortlist.notes")}</h2>
            {d.items.map((i) => (
              <form key={String(i.id)} action={shortlistItemAction} className="form-inline small" style={{ marginBottom: 6 }}>
                <input type="hidden" name="shortlistId" value={id} />
                <input type="hidden" name="spaceId" value={String(i.id)} />
                <label style={{ flex: 1 }}>
                  {String(i.name)}
                  <input name="note" defaultValue={String(i.note ?? "")} />
                </label>
                <button className="btn btn-secondary" name="op" value="note">
                  {t("common.save")}
                </button>
                <button className="link-btn" name="op" value="remove">
                  {t("common.remove")}
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
