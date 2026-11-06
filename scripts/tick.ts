/** Runs all due jobs once (for cron on hosts without a long-running server). */
import { tick } from "../src/lib/jobs";
import { closeDb } from "../src/lib/db";

tick()
  .then((n) => console.log(`processed ${n} job(s)`))
  .finally(() => closeDb());
