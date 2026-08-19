import { describe, expect, it } from 'vitest';
import { fromCents, toCents } from './money';

describe('money helpers', () => {
  it('rounds decimal values at the cent boundary', () => {
    expect(toCents(1.005)).toBe(101);
  });

  it('converts negative balance cents back to a decimal amount', () => {
    expect(fromCents(-123)).toBe(-1.23);
  });

  it('rejects non-finite amounts and non-integer cents', () => {
    expect(() => toCents(Number.NaN)).toThrow(TypeError);
    expect(() => fromCents(10.5)).toThrow(TypeError);
  });
});
