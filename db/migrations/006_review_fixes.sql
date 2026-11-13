-- Review fixes: stuck-job recovery needs to know when a job was claimed.
alter table jobs add column claimed_at timestamptz;
