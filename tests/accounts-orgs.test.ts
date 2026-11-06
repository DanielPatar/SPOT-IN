import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetData, setNow } from "./helpers";
import { ADMIN_EMAIL, lastLink, makeAdmin, makeUser, tokenFrom, makeOrganizer, makeVenue } from "./factories";
import {
  signUp, verifyEmail, login, createSession, resolveSession, revokeSession, listSessions, requestPasswordReset, resetPassword,
  requestMagicLink, consumeMagicLink, chooseIntent, setSessionContext, deleteAccount, exportUserData, quickAttendee, updateProfile,
  beginTotpEnrolment, confirmTotpEnrolment,
} from "@/server/accounts";
import { inviteMember, acceptOrgInvite, changeRole, removeMember, revokeInvite, inviteByToken, setApprovalThreshold, orgMembers, createOrganization } from "@/server/orgs";
import { requireVerified } from "@/server/access";
import { sendEnquiries, createEvent } from "@/server/enquiries";
import { invitePilotUser } from "@/server/admin";
import { AppError, NotVerifiedError, PermissionError } from "@/lib/permissions";
import { spaceForVenue } from "@/server/listings";
import { generate } from "otplib";

beforeEach(async () => {
  await resetData();
  await setNow(new Date("2026-11-09T02:00:00Z")); // Monday 09:00 WIB
});

