/**
 * Roles and permissions (PRD §4.3), enforced server-side on every request (FR-M2-14).
 */
export type OrgKind = "venue_operator" | "organizer";
export type Role = "owner" | "staff" | "viewer" | "member";

export const VENUE_ROLES = ["owner", "staff", "viewer"] as const;
export const ORGANIZER_ROLES = ["owner", "member"] as const;

const VENUE: Record<string, readonly Role[]> = {
  "org.manage": ["owner"], // edit operator profile, invite/remove members, change roles
  "venue.threshold": ["owner"], // approval threshold and cancellation policy
  "listing.edit": ["owner", "staff"], // property, spaces, pricing, submit, publish/unpublish
  "calendar.edit": ["owner", "staff"], // blocks, tentative holds
  "enquiry.view": ["owner", "staff", "viewer"],
  "enquiry.respond": ["owner", "staff"], // respond, message, decline
  "quote.send": ["owner", "staff"],
  "quote.approve": ["owner"],
  "documents.review": ["owner", "staff"],
  "booking.cancel": ["owner"],
  "booking.view": ["owner", "staff", "viewer"],
  "saved_replies.edit": ["owner", "staff"],
};

const ORGANIZER: Record<string, readonly Role[]> = {
  "org.manage": ["owner"],
  "shortlist.edit": ["owner", "member"],
  "event.edit": ["owner", "member"],
  "enquiry.send": ["owner", "member"],
  "enquiry.view": ["owner", "member"],
  "message.send": ["owner", "member"],
  "quote.accept": ["owner", "member"],
  "documents.upload": ["owner", "member"],
  "booking.cancel": ["owner"],
  "booking.view": ["owner", "member"],
  "event_page.edit": ["owner", "member"],
  "attendees.export": ["owner"],
};

export type VenuePermission = keyof typeof VENUE;
export type OrganizerPermission = keyof typeof ORGANIZER;

export function can(kind: OrgKind, role: Role, permission: string): boolean {
  const table = kind === "venue_operator" ? VENUE : ORGANIZER;
  const allowed = table[permission];
  return !!allowed && allowed.includes(role);
}

export function validRole(kind: OrgKind, role: string): role is Role {
  return (kind === "venue_operator" ? (VENUE_ROLES as readonly string[]) : (ORGANIZER_ROLES as readonly string[])).includes(role);
}

/** Thrown for any access to a record outside the user's organizations. Never reveals existence. */
export class PermissionError extends Error {
  constructor() {
    super("permission_denied");
  }
}

export class NotVerifiedError extends Error {
  constructor() {
    super("email_not_verified");
  }
}

/** User-facing validation/business error with a message catalog key. */
export class AppError extends Error {
  constructor(
    public readonly key: string,
    public readonly values: Record<string, string | number> = {},
  ) {
    super(key);
  }
}
