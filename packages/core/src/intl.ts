/**
 * Shared Intl formatters (Plan 45). Building one is slow on a phone (Hermes loads
 * locale and time-zone data each time), so each locale + options pair is built
 * once and reused. Formatters are stateless, so sharing them changes no result.
 */
const dates = new Map<string, Intl.DateTimeFormat>();
const numbers = new Map<string, Intl.NumberFormat>();

export function dateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = dates.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    dates.set(key, f);
  }
  return f;
}

export function numberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = numbers.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    numbers.set(key, f);
  }
  return f;
}
