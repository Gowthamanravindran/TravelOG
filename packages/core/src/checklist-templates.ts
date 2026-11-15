// Plan 61: starting lists for Get ready, picked by where the trip goes and what kind it is.

export type ReadySection = 'documents' | 'money' | 'packing' | 'other';

export interface Suggestion {
  title: string;
  section: ReadySection;
}

export interface TripTraits {
  /** Going outside the home country. */
  abroad: boolean;
  /** The trip's kind, from its icon: beach, mountain, hiking, temple, car, camping, … */
  kind: string | null;
  /** Needs an Inner Line Permit or Protected Area Permit. */
  permit: boolean;
}

/** Indian regions where visitors need a permit (Inner Line or Protected Area). */
const PERMIT_REGIONS = [
  'ladakh',
  'lahaul and spiti',
  'sikkim',
  'arunachal pradesh',
  'nagaland',
  'mizoram',
  'manipur',
];

export function needsPermit(countryCode: string | null, region: string | null, name = ''): boolean {
  if (countryCode && countryCode !== 'IN') return false;
  const text = `${region ?? ''} ${name}`.toLowerCase();
  return PERMIT_REGIONS.some((r) => text.includes(r)) || /\bspiti\b|\bleh\b/.test(text);
}

/** Home country from the home currency, for "abroad" (no home-country setting yet). */
export function homeCountryFor(currency: string | null | undefined): string | null {
  const map: Record<string, string> = {
    INR: 'IN',
    USD: 'US',
    GBP: 'GB',
    AED: 'AE',
    SGD: 'SG',
    AUD: 'AU',
    CAD: 'CA',
    JPY: 'JP',
    LKR: 'LK',
    NPR: 'NP',
  };
  return map[(currency ?? '').toUpperCase()] ?? null;
}

export function suggestReadyList(t: TripTraits): Suggestion[] {
  const out: Suggestion[] = t.abroad
    ? [
        { title: 'Visa', section: 'documents' },
        { title: 'Passport valid 6+ months after return', section: 'documents' },
        { title: 'Travel insurance', section: 'documents' },
        { title: 'Forex card or cash', section: 'money' },
        { title: 'eSIM or roaming', section: 'money' },
      ]
    : [{ title: 'ID cards for everyone', section: 'documents' }];
  if (t.permit) out.push({ title: 'Inner Line Permit', section: 'documents' });
  switch (t.kind) {
    case 'beach':
      out.push(
        { title: 'Sunscreen', section: 'packing' },
        { title: 'Swimwear', section: 'packing' },
      );
      break;
    case 'mountain':
    case 'hiking':
    case 'camping':
      out.push(
        { title: 'Warm layers', section: 'packing' },
        { title: 'Medicine kit', section: 'packing' },
      );
      break;
    case 'temple':
      out.push({ title: 'Clothes for the dress code', section: 'packing' });
      break;
    case 'car':
      out.push({ title: 'Licence, RC and car insurance', section: 'documents' });
      break;
  }
  out.push({ title: 'Chargers and power bank', section: 'packing' });
  return out;
}
