import { mulDivHalfUp, pct, sum } from "./money";
import { addDays, localDate, zonedInstant } from "./time";

/**
 * Quote totals and payment schedule (PRD §11.2, FR-M12-01, FR-M12-02, FR-M15-09).
 * Integer Rupiah, half-up per line; totals are sums of rounded lines.
 */
export type QuoteLine = {
  id: string;
  kind: "rental" | "add_on" | "custom";
  label: string;
  quantity: number;
  unitPrice: number;
  discount: number; // Rupiah off this line
  taxable: boolean;
  amount?: number;
};

export type PricingSnapshot = {
  isPkp: boolean;
  serviceChargeBps: number;
  ppnRateBps: number;
  dppNumerator: number;
  dppDenominator: number;
  feeBps: number;
  feeMin: number;
  feeMax: number;
  commissionBps: number;
};

export type QuoteTotals = {
  rentalAndAddOns: number;
  serviceCharge: number;
  ppn: number;
  venueTotal: number;
  organizerFee: number;
  organizerTotal: number;
};

export function lineAmount(l: QuoteLine): number {
  const gross = mulDivHalfUp(l.unitPrice, Math.round(l.quantity * 100), 100);
  return Math.max(0, gross - Math.max(0, Math.round(l.discount || 0)));
}

export function quoteTotals(lines: QuoteLine[], p: PricingSnapshot): QuoteTotals {
  const amounts = lines.map(lineAmount);
  const rentalAndAddOns = sum(amounts);
  const taxable = sum(lines.map((l, i) => (l.taxable ? amounts[i]! : 0)));
  const serviceCharge = pct(rentalAndAddOns, p.serviceChargeBps);
  const ppn = p.isPkp ? mulDivHalfUp(taxable + serviceCharge, p.ppnRateBps * p.dppNumerator, 10_000 * p.dppDenominator) : 0;
  const venueTotal = rentalAndAddOns + serviceCharge + ppn;
  const organizerFee = rentalAndAddOns === 0 ? 0 : Math.min(p.feeMax, Math.max(p.feeMin, pct(rentalAndAddOns, p.feeBps)));
  return { rentalAndAddOns, serviceCharge, ppn, venueTotal, organizerFee, organizerTotal: venueTotal + organizerFee };
}

export type PaymentSchedule = { mode: "split" | "full"; depositBps: number; depositDays: number; balanceDaysBefore: number };

export type ScheduledPayment = { kind: "deposit" | "balance" | "full"; amount: number; venuePart: number; feePart: number; dueAt: Date; issueAt: Date };

/**
 * Deposit due N days after acceptance (23:59 property time); balance due N days before the
 * event start; the balance request is issued 7 days before its due date, or immediately if
 * that moment has passed. If acceptance falls inside the balance window, one full payment is
 * due at acceptance (+ deposit days).
 */
export function paymentPlan(args: { totals: QuoteTotals; schedule: PaymentSchedule; acceptedAt: Date; firstEventDate: string; tz: string }): ScheduledPayment[] {
  const { totals, schedule, acceptedAt, firstEventDate, tz } = args;
  const depositDue = zonedInstant(addDays(localDate(acceptedAt, tz), schedule.depositDays), "23:59", tz);
  const balanceDue = zonedInstant(addDays(firstEventDate, -schedule.balanceDaysBefore), "23:59", tz);
  if (schedule.mode === "full" || acceptedAt >= balanceDue || depositDue >= balanceDue) {
    return [{ kind: "full", amount: totals.organizerTotal, venuePart: totals.venueTotal, feePart: totals.organizerFee, dueAt: depositDue, issueAt: acceptedAt }];
  }
  const venueDeposit = pct(totals.venueTotal, schedule.depositBps);
  // Issued at the start of the day 7 days before the due date (e.g. due 28 Nov → issued 21 Nov).
  const issue = zonedInstant(addDays(addDays(firstEventDate, -schedule.balanceDaysBefore), -7), "00:00", tz);
  return [
    { kind: "deposit", amount: venueDeposit + totals.organizerFee, venuePart: venueDeposit, feePart: totals.organizerFee, dueAt: depositDue, issueAt: acceptedAt },
    { kind: "balance", amount: totals.venueTotal - venueDeposit, venuePart: totals.venueTotal - venueDeposit, feePart: 0, dueAt: balanceDue, issueAt: issue > acceptedAt ? issue : acceptedAt },
  ];
}

export function validateSchedule(s: PaymentSchedule, minDepositBps: number): string | null {
  if (s.mode === "full") return null;
  if (!Number.isInteger(s.depositBps) || s.depositBps < minDepositBps || s.depositBps >= 10_000) return "quotes.depositInvalid";
  if (!Number.isInteger(s.depositDays) || s.depositDays < 1 || s.depositDays > 7) return "quotes.depositDaysInvalid";
  if (!Number.isInteger(s.balanceDaysBefore) || s.balanceDaysBefore < 3) return "quotes.balanceTooClose";
  return null;
}