describe("M1 accounts", () => {
  it("AC-M1-1 / AC-M38-2: invite-only sign-up and verification gate", async () => {
    const admin = await makeAdmin();
    await expect(signUp({ name: "X", email: "stranger@x.id", password: "password-123456", ageConfirmed: true, acceptedPilotNotice: true })).rejects.toMatchObject({ key: "auth.notInvited" });
    expect((await db()`select count(*)::int as n from users where email = 'stranger@x.id'`)[0]!.n).toBe(0);

    await invitePilotUser(admin, "rina@eo.id", "organizer");
    expect(await lastLink("rina@eo.id")).toContain("/daftar?email=rina%40eo.id");
    const { userId } = await signUp({ name: "Rina", email: "rina@eo.id", password: "password-123456", ageConfirmed: true, acceptedPilotNotice: true });
    await expect(requireVerified(userId)).rejects.toBeInstanceOf(NotVerifiedError);
    await createOrganization({ userId }, { kind: "organizer", displayName: "EO" });
    const eventId = await createEvent({ userId }, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: [{ date: "2026-12-14", start: "10:00", end: "20:00" }] });
    await expect(sendEnquiries({ userId }, eventId, [])).rejects.toBeInstanceOf(NotVerifiedError);
    await verifyEmail(tokenFrom(await lastLink("rina@eo.id")));
    await expect(requireVerified(userId)).resolves.toBeUndefined();
  });

  it("AC-M1-7 / AC-M38-3: consent records with versions; 18+ required", async () => {
    const admin = await makeAdmin();
    await invitePilotUser(admin, "budi@venue.id", "venue");
    await expect(signUp({ name: "B", email: "budi@venue.id", ageConfirmed: false, acceptedPilotNotice: true })).rejects.toMatchObject({ key: "errors.ageRequired" });
    await expect(signUp({ name: "B", email: "budi@venue.id", ageConfirmed: true, acceptedPilotNotice: false })).rejects.toMatchObject({ key: "errors.consentRequired" });
    const { userId } = await signUp({ name: "B", email: "budi@venue.id", ageConfirmed: true, acceptedPilotNotice: true });
    const consents = await db()`select document, version from consent_records where user_id = ${userId} order by document`;
    expect(consents.map((c) => c.document)).toEqual(["pilot_notice", "privacy", "terms"]);
    expect(consents.every((c) => String(c.version).length > 0)).toBe(true);
    expect((await db()`select is_18_plus_confirmed from users where id = ${userId}`)[0]!.is_18_plus_confirmed).toBe(true);
    void admin;
  });

  it("AC-M1-3: revoke a session, reset password by email, idle timeout", async () => {
    const admin = await makeAdmin();
    const u = await makeUser(admin, "rina@eo.id");
    const a = await createSession(u.userId, { userAgent: "laptop" });
    const b = await createSession(u.userId, { userAgent: "phone" });
    const sb = await resolveSession(b);
    await revokeSession(u.userId, sb!.sessionId);
    expect(await resolveSession(b)).toBeNull();
    expect(await resolveSession(a)).not.toBeNull();
    expect((await listSessions(u.userId)).length).toBe(1);

    await requestPasswordReset("rina@eo.id");
    await resetPassword(tokenFrom(await lastLink("rina@eo.id")), "new-password-999");
    expect(await resolveSession(a)).toBeNull(); // all sessions revoked
    await expect(login({ email: "rina@eo.id", password: "password-123456" })).rejects.toBeInstanceOf(AppError);
    await expect(login({ email: "rina@eo.id", password: "new-password-999" })).resolves.toBe(u.userId);

    const c = await createSession(u.userId, {});
    await setNow(new Date("2026-12-10T02:00:00Z")); // 31 days later
    expect(await resolveSession(c)).toBeNull();
  });

  it("FR-M1-01: magic-link login verifies the email and does not reveal unknown addresses", async () => {
    const admin = await makeAdmin();
    await invitePilotUser(admin, "sari@komunitas.id", "organizer");
    const { userId } = await signUp({ name: "Sari", email: "sari@komunitas.id", ageConfirmed: true, acceptedPilotNotice: true });
    await requestMagicLink("unknown@x.id"); // no error
    await requestMagicLink("sari@komunitas.id");
    const r = await consumeMagicLink(tokenFrom(await lastLink("sari@komunitas.id")));
    expect(r.userId).toBe(userId);
    await expect(requireVerified(userId)).resolves.toBeUndefined();
    await expect(consumeMagicLink(tokenFrom(await lastLink("sari@komunitas.id")))).rejects.toMatchObject({ key: "auth.tokenInvalid" });
  });

  it("AC-M1-2 (service part): TOTP enrolment for the Admin", async () => {
    const admin = await makeAdmin();
    const token = await createSession(admin.userId, {});
    const s = await resolveSession(token);
    expect(s!.isAdmin && !s!.twoFactorEnabled).toBe(true);
    const { secret } = await beginTotpEnrolment(admin.userId);
    await expect(confirmTotpEnrolment(admin.userId, s!.sessionId, "000000")).rejects.toMatchObject({ key: "auth.totpInvalid" });
    await confirmTotpEnrolment(admin.userId, s!.sessionId, await generate({ secret }));
    const s2 = await resolveSession(token);
    expect(s2!.twoFactorEnabled && s2!.twoFactorPassed).toBe(true);
  });

  it("AC-M1-5: intent chooser and context switcher", async () => {
    const admin = await makeAdmin();
    const u = await makeUser(admin, "hendra@hall.id");
    await chooseIntent(u.userId, ["find", "list"]);
    await createOrganization(u, { kind: "venue_operator", displayName: "Hall Hendra" });
    await createOrganization(u, { kind: "organizer", displayName: "Hendra Events" });
    const token = await createSession(u.userId, {});
    let s = await resolveSession(token);
    expect(s!.intentChosen).toBe(true);
    expect(s!.context).toBe("organizer");
    await setSessionContext(u.userId, s!.sessionId, "venue");
    s = await resolveSession(token);
    expect(s!.context).toBe("venue");
  });

  it("AC-M1-8 / FR-M1-10: quick attendee account without a password", async () => {
    const r = await quickAttendee({ name: "Maya", email: "maya@mail.id", ageConfirmed: true, acceptedPilotNotice: true });
    expect(r.created).toBe(true);
    const [u] = await db()`select password_hash, is_quick_attendee, email_verified_at from users where id = ${r.userId}`;
    expect(u!.password_hash).toBeNull();
    expect(u!.is_quick_attendee).toBe(true);
    const out = await consumeMagicLink(tokenFrom(await lastLink("maya@mail.id")));
    expect(out.userId).toBe(r.userId);
    expect((await db()`select email_verified_at from users where id = ${r.userId}`)[0]!.email_verified_at).not.toBeNull();
  });

  it("FR-M1-08 / AC-M38-5 (no active booking case): delete erases personal fields; export returns JSON", async () => {
    const admin = await makeAdmin();
    const u = await makeUser(admin, "rina@eo.id");
    await updateProfile(u.userId, { name: "Rina", phone: "0812 3456 7890" });
    const data = await exportUserData(u.userId);
    expect((data.user as { email: string }).email).toBe("rina@eo.id");
    expect(JSON.parse(JSON.stringify(data)).consents.length).toBe(3);
    await deleteAccount(u.userId);
    const [row] = await db()`select name, email, phone, status, password_hash from users where id = ${u.userId}`;
    expect(row).toMatchObject({ name: "", phone: null, status: "deleted", password_hash: null });
    expect(String(row!.email)).not.toContain("rina");
  });
});

