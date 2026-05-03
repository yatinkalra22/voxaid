/**
 * Patient PHI masking. We keep the country-code prefix (so the CHW can tell
 * the region at a glance) and the last 4 digits (so they can disambiguate
 * between two patients with similar names). Everything in the middle is
 * replaced with bullets.
 *
 *   +12603637866   -> +1 ••• 7866
 *   +91-8765432109 -> +91 ••• 2109
 *   anon-…         -> Anonymous
 *   unknown        -> Anonymous
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "Anonymous";
  if (phone === "unknown" || phone.startsWith("anon-")) return "Anonymous";
  if (!phone.startsWith("+")) return phone; // unexpected shape — show as-is

  // Pull off "+CC" — common country codes are 1-3 digits, then any non-digit
  // separator may follow before the subscriber number.
  const m = phone.match(/^(\+\d{1,3})[-\s]?(.*)$/);
  if (!m) return phone;
  const cc = m[1];
  const rest = m[2].replace(/\D/g, "");
  if (rest.length <= 4) return `${cc} ${rest}`;
  return `${cc} ••• ${rest.slice(-4)}`;
}
