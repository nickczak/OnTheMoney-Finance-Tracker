import { chromium } from "playwright";
const BASE = "http://localhost:5173";
const USER = { id: 1, email: "alex@example.com", displayName: "Alex Morgan" };
const ctx = await chromium.launch().then(b => b.newContext());
await ctx.addInitScript((user) => {
  localStorage.setItem("onthemoney-session", JSON.stringify({ token: "t", user }));
}, USER);
const page = await ctx.newPage();
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const p = url.pathname;
  const j = (b, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(b) });
  if (p === "/api/auth/refresh") return j({ token: "t", user: USER });
  if (p === "/api/net-worth") return j({ netWorth: 6.03 });
  if (p === "/api/net-worth/snapshot") return j({});
  if (p === "/api/net-worth/history") return j([]);
  if (p === "/api/in-the-green") return j({ inTheGreen: true });
  if (p === "/api/in-the-red") return j({ inTheRed: false });
  if (p === "/api/total-assets") return j({ totalAssets: 6.03 });
  if (p === "/api/total-liabilities") return j({ totalLiabilities: 0 });
  if (p === "/api/credit-score") return j({ score: 742 });
  if (p === "/api/accounts") return j([]);
  return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
});
await page.setViewportSize({ width: 1000, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const out = await page.evaluate(() => {
  const vw = window.innerWidth;
  const offenders = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      offenders.push({
        tag: el.tagName, cls: String(el.className).slice(0, 90),
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
      });
    }
  }
  return { scrollW: document.documentElement.scrollWidth, vw, offenders: offenders.slice(0, 12) };
});
console.log(JSON.stringify(out, null, 1));
await ctx.close();
