import { createTranslator } from "next-intl";
import messages from "../../messages/id.json";

/**
 * Server-side translator for the single Bahasa Indonesia catalog (FR-M25-01, FR-M25-05).
 * Missing keys throw in tests so every string is guaranteed to exist in the catalog.
 */
const translator = createTranslator({
  locale: "id",
  messages,
  onError(error) {
    if (process.env.APP_ENV === "test") throw error;
    console.error("[i18n]", error.message);
  },
  getMessageFallback: ({ namespace, key }) => [namespace, key].filter(Boolean).join("."),
});

export type TValues = Record<string, string | number | Date>;

export function t(key: string, values?: TValues): string {
  return (translator as unknown as (k: string, v?: TValues) => string)(key, values);
}

export function hasMessage(key: string): boolean {
  return (translator as unknown as { has: (k: string) => boolean }).has(key);
}

export { messages };
