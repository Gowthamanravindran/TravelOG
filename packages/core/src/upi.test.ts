import { describe, expect, it } from 'vitest';
import { upiPayLink } from './upi';

describe('upiPayLink', () => {
  it('builds a UPI link with rupees and paise', () => {
    expect(
      upiPayLink({
        payeeVpa: 'riya@okaxis',
        payeeName: 'Riya',
        amountMinor: 816000,
        note: 'TravelOG Goa',
      }),
    ).toBe('upi://pay?pa=riya%40okaxis&pn=Riya&am=8160.00&cu=INR&tn=TravelOG+Goa');
  });

  it('rejects bad UPI IDs and amounts', () => {
    expect(() => upiPayLink({ payeeVpa: 'riya', payeeName: 'R', amountMinor: 100 })).toThrow();
    expect(() => upiPayLink({ payeeVpa: 'riya@okaxis', payeeName: 'R', amountMinor: 0 })).toThrow();
  });
});
