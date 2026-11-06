// Job handler registry; filled in as modules are added.
let registered = false;
export function registerAllJobs(): void {
  if (registered) return;
  registered = true;
}
