export type MoneyCents = number;

export const ZERO_CENTS: MoneyCents = 0;

export function toCents(amount: number): MoneyCents {
  if (!Number.isFinite(amount)) {
    throw new TypeError('Money amount must be a finite number.');
  }

  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromCents(cents: MoneyCents): number {
  if (!Number.isSafeInteger(cents)) {
    throw new TypeError('Money cents must be a safe integer.');
  }

  return cents / 100;
}
