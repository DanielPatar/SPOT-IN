import { registerJob } from "@/lib/jobs";
import { expireHoldJob, holdExpiringJob } from "./calendar";
import { enquiryExpireJob, enquiryReminderJob } from "./enquiries";
import { runDailyAdminReminder } from "./admin";

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
}
