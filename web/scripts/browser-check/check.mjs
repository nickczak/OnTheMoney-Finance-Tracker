import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:5173";
const SHOTS = "/tmp/otm-shots";
mkdirSync(SHOTS, { recursive: true });

const USER = { id: 1, email: "alex@example.com", displayName: "Alex Morgan" };

/* ---------------- mock data ---------------- */

function historyPoints() {
  const points = [];
  const today = new Date();
  let value = 5.72;
  for (let i = 400; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    value += (6.03 - 5.72) / 400 + (Math.random() - 0.5) * 0.004;
    points.push({
      id: 400 - i,
      netWorth: Math.max(0.01, value),
      date: d.toISOString().slice(0, 10),
    });
  }
  points[points.length - 1].netWorth = 6.03;
  return points;
}

const ACCOUNTS = [
  { id: 1, name: "Investment Portfolio", balance: 6.03, accType: "INVESTMENT" },
  { id: 2, name: "Everyday Checking", balance: 0, accType: "CHECKING" },
  { id: 3, name: "Rewards Card", balance: 0, accType: "CREDIT_CARD" },
];

const TRANSACTIONS = [
  { id: 1, fromAccountId: null, toAccountId: 1, amount: 3.21, description: "Dividend payout", date: "2026-08-30", type: "DEPOSIT" },
  { id: 2, fromAccountId: 1, toAccountId: null, amount: 1.1, description: "Management fee", date: "2026-08-12", type: "WITHDRAW" },
  { id: 3, fromAccountId: null, toAccountId: 1, amount: 2.5, description: "Cash deposit", date: "2026-07-22", type: "DEPOSIT" },
];

function quote(symbol, name, price, pc) {
  return {
    symbol, name, currentPrice: price, change: price * (pc / 100),
    percentChange: pc, high: price * 1.01, low: price * 0.99,
    open: price * 0.995, previousClose: price * 0.998,
  };
}

function projection() {
  const n = 31;
  const line = (v0, v1) =>
    Array.from({ length: n }, (_, i) => v0 + ((v1 - v0) * i) / (n - 1));
  return {
    status: "ok", worst10: 101234, median: 262345, best10: 654210, mean: 291023,
    simulations: 1000, years: 30,
    percentiles: [103000, 142000, 178000, 210000, 245000, 282000, 326000, 381000, 458000, 654000],
    worst10Trajectory: line(10000, 101234),
    medianTrajectory: line(10000, 262345),
    best10Trajectory: line(10000, 654210),
    meanTrajectory: line(10000, 291023),
  };
}

/* ---------------- route mocks ---------------- */

