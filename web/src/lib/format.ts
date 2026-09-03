// Formats a number with thousands separators and exactly two decimals,
// e.g. 1234567.8 -> "1,234,567.80". Use this wherever a dollar amount is
// displayed — toFixed(2) alone never adds grouping commas.
export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Formats a yyyy-MM-dd date string in UTC so the displayed day matches the
// data. Parsing "2026-08-06" with `new Date()` yields UTC midnight, and
// toLocaleDateString in a local zone would render the previous day.
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
