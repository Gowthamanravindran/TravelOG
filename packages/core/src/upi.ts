/**
 * Builds a UPI payment link (upi://pay?...) that opens the payer's UPI app with
 * the amount filled in. TravelOG never handles the money itself.
 */
export function upiPayLink(input: {
  payeeVpa: string;
  payeeName: string;
  amountMinor: number;
  note?: string;
}): string {
  const vpa = input.payeeVpa.trim();
  if (!/^[\w.\-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(vpa)) {
    throw new RangeError(`not a valid UPI ID: ${input.payeeVpa}`);
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new RangeError('amount must be a positive whole number of paise');
  }
  const params = new URLSearchParams({
    pa: vpa,
    pn: input.payeeName.slice(0, 50),
    am: (input.amountMinor / 100).toFixed(2),
    cu: 'INR',
  });
  if (input.note) params.set('tn', input.note.slice(0, 50));
  return `upi://pay?${params.toString()}`;
}
