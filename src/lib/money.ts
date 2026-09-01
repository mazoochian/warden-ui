/**
 * Every finance amount crosses the API as an integer cent count, never a
 * decimal string or float (see warden's `router.zig` `validAmountCents`
 * doc comment) -- this is the one place a user-typed decimal dollar
 * string turns into that integer, and back again for display, so no
 * float ever touches a money value on either side of the wire.
 */
export function parseAmountCents(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

export function formatCents(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}
