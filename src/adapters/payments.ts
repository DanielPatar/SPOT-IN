import { randomUUID } from "node:crypto";
import { config } from "@/lib/config";
import { hmac, safeEqual } from "@/lib/tokens";

/**
 * Payment adapter (FR-M14-12). All payment calls go through this interface, so a real
 * provider (Xendit test mode, then live in Phase 2) replaces only the adapter. In the
 * pilot only test-mode keys are accepted (the config guard refuses live keys, FR-M14-13);
 * without test-mode access the built-in simulator below is used. It produces the same
 * states (pending, paid, expired, failed) and signed callbacks as a provider would.
 */
export type Method = "test_va" | "test_qris" | "test_ewallet" | "test_card";
export type ChargeRequest = { reference: string; amount: number; method: Method; expiresAt: Date; description: string };
export type Charge = { provider: string; providerRef: string; status: "pending"; instructions: Record<string, string> };
export type CallbackPayload = { eventId: string; providerRef: string; status: "paid" | "expired" | "failed"; amount: number; failureReason?: string; at: string };

export interface PaymentProvider {
  readonly name: string;
  createCharge(req: ChargeRequest): Promise<Charge>;
}

class Simulator implements PaymentProvider {
  readonly name = "simulator";
  async createCharge(req: ChargeRequest): Promise<Charge> {
    const providerRef = `SIM-${randomUUID()}`;
    const instructions: Record<string, string> =
      req.method === "test_va"
        ? { bank: "Bank Uji", vaNumber: `8808${String(Math.floor(Math.random() * 1e10)).padStart(10, "0")}` }
        : req.method === "test_qris"
          ? { qrString: `TEST-QRIS-${providerRef.slice(4, 16)}` }
          : req.method === "test_ewallet"
            ? { wallet: "Dompet Uji" }
            : { cardHint: "4000 0000 0000 0002" };
    return { provider: this.name, providerRef, status: "pending", instructions };
  }
}

let provider: PaymentProvider | undefined;
export function payments(): PaymentProvider {
  // A test-mode Xendit adapter would be selected here when XENDIT_SECRET_KEY is set.
  provider ??= new Simulator();
  return provider;
}

/** Signs a provider callback; verified by the webhook handler (PRD §10 integration principles). */
export function signCallback(payload: CallbackPayload): string {
  return hmac(`payments:${JSON.stringify(payload)}`);
}

export function verifyCallback(payload: CallbackPayload, signature: string): boolean {
  return safeEqual(signCallback(payload), signature);
}

/** Builds the callback the simulator "sends" when the tester completes or fails a test payment. */
export function simulatedCallback(providerRef: string, amount: number, status: CallbackPayload["status"], at: Date, failureReason?: string): { payload: CallbackPayload; signature: string } {
  const payload: CallbackPayload = { eventId: `evt-${randomUUID()}`, providerRef, status, amount, failureReason, at: at.toISOString() };
  return { payload, signature: signCallback(payload) };
}

export function isTestMode(): boolean {
  const key = config().XENDIT_SECRET_KEY;
  return !key || key.startsWith("xnd_development_");
}
