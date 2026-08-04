/**
 * Money helpers for the Finance page.
 *
 * Every amount crosses the API as an **integer count of cents**, never a
 * decimal string and never a float — warden's own `ROADMAP.md` Phase 17
 * holds the bot-side code to exactly that standard (see `store/expenses.zig`
 * and the `amount_cents BIGINT CHECK (amount_cents > 0)` columns), and this
 * module is the frontend half of the same rule: `parseAmountCents` is the
 * only place a user-typed decimal is ever interpreted, and it converts to
 * integer cents immediately, using string manipulation rather than
 * `parseFloat`.
 *
 * Why not just `Math.round(parseFloat(x) * 100)`: that is the standard way
 * this goes subtly wrong. `parseFloat("1.005") * 100` is `100.49999999999999`
 * in IEEE-754 double, so rounding it yields 100 cents rather than the 101 a
 * person typing "1.005" means — a silent off-by-one-cent that only shows up
 * on specific inputs. Splitting the string on "." and padding the fractional
 * part has no such failure mode: no float is ever constructed.
 */

/**
 * Parses a user-typed amount ("12.5", "12.50", "1,234.99") into a positive
 * integer number of cents, or `null` if it isn't a valid amount.
 *
 * Rejects (rather than silently truncating) more than two decimal places —
 * "12.345" is far more likely a typo than a request to round, and money is
 * the wrong place to guess. Also rejects zero and negatives, matching the
 * DB's own `CHECK (amount_cents > 0)`.
 */
export function parseAmountCents(input: string): number | null {
  // Thousands separators are accepted on input (people paste them) but are
  // never produced by `formatMoney` below.
  const s = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;

  const [whole, frac = ""] = s.split(".");
  // `frac` is 0-2 digits here; pad so "12.5" means 50 cents, not 5.
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));

  // `Number(whole) * 100` is exact for every value inside the safe-integer
  // range; this rejects anything that overflowed it rather than sending a
  // silently-wrong amount to the API.
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

/**
 * Renders integer cents back as "12.50 USD" — the same shape warden's own
 * `formatMoney` prints in chat, so the panel and the bot never disagree
 * about how an amount reads. Integer arithmetic only, for the same reason
 * as above.
 */
export function formatMoney(cents: number, currency: string): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${negative ? "-" : ""}${whole.toLocaleString()}.${String(frac).padStart(2, "0")} ${currency}`;
}

/**
 * The Unix timestamp (seconds) of the start of the current calendar month
 * *in the viewer's own timezone*, for the expense summary's `since` filter.
 *
 * The API deliberately doesn't default this server-side: a month boundary
 * depends on the viewer's UTC offset, and warden's API server has no idea
 * what that is at request time. `utcOffsetMinutes` comes from
 * `GET /api/v1/me/settings`, the same offset every other date in the panel
 * is rendered against.
 */
export function startOfMonthUnix(utcOffsetMinutes: number): number {
  const offsetMs = utcOffsetMinutes * 60_000;
  // Shift "now" into the viewer's local wall clock, read off its calendar
  // month there, then shift the resulting boundary back to real UTC.
  const local = new Date(Date.now() + offsetMs);
  const localMonthStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, 0, 0, 0, 0);
  return Math.floor((localMonthStart - offsetMs) / 1000);
}

/**
 * Currency for *aggregate* figures (a chat's month total, the monthly
 * subscription total). Mirrors warden's own `default_currency` in
 * `main.zig`, which `formatExpenseSummary` likewise uses for its grand
 * total and per-category sums while formatting each individual budget in
 * that budget's own recorded currency — warden sums naively across
 * whatever currencies a chat happens to contain (see `store/expenses.zig`
 * on the v1 single-effective-currency assumption), so an aggregate can't
 * honestly claim any one row's currency. Rows that *do* carry their own
 * currency render with it rather than this.
 */
export const defaultCurrency = "USD";

/** Interval presets for the subscription form, in days. */
export const intervalPresets = [
  { days: 7, key: "weekly" },
  { days: 30, key: "monthly" },
  { days: 90, key: "quarterly" },
  { days: 365, key: "yearly" },
] as const;
