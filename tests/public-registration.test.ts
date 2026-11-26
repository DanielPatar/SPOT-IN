import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetData, setNow } from "./helpers";
import { lastLink, makeAdmin, makeVenue, tokenFrom } from "./factories";
import { signUp, verifyEmail, chooseIntent, canSignUp, type Actor } from "@/server/accounts";
import {
  createOrganization,
  inviteMember,
  acceptOrgInvite,
  setApprovalThreshold,
} from "@/server/orgs";
import { requireVerified } from "@/server/access";
import { createEvent, sendEnquiries, enquiryForActor, eventDetail } from "@/server/enquiries";
import { spaceForVenue } from "@/server/listings";
import { NotVerifiedError, PermissionError } from "@/lib/permissions";
import { config, registrationOpen, resetConfigForTests } from "@/lib/config";

/**
 * FR-M38-02 (amended): REGISTRATION_MODE=open lets anyone sign up as an organizer or venue user
 * without a pilot invite. Verification, consent, 18+, server-side permissions and organization
 * isolation must still hold.
 */
const DAYS = [{ date: "2026-12-14", start: "10:00", end: "20:00" }];

async function openSignUp(email: string, name: string): Promise<Actor> {
  const { userId } = await signUp({
    name,
    email,
    password: "password-123456",
    ageConfirmed: true,
    acceptedPilotNotice: true,
  });
  return { userId, ip: "10.0.0.9" };
}

beforeEach(async () => {
  await resetData();
  await setNow(new Date("2026-11-09T02:00:00Z"));
});

afterEach(() => {
  delete process.env.REGISTRATION_MODE;
});

describe("REGISTRATION_MODE", () => {
  it("defaults to invite-only: strangers are refused", async () => {
    delete process.env.REGISTRATION_MODE;
    expect(registrationOpen()).toBe(false);
    expect(await canSignUp("stranger@x.id")).toBe(false);
    await expect(openSignUp("stranger@x.id", "X")).rejects.toMatchObject({
      key: "auth.notInvited",
    });
  });

  it("open: anyone can sign up as an organizer; verification is still required before sending enquiries", async () => {
    process.env.REGISTRATION_MODE = "open";
    const admin = await makeAdmin();
    const venue = await makeVenue(admin, "budi@venue.id");
    const rina = await openSignUp("rina@eo.id", "Rina");
    expect(
      (await db()`select count(*)::int as n from pilot_invites where email = 'rina@eo.id'`)[0]!.n,
    ).toBe(0);
    const consents =
      await db()`select document from consent_records where user_id = ${rina.userId}`;
    expect(consents.map((c) => String(c.document)).sort()).toEqual([
      "pilot_notice",
      "privacy",
      "terms",
    ]);

    await chooseIntent(rina.userId, ["find"]);
    await createOrganization(rina, { kind: "organizer", displayName: "EO Rina" });
    const ev = await createEvent(rina, {
      name: "Expo",
      type: "exhibition",
      category: "tech",
      expectedAttendance: 100,
      days: DAYS,
    });
    await expect(sendEnquiries(rina, ev, [venue.spaceId])).rejects.toBeInstanceOf(NotVerifiedError);
    await verifyEmail(tokenFrom(await lastLink("rina@eo.id")));
    await expect(requireVerified(rina.userId)).resolves.toBeUndefined();
    const ids = await sendEnquiries(rina, ev, [venue.spaceId]);
    expect(ids.length).toBe(1);
  });

  it("open: 18+ and consent are still required", async () => {
    process.env.REGISTRATION_MODE = "open";
    await expect(
      signUp({ name: "A", email: "a@x.id", ageConfirmed: false, acceptedPilotNotice: true }),
    ).rejects.toMatchObject({ key: "errors.ageRequired" });
    await expect(
      signUp({ name: "A", email: "a@x.id", ageConfirmed: true, acceptedPilotNotice: false }),
    ).rejects.toMatchObject({ key: "errors.consentRequired" });
  });

  it("open: a venue manager signs up, creates an operator org and can invite a teammate without a pilot invite", async () => {
    process.env.REGISTRATION_MODE = "open";
    const budi = await openSignUp("budi@mall.id", "Budi");
    await verifyEmail(tokenFrom(await lastLink("budi@mall.id")));
    await chooseIntent(budi.userId, ["list"]);
    const orgId = await createOrganization(budi, {
      kind: "venue_operator",
      displayName: "Mall Baru",
      city: "Bandung",
    });
    await inviteMember(budi, orgId, "staff@mall.id", "staff");
    const inviteToken = tokenFrom(await lastLink("staff@mall.id"));
    const staff = await openSignUp("staff@mall.id", "Staff");
    await acceptOrgInvite(staff, inviteToken);
    const roles =
      await db()`select role from memberships where org_id = ${orgId} and user_id = ${staff.userId}`;
    expect(String(roles[0]!.role)).toBe("staff");
    // Roles are still enforced server-side.
    await expect(setApprovalThreshold(staff, orgId, 1_000_000)).rejects.toBeInstanceOf(
      PermissionError,
    );
  });

  it("open: self-registered users can't reach another organization's data by ID", async () => {
    process.env.REGISTRATION_MODE = "open";
    const admin = await makeAdmin();
    const venue = await makeVenue(admin, "budi@venue.id");
    const rina = await openSignUp("rina@eo.id", "Rina");
    await verifyEmail(tokenFrom(await lastLink("rina@eo.id")));
    await createOrganization(rina, { kind: "organizer", displayName: "EO Rina" });
    const ev = await createEvent(rina, {
      name: "Expo",
      type: "exhibition",
      category: "tech",
      expectedAttendance: 100,
      days: DAYS,
    });
    const [enquiryId] = await sendEnquiries(rina, ev, [venue.spaceId]);

    // A stranger who signs up as both organizer and venue operator.
    const mallory = await openSignUp("mallory@x.id", "Mallory");
    await verifyEmail(tokenFrom(await lastLink("mallory@x.id")));
    await createOrganization(mallory, { kind: "organizer", displayName: "EO M" });
    await createOrganization(mallory, { kind: "venue_operator", displayName: "Venue M" });
    await expect(enquiryForActor(mallory, enquiryId!)).rejects.toBeInstanceOf(PermissionError);
    await expect(eventDetail(mallory, ev)).rejects.toBeInstanceOf(PermissionError);
    await expect(spaceForVenue(mallory, venue.spaceId)).rejects.toBeInstanceOf(PermissionError);
  });

  it("registrationOpen() and config() read REGISTRATION_MODE the same way", () => {
    for (const [value, open] of [
      ["open", true],
      ["Open", true],
      [" open ", true],
      ["invite", false],
      ["", false],
    ] as const) {
      process.env.REGISTRATION_MODE = value;
      resetConfigForTests();
      expect(registrationOpen()).toBe(open);
      expect(config().REGISTRATION_MODE).toBe(open ? "open" : "invite");
    }
    process.env.REGISTRATION_MODE = "opn";
    resetConfigForTests();
    expect(registrationOpen()).toBe(false);
    expect(() => config()).toThrow();
    delete process.env.REGISTRATION_MODE;
    resetConfigForTests();
  });

  it("open: a new Google email is let through to the sign-up page", async () => {
    process.env.REGISTRATION_MODE = "open";
    expect(await canSignUp("new.person@gmail.com")).toBe(true);
  });
});