const json = (body, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

async function handleApi(route) {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname;
  const method = req.method();
  let response = null;

  if (path === "/api/auth/refresh" && method === "POST") {
    response = json({ token: "t", user: USER });
  } else if (path === "/api/net-worth" && method === "GET") {
    response = json({ netWorth: 6.03 });
  } else if (path === "/api/net-worth/snapshot" && method === "POST") {
    response = json({});
  } else if (path === "/api/net-worth/history" && method === "GET") {
    response = json(historyPoints());
  } else if (path === "/api/in-the-green") {
    response = json({ inTheGreen: true });
  } else if (path === "/api/in-the-red") {
    response = json({ inTheRed: false });
  } else if (path === "/api/total-assets") {
    response = json({ totalAssets: 6.03 });
  } else if (path === "/api/total-liabilities") {
    response = json({ totalLiabilities: 0 });
  } else if (path === "/api/credit-score" && method === "GET") {
    response = json({ score: 742 });
  } else if (path === "/api/accounts" && method === "GET") {
    response = json(url.searchParams.has("name") ? ACCOUNTS[0] : ACCOUNTS);
  } else if (path.startsWith("/api/accounts/") && method === "GET") {
    response = json(ACCOUNTS[Number(path.split("/").pop()) - 1] ?? ACCOUNTS[0]);
  } else if (path === "/api/transactions" && method === "GET") {
    response = json(url.searchParams.has("accountId") ? TRANSACTIONS : TRANSACTIONS);
  } else if (path === "/api/stocks/overview") {
    response = json({
      indices: [
        quote("SPX", "S&P 500", 5342.1, 0.45),
        quote("IXIC", "Nasdaq", 16784.3, 0.9),
        quote("DJI", "Dow Jones", 38887.6, -0.2),
      ],
    });
  } else if (path === "/api/stocks/watchlist") {
    response = json([
      quote("AAPL", "Apple Inc.", 228.4, 1.1),
      quote("NVDA", "NVIDIA Corp.", 121.7, 2.3),
    ]);
  } else if (path === "/api/stocks/search") {
    response = json([
      { symbol: "AAPL", description: "Apple Inc.", type: "Common Stock", displaySymbol: "AAPL" },
    ]);
  } else if (path === "/api/stocks/quote") {
    response = json(quote("AAPL", "Apple Inc.", 228.4, 1.1));
  } else if (path === "/api/project" && method === "POST") {
    response = json(projection());
  }

  if (response) {
    await route.fulfill(response);
  } else {
    console.log(`  [unmocked] ${method} ${path}`);
    await route.fulfill(json({ error: "unmocked" }, 404));
  }
}

/* ---------------- checks ---------------- */

const results = [];
function report(label, ok, detail = "") {
  results.push({ label, ok, detail });
}

async function basicChecks(page, routeName, viewport) {
  // accountdetail and notfound render standalone (no TabLayout shell) by design.
  const standalone = ["accountdetail", "notfound"].includes(routeName);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  report(`[${routeName} ${viewport.w}x${viewport.h}] horizontal overflow`, overflow <= 0, `delta=${overflow}px`);
  if (overflow > 0) {
    const offenders = await page.evaluate(() => {
      const vw = window.innerWidth;
      const out = [];
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 || r.left < -1) {
          out.push(`${el.tagName}.${String(el.className).slice(0, 60)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
        }
      }
      return out.slice(0, 8);
    });
    console.log(`    overflow sources @${viewport.w}px:\n      ${offenders.join("\n      ")}`);
  }

  const desktop = viewport.w >= 900;
  if (!standalone && desktop) {
    for (const label of ["Investing", "Crypto", "Rewards", "Retirement", "Portfolio", "Account"]) {
      const n = await page.locator(`header a:has-text("${label}"):visible`).count();
      report(`[${routeName}] header link "${label}"`, n > 0);
    }
    const logo = await page.locator('img[alt="On The Money"]:visible').count();
    report(`[${routeName}] logo image present`, logo > 0);
    const search = await page.locator('input[placeholder="Search"]:visible').count();
    report(`[${routeName}] search box`, search > 0);
    const cherubs = await page.locator('main img[src*="cherub"]:visible').count();
    report(`[${routeName}] cherub ornaments`, cherubs === 2, `count=${cherubs}`);
  } else if (!standalone) {
    for (const label of ["Portfolio", "Accounts", "Stocks", "Profile"]) {
      const n = await page.locator(`nav a:has-text("${label}"):visible`).count();
      report(`[${routeName}] dock tab "${label}"`, n > 0);
    }
    const logo = await page.locator('img[alt="On The Money"]:visible').count();
    report(`[${routeName}] logo image present`, logo > 0);
  }

  if (!standalone) {
    const frame = await page.locator(".page-frame").count();
    report(`[${routeName}] engraved page frame`, frame === 1);
  }
}

/* ---------------- run ---------------- */

const viewports = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "wide", w: 1920, h: 1080 },
  { name: "midwide", w: 1000, h: 900 },
  { name: "mobile", w: 390, h: 844 },
];

const browser = await chromium.launch();

async function runRoute(page, path, routeName) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`);
  });

  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  const title = await page.title();
  report(`[${routeName}] title`, title === "On The Money", title);

  for (const v of viewports) {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.waitForTimeout(250);
    await basicChecks(page, routeName, v);
    await page.screenshot({
      path: `${SHOTS}/${routeName}-${v.name}.png`,
      fullPage: v.name === "mobile" ? false : true,
    });
  }

  report(`[${routeName}] console/page errors`, errors.length === 0, errors.slice(0, 4).join(" | "));
}

/* authenticated pages */
const ctx = await browser.newContext();
await ctx.addInitScript((user) => {
  localStorage.setItem(
    "onthemoney-session",
    JSON.stringify({ token: "t", user }),
  );
}, USER);
const page = await ctx.newPage();
await page.route("**/api/**", handleApi);

for (const [path, name] of [
  ["/", "dashboard"],
  ["/accounts", "accounts"],
  ["/stocks", "stocks"],
  ["/profile", "profile"],
  ["/projection", "projection"],
  ["/account/1", "accountdetail"],
  ["/does-not-exist", "notfound"],
]) {
  console.log(`\n== ${name} ==`);
  await runRoute(page, path, name);
}
await ctx.close();

/* auth screen (no session) */
const ctx2 = await browser.newContext();
const page2 = await ctx2.newPage();
await page2.route("**/api/**", handleApi);
await page2.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page2.waitForTimeout(600);
const authOverflow = await page2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
report("[auth] horizontal overflow", authOverflow <= 0, `delta=${authOverflow}px`);
const signin = await page2.getByRole("button", { name: "Sign in" }).count();
report("[auth] sign-in form", signin > 0);
for (const v of viewports) {
  await page2.setViewportSize({ width: v.w, height: v.h });
  await page2.waitForTimeout(200);
  await page2.screenshot({ path: `${SHOTS}/auth-${v.name}.png` });
}
const authErrors = [];
page2.on("pageerror", (e) => authErrors.push(e.message));
await ctx2.close();

await browser.close();

console.log("\n================ RESULTS ================");
let failures = 0;
for (const r of results) {
  if (!r.ok) {
    failures++;
    console.log(`FAIL  ${r.label}${r.detail ? `  → ${r.detail}` : ""}`);
  }
}
if (failures === 0) console.log("ALL CHECKS PASSED");
else console.log(`\n${failures} failing check(s)`);
console.log(`screenshots → ${SHOTS}`);