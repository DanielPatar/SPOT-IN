import { registerJob } from "@/lib/jobs";
import { expireHoldJob, holdExpiringJob } from "./calendar";
import { enquiryExpireJob, enquiryReminderJob } from "./enquiries";
import { runDailyAdminReminder } from "./admin";
import { expireQuoteJob } from "./quotes";
import { balanceIssueJob, balanceMissedJob, depositDeadlineJob, generateAgreement, paymentReminderJob } from "./bookings";

/** Job handler registry. Every handler runs on the application clock (FR-M38-10). */
let registered = false;
export function registerAllJobs(): void {
  if (registered) return;
  registered = true;
  registerJob("hold.expire", (p) => expireHoldJob(String(p.enquiryId)));
  registerJob("hold.expiring", (p) => holdExpiringJob(String(p.enquiryId)));
  registerJob("enquiry.reminder", (p) => enquiryReminderJob(String(p.enquiryId), Number(p.hours)));
  registerJob("enquiry.expire", (p, ctx) => enquiryExpireJob(String(p.enquiryId), ctx.now));
  registerJob("admin.daily_reminder", (_p, ctx) => runDailyAdminReminder(ctx.now));
  registerJob("quote.expire", (p, ctx) => expireQuoteJob(String(p.quoteId), ctx.now));
  registerJob("agreement.generate", (p) => generateAgreement(String(p.bookingId)));
  registerJob("booking.deposit_deadline", (p, ctx) => depositDeadlineJob(String(p.bookingId), ctx.now));
  registerJob("booking.payment_reminder", (p) => paymentReminderJob(String(p.bookingId), String(p.kind)));
  registerJob("booking.balance_issue", (p, ctx) => balanceIssueJob(String(p.bookingId), ctx.now));
  registerJob("booking.readiness", (p) => import("./lifecycle").then((m) => m.readinessJob(String(p.bookingId), Number(p.days))));
  registerJob("booking.event_start", (p) => import("./lifecycle").then((m) => m.eventStartJob(String(p.bookingId))));
  registerJob("booking.event_end", (p) => import("./lifecycle").then((m) => m.eventEndJob(String(p.bookingId))));
  registerJob("booking.release", (p) => import("./lifecycle").then((m) => m.releaseJob(String(p.bookingId))));
  registerJob("event_page.close", (p) => import("./event-pages").then((m) => m.closePageJob(String(p.pageId))));
  registerJob("event_page.end", (p) => import("./event-pages").then((m) => m.endPageJob(String(p.pageId))));
  registerJob("registration.expire", (p, ctx) => import("./event-pages").then((m) => m.expireRegistrationJob(String(p.registrationId), ctx.now)));
  registerJob("booking.balance_missed", (p, ctx) => balanceMissedJob(String(p.bookingId), ctx.now));
}
