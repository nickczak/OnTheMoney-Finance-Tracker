// Formats a number with thousands separators and exactly two decimals,
// e.g. 1234567.8 -> "1,234,567.80". Use this wherever a dollar amount is
// displayed — toFixed(2) alone never adds grouping commas.
export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
