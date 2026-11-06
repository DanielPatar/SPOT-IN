import { addDays, weekdayOf } from "./time";
import { mulDivHalfUp, pct, sum } from "./money";

/**
 * Rate-card pricing shared by the quick estimate (FR-M5-07) and, in Build 2, the quote
 * builder (FR-M12-01). Integer Rupiah, half-up per line (PRD §11.2).
 */
export type RateCard = {
  unit: "hour" | "half_day" | "day";
  weekdayPrice: number;
  weekendPrice: number | null;
  minUnits: number;
  minSpend: number | null;
};
export type Season = { name: string; startDate: string; endDate: string; price: number };
export type AddOn = { id: string; name: string; unit: "per_day" | "per_kva_day" | "per_person" | "per_item"; price: number; taxable: boolean; mandatory: boolean };
export type TaxConfig = { isPkp: boolean; serviceChargeBps: number; ppnRateBps: number; dppNumerator: number; dppDenominator: number };
export type EventDay = { date: string; start: string; end: string };

export type Line = { kind: "rental" | "add_on"; label: string; quantity: number; unitPrice: number; amount: number; taxable: boolean; date?: string };

/** Unit price for one date: a season covering the date wins, then weekend (Sat/Sun), then weekday. */
export function priceForDate(date: string, card: RateCard, seasons: Season[]): { price: number; season?: string } {
  const season = seasons.find((s) => s.startDate <= date && date <= s.endDate);
  if (season) return { price: season.price, season: season.name };
  const wd = weekdayOf(date);
  if ((wd === 0 || wd === 6) && card.weekendPrice != null) return { price: card.weekendPrice };
  return { price: card.weekdayPrice };
}

function hoursOf(day: EventDay): number {
  const [sh, sm] = day.start.split(":").map(Number) as [number, number];
  const [eh, em] = day.end.split(":").map(Number) as [number, number];
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60; // ends next calendar day (§12.1)
  return mins / 60;
}

/** Units to bill for one event day under the card's unit. */
export function unitsForDay(day: EventDay, card: RateCard): number {
  if (card.unit === "day") return 1;
  const h = hoursOf(day);
  const units = card.unit === "hour" ? Math.ceil(h) : Math.ceil(h / 4);
  return Math.max(units, card.minUnits);
}

export function estimate(input: {
  days: EventDay[];
  card: RateCard;
  seasons: Season[];
  addOns: AddOn[];
  selectedAddOnIds: string[];
  quantities?: Record<string, number>; // per_person / per_item quantities, per_kva_day kVA
  tax: TaxConfig;
  fee: { bps: number; min: number; max: number };
}) {
  const lines: Line[] = [];
  for (const day of input.days) {
    const { price, season } = priceForDate(day.date, input.card, input.seasons);
    const qty = unitsForDay(day, input.card);
    lines.push({ kind: "rental", label: season ?? day.date, quantity: qty, unitPrice: price, amount: qty * price, taxable: true, date: day.date });
  }
  let rental = sum(lines.map((l) => l.amount));
  if (input.card.minSpend && rental < input.card.minSpend) {
    lines.push({ kind: "rental", label: "min_spend", quantity: 1, unitPrice: input.card.minSpend - rental, amount: input.card.minSpend - rental, taxable: true });
    rental = input.card.minSpend;
  }
  const nDays = input.days.length;
  for (const a of input.addOns) {
    if (!a.mandatory && !input.selectedAddOnIds.includes(a.id)) continue;
    const q = input.quantities?.[a.id] ?? 1;
    const quantity = a.unit === "per_day" ? nDays : a.unit === "per_kva_day" ? q * nDays : q;
    lines.push({ kind: "add_on", label: a.name, quantity, unitPrice: a.price, amount: quantity * a.price, taxable: a.taxable });
  }
  const rentalAndAddOns = sum(lines.map((l) => l.amount));
  const taxableBase = sum(lines.filter((l) => l.taxable).map((l) => l.amount));
  const serviceCharge = pct(rentalAndAddOns, input.tax.serviceChargeBps);
  // PPN = rate × DPP, DPP = base × 11/12 by default (PRD §11.4): effective 11%.
  const ppn = input.tax.isPkp
    ? mulDivHalfUp(taxableBase + serviceCharge, input.tax.ppnRateBps * input.tax.dppNumerator, 10_000 * input.tax.dppDenominator)
    : 0;
  const venueTotal = rentalAndAddOns + serviceCharge + ppn;
  const fee = Math.min(input.fee.max, Math.max(input.fee.min, pct(rentalAndAddOns, input.fee.bps)));
  return { lines, rentalAndAddOns, serviceCharge, ppn, venueTotal, organizerFee: fee, organizerTotal: venueTotal + fee };
}

/** All dates from a contiguous range, inclusive. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}
