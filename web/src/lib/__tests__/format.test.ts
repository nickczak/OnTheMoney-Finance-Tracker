import { formatMoney } from "@/lib/format";

test("formats money with thousands separators and two decimals", () => {
  expect(formatMoney(1234567.8)).toBe("1,234,567.80");
  expect(formatMoney(100.5)).toBe("100.50");
  expect(formatMoney(0)).toBe("0.00");
  expect(formatMoney(-1234.56)).toBe("-1,234.56");
});
