import { migrate } from "../scripts/migrate";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://spotin@127.0.0.1:5433/spotin_test";
  await migrate(url, { reset: true, quiet: true });
}
