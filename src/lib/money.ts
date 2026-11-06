/**
 * Integer Rupiah arithmetic (PRD §11.2). Rates are basis points (1% = 100 bps).
 * Every computation rounds half-up per line; totals are sums of rounded lines.
 */
export function assertRupiah(v: number): number {
  if (!Number.isSafeInteger(v)) throw new Error(`Not an integer Rupiah amount: ${v}`);
  return v;
}

/** round(a * b / c) half-up, for non-negative integers, without floating point error. */
export function mulDivHalfUp(a: number, b: number, c: number): number {
  const A = BigInt(assertRupiah(a));
  const B = BigInt(Math.round(b));
  const C = BigInt(Math.round(c));
  if (C <= 0n) throw new Error("division by non-positive");
  const neg = A * B < 0n;
  const n = (A * B < 0n ? -(A * B) : A * B);
  const q = n / C;
  const r = n % C;
  const rounded = r * 2n >= C ? q + 1n : q;
  return Number(neg ? -rounded : rounded);
}

export function pct(amount: number, bps: number): number {
  return mulDivHalfUp(amount, bps, 10_000);
}

export function sum(values: number[]): number {
  return values.reduce((s, v) => s + assertRupiah(v), 0);
}

/** "Rp 25.000.000" (FR-M25-02) */
export function formatRupiah(v: number | bigint): string {
  const n = typeof v === "bigint" ? v : BigInt(Math.round(v));
  const neg = n < 0n;
  const digits = (neg ? -n : n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "-" : ""}Rp ${digits}`;
}

/** Parses "25.000.000", "Rp 25.000.000" or "25000000" into an integer. */
export function parseRupiah(input: string): number | null {
  const cleaned = input.replace(/rp/i, "").replace(/[.\s]/g, "").replace(/,00$/, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const v = Number(cleaned);
  return Number.isSafeInteger(v) ? v : null;
}
