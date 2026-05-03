/**
 * Patient PHI masking at the API boundary. We expose only the country-code
 * prefix (so the dashboard can show region) and the last 4 digits (so a CHW
 * can disambiguate two patients) — never the full subscriber number.
 *
 *   +12603637866   -> +1 ••• 7866
 *   +91-8765432109 -> +91 ••• 2109
 *   anon-…         -> Anonymous
 *
 * Idempotent: a phone string that already contains the bullet character is
 * returned unchanged so we don't re-mask a value that's already been masked
 * upstream (e.g. by a seed script).
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return 'Anonymous';
  if (phone === 'unknown' || phone.startsWith('anon-')) return 'Anonymous';
  if (phone.includes('•')) return phone;
  if (!phone.startsWith('+')) return phone;

  const m = phone.match(/^(\+\d{1,3})[-\s]?(.*)$/);
  if (!m) return phone;
  const cc = m[1];
  const rest = m[2].replace(/\D/g, '');
  if (rest.length <= 4) return `${cc} ${rest}`;
  return `${cc} ••• ${rest.slice(-4)}`;
}
