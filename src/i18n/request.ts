import { getRequestConfig } from "next-intl/server";
import messages from "../../messages/id.json";

// One language in the MVP (FR-M25-01); the catalog makes adding English a data change (FR-M25-05).
export default getRequestConfig(async () => ({
  locale: "id",
  messages,
  timeZone: "Asia/Jakarta",
}));
