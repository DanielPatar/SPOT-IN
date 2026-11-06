/**
 * Contact masking in message text before a booking is confirmed (FR-M10-03).
 * Masked: email addresses; Indonesian phone numbers (prefix +62, 62 or 08, 9–13 digits,
 * spaces/dots/dashes allowed); wa.me and api.whatsapp.com links; any run of 10+ digits.
 * Not masked: Rupiah amounts ("Rp …"), areas ("… m²") and dates.
 */
export const MASK = "[kontak disembunyikan]";

const PROTECTED: RegExp[] = [
  /\bRp\.?\s?\d[\d.,]*/gi, // Rupiah amounts
  /\b\d[\d.,]*\s?(?:m²|m2|meter persegi)/gi, // areas
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, // dates 12/12/2026, 12-12-26
  /\b\d{4}-\d{2}-\d{2}\b/g, // ISO dates
];

const WHATSAPP = /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com)\/[^\s)]*/gi;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const PHONE = /(?<![\d+])(?:\+62[\s.-]?|62[\s.-]?|0)8(?:[\s.-]?\d)+/g;
const LONG_DIGITS = /\d{10,}/g;

export function maskContacts(text: string): { text: string; masked: boolean } {
  const saved: string[] = [];
  let s = text;
  for (const re of PROTECTED) {
    s = s.replace(re, (m) => {
      saved.push(m);
      return `\u0000${saved.length - 1}\u0000`;
    });
  }
  let masked = false;
  const mask = () => {
    masked = true;
    return MASK;
  };
  s = s.replace(WHATSAPP, mask);
  s = s.replace(EMAIL, mask);
  s = s.replace(PHONE, (m) => {
    const digits = m.replace(/\D/g, "").length;
    return digits >= 9 && digits <= 13 ? mask() : m;
  });
  s = s.replace(LONG_DIGITS, mask);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => saved[Number(i)] ?? "");
  return { text: s, masked };
}
