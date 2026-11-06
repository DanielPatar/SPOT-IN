import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { orgMembers } from "@/server/orgs";
import { Form, Submit } from "@/components/Form";
import { inviteMemberAction, teamAction } from "@/web/actions/venue";
import type { Membership } from "@/server/access";

/** Members, invites, roles, removal with reassignment and the org audit log (FR-M2-03..10). */
export async function TeamPanel({ userId, m, path }: { userId: string; m: Membership; path: string }) {
  if (m.role !== "owner") return <p className="alert alert-warn">{t("errors.permissionDenied")}</p>;
  const { members, invites, log } = await orgMembers({ userId }, m.orgId);
  const roles = m.kind === "venue_operator" ? ["owner", "staff", "viewer"] : ["owner", "member"];
  const owners = members.filter((x) => x.role === "owner");
  return (
    <div className="cols">
      <div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("team.members")}</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {members.map((x) => (
                  <tr key={String(x.id)}>
                    <td>
                      {String(x.name)}
                      <div className="small muted">{String(x.email)}</div>
                    </td>
                    <td>
                      <Form action={teamAction} className="form-inline">
                        <input type="hidden" name="orgId" value={m.orgId} />
                        <input type="hidden" name="userId" value={String(x.id)} />
                        <input type="hidden" name="path" value={path} />
                        <input type="hidden" name="op" value="role" />
                        <select name="role" defaultValue={String(x.role)} aria-label={t("team.role")}>
                          {roles.map((r) => (
                            <option key={r} value={r}>
                              {t(`roles.${r}`)}
                            </option>
                          ))}
                        </select>
                        <Submit variant="secondary">{t("team.changeRole")}</Submit>
                      </Form>
                    </td>
                    <td>
                      {x.id !== userId ? (
                        <Form action={teamAction} className="form-inline">
                          <input type="hidden" name="orgId" value={m.orgId} />
                          <input type="hidden" name="userId" value={String(x.id)} />
                          <input type="hidden" name="path" value={path} />
                          <label className="small">
                            {t("team.reassignTo")}
                            <select name="reassignTo" defaultValue={String(owners[0]?.id ?? userId)}>
                              {members
                                .filter((y) => y.id !== x.id)
                                .map((y) => (
                                  <option key={String(y.id)} value={String(y.id)}>
                                    {String(y.name)}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <Submit name="op" value="remove" variant="danger">{t("team.remove")}</Submit>
                          <Submit name="op" value="transfer" variant="secondary">{t("team.makeOwner")}</Submit>
                        </Form>
                      ) : (
                        <span className="small muted">{t("team.you")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("team.audit")}</h2>
          <ul className="small">
            {log.map((l, i) => (
              <li key={i}>
                {formatDateTime(l.at as Date, "Asia/Jakarta")} · {String(l.actor ?? "—")} · {t(`team.actions.${String(l.action).replace(".", "_")}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("team.invite")}</h2>
          <Form action={inviteMemberAction} resetOnOk>
            <input type="hidden" name="orgId" value={m.orgId} />
            <input type="hidden" name="path" value={path} />
            <label>
              {t("fields.email")}
              <input type="email" name="email" required />
            </label>
            <label>
              {t("team.role")}
              <select name="role" defaultValue={roles[1]}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </select>
            </label>
            <Submit>{t("team.sendInvite")}</Submit>
          </Form>
          <h3>{t("team.pending")}</h3>
          {invites.length === 0 ? <p className="muted small">{t("team.noInvites")}</p> : null}
          {invites.map((i) => (
            <Form action={teamAction} className="form-inline small" key={String(i.id)}>
              <input type="hidden" name="orgId" value={m.orgId} />
              <input type="hidden" name="inviteId" value={String(i.id)} />
              <input type="hidden" name="path" value={path} />
              <span>
                {String(i.email)} · {t(`roles.${String(i.role)}`)} · {t("team.expires", { at: formatDateTime(i.expires_at as Date, "Asia/Jakarta") })}
              </span>
              <Submit name="op" value="resend" variant="secondary">{t("team.resend")}</Submit>
              <Submit name="op" value="revoke" variant="secondary">{t("team.revoke")}</Submit>
            </Form>
          ))}
        </div>
      </div>
    </div>
  );
}