describe("M2 organizations and roles", () => {
  it("AC-M2-1: roles enforced server-side; another org's record is a permission error", async () => {
    const admin = await makeAdmin();
    const venue = await makeVenue(admin, "budi@venue.id");
    const staff = await makeUser(admin, "staff@venue.id");
    await inviteMember(venue.owner, venue.orgId, "staff@venue.id", "staff");
    await acceptOrgInvite(staff, tokenFrom(await lastLink("staff@venue.id")));
    await expect(inviteMember(staff, venue.orgId, "x@y.id", "staff")).rejects.toBeInstanceOf(PermissionError);
    await expect(setApprovalThreshold(staff, venue.orgId, 50_000_000)).rejects.toBeInstanceOf(PermissionError);
    const other = await makeVenue(admin, "other@venue.id", { name: "Mall B", spaceName: "Atrium B" });
    await expect(spaceForVenue(venue.owner, other.spaceId)).rejects.toBeInstanceOf(PermissionError);
    await expect(spaceForVenue(venue.owner, "00000000-0000-0000-0000-000000000000")).rejects.toBeInstanceOf(PermissionError);
  });

  it("AC-M2-2: no NPWP/NIB fields exist on organizations", async () => {
    const cols = await db()`select column_name from information_schema.columns where table_name = 'organizations'`;
    const names = cols.map((c) => String(c.column_name));
    for (const f of ["display_name", "legal_name", "logo_file_id", "city", "contact_email"]) expect(names).toContain(f);
    expect(names.some((n) => /npwp|nib|nik/i.test(n))).toBe(false);
  });

  it("AC-M2-3: invites expire after 7 days, can be resent and revoked", async () => {
    const admin = await makeAdmin();
    const venue = await makeVenue(admin, "budi@venue.id");
    await makeUser(admin, "staff@venue.id");
    await inviteMember(venue.owner, venue.orgId, "staff@venue.id", "staff");
    const token = tokenFrom(await lastLink("staff@venue.id"));
    await setNow(new Date("2026-11-17T03:00:00Z")); // 8 days later
    expect((await inviteByToken(token))!.state).toBe("expired");
    const [inv] = await db()`select id from org_invites where email = 'staff@venue.id'`;
    const { resendInvite } = await import("@/server/orgs");
    await resendInvite(venue.owner, venue.orgId, String(inv!.id));
    const fresh = tokenFrom(await lastLink("staff@venue.id"));
    expect((await inviteByToken(fresh))!.state).toBe("open");
    const [inv2] = await db()`select id from org_invites where email = 'staff@venue.id' and revoked_at is null and accepted_at is null`;
    await revokeInvite(venue.owner, venue.orgId, String(inv2!.id));
    expect((await inviteByToken(fresh))!.state).toBe("revoked");
  });

  it("FR-M38-02: inviting an email that is not on the pilot list is refused and the Admin is told", async () => {
    const admin = await makeAdmin();
    const venue = await makeVenue(admin, "budi@venue.id");
    await expect(inviteMember(venue.owner, venue.orgId, "new@venue.id", "staff")).rejects.toMatchObject({ key: "orgs.inviteeNotOnPilotList" });
    const n = await db()`select 1 from notifications where user_id = ${admin.userId} and event = 'admin_invite_needed'`;
    expect(n.length).toBe(1);
    void ADMIN_EMAIL;
  });

  it("AC-M2-5: the last Owner can't demote themselves; ownership transfer works", async () => {
    const admin = await makeAdmin();
    const { owner, orgId } = await makeOrganizer(admin, "rina@eo.id");
    await expect(changeRole(owner, orgId, owner.userId, "member")).rejects.toMatchObject({ key: "orgs.lastOwner" });
    const member = await makeUser(admin, "andi@eo.id");
    await inviteMember(owner, orgId, "andi@eo.id", "member");
    await acceptOrgInvite(member, tokenFrom(await lastLink("andi@eo.id")));
    const { transferOwnership } = await import("@/server/orgs");
    await transferOwnership(owner, orgId, member.userId);
    const roles = await db()`select user_id, role from memberships where org_id = ${orgId}`;
    expect(roles.find((r) => r.user_id === member.userId)!.role).toBe("owner");
    expect(roles.find((r) => r.user_id === owner.userId)!.role).toBe("member");
  });

  it("AC-M2-6: removing a member requires a reassignee; logged in the org audit log", async () => {
    const admin = await makeAdmin();
    const { owner, orgId } = await makeOrganizer(admin, "rina@eo.id");
    const member = await makeUser(admin, "andi@eo.id");
    await inviteMember(owner, orgId, "andi@eo.id", "member");
    await acceptOrgInvite(member, tokenFrom(await lastLink("andi@eo.id")));
    const eventId = await createEvent(member, { name: "Bazar", type: "bazaar", category: "food", expectedAttendance: 50, days: [{ date: "2026-12-14", start: "10:00", end: "18:00" }] });
    await expect(removeMember(owner, orgId, member.userId, "")).rejects.toMatchObject({ key: "orgs.reassigneeRequired" });
    await removeMember(owner, orgId, member.userId, owner.userId);
    expect((await db()`select created_by from events where id = ${eventId}`)[0]!.created_by).toBe(owner.userId);
    const { log } = await orgMembers(owner, orgId);
    expect(log.map((l) => l.action)).toContain("member.removed");
    expect(log.map((l) => l.action)).toContain("member.invited");
  });
});
