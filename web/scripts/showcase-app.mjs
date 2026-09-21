#!/usr/bin/env node
/**
 * On The Money app showcase.
 *
 * Serves the built Vite bundle (web/dist) from a local static server, mocks
 * every /api endpoint the UI talks to, seeds a demo session, then walks
 * Chromium through the main screens and saves full-page screenshots.
 *
 * Works with zero infrastructure — no Spring Boot, Postgres, or nginx needed:
 *
 *   npm run build                       # produce dist
 *   npx playwright install chromium     # once
 *   node scripts/showcase-app.mjs             # desktop screenshots -> screenshots/desktop-*.png
 *   node scripts/showcase-app.mjs --gif       # animated gif       -> screenshots/showcase-desktop.gif
 *   node scripts/showcase-app.mjs --headed    # watch it live
 *
 * GIF mode records a single continuous SPA session (header-driven navigation,
 * only /projection is reached via a client-side popstate route so there are no
 * reload cuts in the recording) with an on-screen mouse cursor.
 */

import { createServer } from 'node:http';
import {
  accessSync,
  constants,
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const webRoot = resolve(scriptDir, '..');
const distDir = join(webRoot, 'dist');
const shotsDir = join(webRoot, 'screenshots');

const MOBILE_REQUESTED = process.argv.includes('--mobile');
const GIF = process.argv.includes('--gif');
// the recorded demo is desktop-only: phone tours cut between reloads and read as glitches
const MOBILE = GIF ? false : MOBILE_REQUESTED;
const HEADLESS = !process.argv.includes('--headed');
const PORT = Number(process.env.SHOWCASE_PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;

const DEMO_USER = { id: 1, email: 'demo@onthemoney.app', displayName: 'Demo Investor' };
const SESSION_KEY = 'onthemoney-session';
const DEMO_TOKEN = 'demo-token';

const round2 = (n) => Math.round(n * 100) / 100;
const day = (offset) =>
  new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

/* ----------------------------- fake accounts ---------------------------- */

const ACCOUNTS = [
  { id: 1, name: 'Everyday Checking', balance: 4286.55, accType: 'CHECKING' },
  { id: 2, name: 'High-Yield Savings', balance: 18500.0, accType: 'SAVINGS' },
  { id: 3, name: 'Triple Rewards Card', balance: 1230.4, accType: 'CREDIT_CARD' },
  { id: 4, name: 'Auto Loan', balance: 9440.0, accType: 'LOAN' },
  { id: 5, name: 'Brokerage', balance: 32100.0, accType: 'INVESTMENT' },
];

const TRANSACTIONS = [
  { id: 1, fromAccountId: 1, toAccountId: null, amount: 2400.0, description: 'Paycheck — Acme Corp', date: day(2), type: 'DEPOSIT' },
  { id: 2, fromAccountId: 1, toAccountId: null, amount: 128.42, description: 'Whole Foods Market', date: day(1), type: 'WITHDRAW' },
  { id: 3, fromAccountId: 1, toAccountId: 2, amount: 500.0, description: 'Transfer to savings', date: day(0), type: 'TRANSFER' },
  { id: 4, fromAccountId: 1, toAccountId: null, amount: 86.1, description: 'City Utilities', date: day(3), type: 'WITHDRAW' },
  { id: 5, fromAccountId: 1, toAccountId: null, amount: 320.0, description: 'Freelance design', date: day(4), type: 'DEPOSIT' },
];
let txSeq = 100;

let totalAssets = () =>
  round2(
    ACCOUNTS.filter((a) => a.accType !== 'CREDIT_CARD' && a.accType !== 'LOAN')
      .reduce((s, a) => s + a.balance, 0),
  );
let totalLiabilities = () =>
  round2(
    ACCOUNTS.filter((a) => a.accType === 'CREDIT_CARD' || a.accType === 'LOAN')
      .reduce((s, a) => s + a.balance, 0),
  );
let netWorth = () => round2(totalAssets() - totalLiabilities());

/* ----------------------- net worth history (trend) ---------------------- */

const HISTORY = (() => {
  const now = Date.now();
  const n = 120;
  const points = [];
  for (let i = 0; i < n; i++) {
    const wave = i === n - 1 ? 0 : Math.sin(i / 9) * 520 + Math.sin(i / 3.7) * 180;
    const value = 38500 + (44216.15 - 38500) * (i / (n - 1)) + wave;
    points.push({
      id: i + 1,
      netWorth: Math.round(value * 100) / 100,
      date: new Date(now - (n - 1 - i) * 86400000).toISOString().slice(0, 10),
    });
  }
  return points;
})();

let creditScore = 742;

/* ------------------------------- stocks --------------------------------- */

const INDICES = [
  { symbol: '^GSPC', name: 'S&P 500', currentPrice: 5837.52, change: 18.73, percentChange: 0.32, high: 5851.9, low: 5810.2, open: 5820.1, previousClose: 5818.79 },
  { symbol: '^IXIC', name: 'NASDAQ', currentPrice: 18412.74, change: -64.12, percentChange: -0.35, high: 18520.4, low: 18360.1, open: 18490.0, previousClose: 18476.86 },
  { symbol: '^DJI', name: 'Dow Jones', currentPrice: 42835.4, change: 96.28, percentChange: 0.23, high: 42910.0, low: 42720.0, open: 42760.0, previousClose: 42739.12 },
  { symbol: '^RUT', name: 'Russell 2000', currentPrice: 2248.63, change: -7.44, percentChange: -0.33, high: 2262.0, low: 2240.4, open: 2256.2, previousClose: 2256.07 },
];

const QUOTES = {
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', currentPrice: 214.83, change: 2.34, percentChange: 1.1, high: 215.9, low: 212.4, open: 213.2, previousClose: 212.49 },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corp.', currentPrice: 428.42, change: -1.82, percentChange: -0.42, high: 431.1, low: 425.6, open: 430.05, previousClose: 430.24 },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA Corp.', currentPrice: 131.26, change: 3.44, percentChange: 2.69, high: 132.1, low: 128.02, open: 128.9, previousClose: 127.82 },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc.', currentPrice: 246.31, change: -4.12, percentChange: -1.65, high: 251.0, low: 244.2, open: 250.1, previousClose: 250.43 },
};

const SEARCH_INDEX = Object.entries(QUOTES).map(([symbol, q]) => ({
  symbol,
  description: q.name,
  type: 'Common Stock',
  displaySymbol: symbol,
}));

let watchlist = [{ ...QUOTES.MSFT }, { ...QUOTES.NVDA }];

/* --------------------------- Monte Carlo mock --------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildProjection({ initialBalance, monthlyContribution, returnRate, years, simulations }) {
  const monthlyRate = returnRate / 100 / 12;
  const path = (seed, vol) => {
    const rnd = mulberry32(seed);
    const yearly = [initialBalance];
    let balance = initialBalance;
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyRate + (rnd() - 0.5) * vol) + monthlyContribution;
      }
      yearly.push(Math.round(balance));
    }
    return yearly;
  };
  const [best10Trajectory, meanTrajectory, medianTrajectory, worst10Trajectory] = [
    path(11, 0.022),
    path(22, 0.006),
    path(33, 0.008),
    path(44, 0.03),
  ];
  const last = (arr) => arr[arr.length - 1];
  return {
    status: 'completed',
    worst10: last(worst10Trajectory),
    median: last(medianTrajectory),
    best10: last(best10Trajectory),
    mean: last(meanTrajectory),
    simulations,
    years,
    percentiles: [],
    worst10Trajectory,
    medianTrajectory,
    best10Trajectory,
    meanTrajectory,
  };
}

/* ------------------------------ mock router ----------------------------- */

/** Answers every /api request the SPA can make, in fixture shapes. */
async function mockApi(route) {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname;
  const method = req.method();
  const post = () => {
    try {
      return JSON.parse(req.postData() || '{}');
    } catch {
      return {};
    }
  };
  const json = (data, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

  // Auth (session is pre-seeded, but refresh happens on boot).
  if (path === '/api/auth/refresh' || path === '/api/auth/login' || path === '/api/auth/signup') {
    return json({ token: DEMO_TOKEN, user: DEMO_USER });
  }
  if (path.startsWith('/api/auth/')) return json({ message: 'ok' });

  // Net worth + scalars.
  if (path === '/api/net-worth') return json({ netWorth: netWorth() });
  if (path === '/api/total-assets') return json({ totalAssets: totalAssets() });
  if (path === '/api/total-liabilities') return json({ totalLiabilities: totalLiabilities() });
  if (path === '/api/in-the-red') return json({ inTheRed: false });
  if (path === '/api/in-the-green') return json({ inTheGreen: true });
  if (path === '/api/net-worth/history') return json(HISTORY);
  if (path === '/api/net-worth/snapshot') return json({ status: 'recorded' });

  // Credit score.
  if (path === '/api/credit-score') {
    if (method === 'POST') {
      const score = Number(post().score);
      if (Number.isInteger(score) && score >= 300 && score <= 850) creditScore = score;
    }
    return json({ score: creditScore, date: day(0), id: 1, previousScore: 730 });
  }

  // Accounts.
  if (path === '/api/accounts') {
    if (method === 'GET') {
      const name = url.searchParams.get('name');
      if (name) {
        const found = ACCOUNTS.find((a) => a.name.toLowerCase() === name.toLowerCase());
        if (!found) return json({ error: 'Account not found' }, 404);
        return json(found);
      }
      return json(ACCOUNTS);
    }
    if (method === 'DELETE') return json({ message: 'deleted' });
  }
  const accMatch = path.match(/^\/api\/accounts\/(\d+)(\/(deposit|withdraw))?$/);
  if (accMatch) {
    const id = Number(accMatch[1]);
    const acc = ACCOUNTS.find((a) => a.id === id);
    if (!acc) return json({ message: 'Account not found' }, 404);
    if (method === 'GET') return json(acc);
    if (method === 'DELETE') {
      TRANSACTIONS.filter((t) => t.fromAccountId === id || t.toAccountId === id)
        .forEach((t) => TRANSACTIONS.splice(TRANSACTIONS.indexOf(t), 1));
      ACCOUNTS.splice(ACCOUNTS.indexOf(acc), 1);
      return json({ message: 'deleted' });
    }
    if (method === 'PUT') {
      const { name, balance, accType } = post();
      if (name != null) acc.name = name;
      if (balance != null) acc.balance = Number(balance);
      if (accType != null) acc.accType = accType;
      return json(acc);
    }
    if (accMatch[3]) {
      const amount = Number(post().amount);
      if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'invalid amount' }, 400);
      const isDeposit = accMatch[3] === 'deposit';
      const tx = {
        id: ++txSeq,
        fromAccountId: isDeposit ? id : null,
        toAccountId: isDeposit ? null : id,
        amount: round2(amount),
        description: post().description || (isDeposit ? 'Deposit' : 'Withdrawal'),
        date: post().date || day(0),
        type: isDeposit ? 'DEPOSIT' : 'WITHDRAW',
      };
      TRANSACTIONS.unshift(tx);
      acc.balance = round2(acc.balance + (isDeposit ? amount : -amount));
      return json(tx, 201);
    }
  }

  // Transactions.
  if (path === '/api/transactions') {
    const accountId = url.searchParams.get('accountId');
    if (accountId) {
      const n = Number(accountId);
      return json(TRANSACTIONS.filter((t) => t.fromAccountId === n || t.toAccountId === n));
    }
    return json(TRANSACTIONS);
  }
  const txMatch = path.match(/^\/api\/transactions\/(\d+)$/);
  if (txMatch) {
    const tx = TRANSACTIONS.find((t) => t.id === Number(txMatch[1]));
    if (!tx) return json({ message: 'Transaction not found' }, 404);
    if (method === 'PUT') {
      const { description } = post();
      if (description != null) tx.description = description;
      return json(tx);
    }
    if (method === 'DELETE') {
      TRANSACTIONS.splice(TRANSACTIONS.indexOf(tx), 1);
      return json({ message: 'deleted' });
    }
  }

  // Monte Carlo projection.
  if (path === '/api/project' && method === 'POST') {
    const initialBalance = Number(url.searchParams.get('initialBalance') ?? 10000);
    const monthlyContribution = Number(url.searchParams.get('monthlyContribution') ?? 500);
    const returnRate = Number(url.searchParams.get('returnRate') ?? 7);
    const years = Number(url.searchParams.get('years') ?? 30);
    const simulations = Number(url.searchParams.get('simulations') ?? 10000);
    return json(
      buildProjection({ initialBalance, monthlyContribution, returnRate, years, simulations }),
    );
  }

  // Stock market.
  if (path === '/api/stocks/quote') {
    const symbol = url.searchParams.get('symbol');
    return json(QUOTES[symbol] ?? {
      symbol,
      name: symbol,
      currentPrice: 100.0,
      change: 0.0,
      percentChange: 0.0,
      high: 105.0,
      low: 95.0,
      open: 102.0,
      previousClose: 100.0,
    });
  }
  if (path === '/api/stocks/search') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    return json(
      SEARCH_INDEX.filter(
        (r) =>
          r.symbol.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      ),
    );
  }
  if (path === '/api/stocks/overview') return json({ indices: INDICES });
  if (path === '/api/stocks/watchlist') {
    if (method === 'POST') {
      const symbol = url.searchParams.get('symbol');
      if (symbol && !watchlist.some((w) => w.symbol === symbol) && QUOTES[symbol]) {
        watchlist = [...watchlist, { ...QUOTES[symbol] }];
      }
    }
    return json(watchlist);
  }
  const wlMatch = path.match(/^\/api\/stocks\/watchlist\/(.+)$/);
  if (wlMatch) {
    const symbol = decodeURIComponent(wlMatch[1]);
    watchlist = watchlist.filter((w) => w.symbol !== symbol);
    return json({ message: 'removed' });
  }

  return json({ error: `showcase mock: unhandled ${method} ${path}` }, 404);
}

/* ----------------------------- static server ---------------------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startStaticServer() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, BASE).pathname);
      let filePath = normalize(join(distDir, urlPath));
      if (!filePath.startsWith(resolve(distDir) + sep) && filePath !== resolve(distDir)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      if (urlPath === '/' || !existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = join(distDir, 'index.html'); // SPA fallback for client-side routes
      }
      try {
        const body = readFileSync(filePath);
        res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(500).end('read error');
      }
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolvePromise(server));
  });
}

/* --------------------------------- main --------------------------------- */

async function main() {
  try {
    accessSync(join(distDir, 'index.html'), constants.R_OK);
  } catch {
    console.error(`No build found at ${distDir}.\nRun "npm run build" first.`);
    process.exit(1);
  }

  const server = await startStaticServer();
  const browser = await chromium.launch({
    headless: HEADLESS,
    // GIF mode needs visible pacing even headless, or the loop blurs past.
    slowMo: GIF ? 250 : HEADLESS ? 0 : 150,
  });

  const label = MOBILE ? 'mobile' : 'desktop';
  const contextOptions = MOBILE
    ? { ...devices['iPhone 13'] }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

  if (GIF) {
    contextOptions.recordVideo = {
      dir: shotsDir,
      size: MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    };
  }

  const context = await browser.newContext(contextOptions);
  context.setDefaultTimeout(15_000);

  // Seed the demo session before any app code runs so guarded routes render.
  await context.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [SESSION_KEY, JSON.stringify({ token: DEMO_TOKEN, user: DEMO_USER })],
  );

  // Playwright recordings show no pointer, so render a fake one: a big
  // macOS-style black arrow (white outline for contrast) that glides between
  // targets and fires an exaggerated ripple ring on every click.
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const CURSOR_SVG =
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='38' height='38' viewBox='0 0 28 28'%3E%3Cpath d='M4 2 L4 23 L10 17.5 L13.5 25.5 L17.5 23.8 L14 16.2 L21.5 15.5 Z' fill='%231a1a1a' stroke='%23ffffff' stroke-width='2.2' stroke-linejoin='round' paint-order='stroke'/%3E%3C/svg%3E\")";

      const cursor = document.createElement('div');
      const graphic = document.createElement('div');
      graphic.style.cssText = [
        'width:100%',
        'height:100%',
        `background:${CURSOR_SVG} center/contain no-repeat`,
        'transform-origin:30% 10%', // squash toward the arrow tip
        'transition:transform 140ms ease-out',
      ].join(';');
      cursor.appendChild(graphic);
      cursor.style.cssText = [
        'position:fixed',
        'left:0',
        'top:0',
        'width:38px',
        'height:38px',
        'z-index:2147483647',
        'pointer-events:none',
        'filter:drop-shadow(0 2px 3px rgba(0,0,0,0.55))',
        'transition:transform 420ms cubic-bezier(0.25,0.8,0.35,1)',
        'transform:translate(-200px,-200px)',
      ].join(';');
      document.body.appendChild(cursor);

      window.__qqCursor = {
        move: (x, y) => {
          cursor.style.transform = `translate(${x}px, ${y}px)`;
        },
        press: () => {
          // click motion only: a quick squash of the arrow
          graphic.style.transform = 'scale(0.72)';
          setTimeout(() => {
            graphic.style.transform = 'scale(1)';
          }, 150);
        },
      };
    });
  });

  const page = await context.newPage();
  await routeAllApi(page);

  /**
   * Glide the fake cursor over an element. The SVG tip sits ~5px in from the
   * box corner, so offset by that to land the tip on the target's center.
   */
  const glideTo = async (box) => {
    await page.evaluate(
      ([x, y]) => window.__qqCursor.move(x - 5, y - 3),
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    await page.waitForTimeout(GIF ? 480 : 120);
  };

  const hoverOver = async (locator) => glideTo(await locator.boundingBox());

  /** Exaggerated click: ripple + squash play out before the real click lands. */
  const click = async (locator) => {
    const box = await locator.boundingBox();
    await glideTo(box);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.evaluate(([x, y]) => window.__qqCursor.press(x, y), [cx, cy]);
    await page.waitForTimeout(GIF ? 300 : 80);
    await locator.click();
  };

  /** Header nav links (desktop topbar). */
  const headerLink = (label) =>
    page.locator('header').getByText(label, { exact: true });

  /** Client-side navigation without a reload cut (used for /projection). */
  const clientNav = async (path) => {
    await page.evaluate((p) => {
      window.history.pushState({}, '', p);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await page.waitForTimeout(GIF ? 700 : 150);
  };

  const step = async (name, fn) => {
    process.stdout.write(`\u2022 ${name} `);
    await fn();
    if (GIF) {
      await page.waitForTimeout(700); // let each screen linger in the recording
    } else {
      await page.screenshot({
        path: join(shotsDir, `${label}-${name}.png`),
        fullPage: true,
      });
    }
    console.log('\u2713');
  };

  // One continuous SPA session.
  await step('01-portfolio', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.locator('text=Account Mix').waitFor();
    // flip the chart timeframe so the tour shows the interactivity
    await click(page.locator('button[role="tab"]', { hasText: '3M' }));
    await page.waitForTimeout(400);
  });

  await step('02-accounts', async () => {
    await click(headerLink('Accounts'));
    await page.locator('button:has-text("Everyday Checking")').waitFor();
    await page.locator('text=High-Yield Savings').waitFor();
  });

  await step('03-account-detail', async () => {
    await click(page.locator('button:has-text("Everyday Checking")'));
    await page.locator('text=Transactions').first().waitFor();
    await page.locator('text=Whole Foods Market').waitFor();
    // tap a transaction to open the description editor
    await click(page.locator('button:has-text("Whole Foods Market")'));
    await page.locator('#editTxDescription').waitFor();
    await page.fill('#editTxDescription', 'Whole Foods Market — groceries');
    await click(page.locator('button:has-text("Save")'));
    await page.locator('text=Whole Foods Market — groceries').waitFor();
  });

  await step('04-stocks', async () => {
    // AccountDetail renders outside the TabLayout shell, so head back first
    await click(page.locator('button[aria-label="Back to accounts"]'));
    await page.locator('text=Everyday Checking').waitFor();
    await click(headerLink('Stock Market'));
    await page.locator('text=S&P 500').waitFor();
    // search a symbol
    const input = page.locator('input[placeholder*="Symbol or company"]');
    await click(input);
    await input.pressSequentially('apple', { delay: 120 });
    await input.press('Enter');
    await page.locator('button:has-text("AAPL")').first().waitFor();
    // open the quote detail
    await click(page.locator('button:has-text("AAPL")').first());
    await page.locator('button[aria-label="Toggle watchlist"]').waitFor();
    // star it into the watchlist
    await click(page.locator('button[aria-label="Toggle watchlist"]'));
    await page.locator('text=3 saved').waitFor();
    await click(page.locator('button:has-text("Close")'));
  });

  await step('05-projection', async () => {
    await click(page.locator('button:has-text("Retirement Projection")'));
    await page.locator('button:has-text("Run Projection")').waitFor();
    await click(page.locator('button:has-text("Run Projection")'));
    await page.locator('text=Projected balance after 30 years').waitFor();
  });

  await step('06-profile', async () => {
    await click(headerLink('Profile'));
    await page.locator('h1:has-text("Profile")').waitFor();
    await page.locator('text=demo@onthemoney.app').waitFor();
  });

  // closing beat: the demo user logs out and lands on the auth screen
  await step('07-logout', async () => {
    await click(page.locator('button:has-text("Log Out")'));
    await page.locator('button:has-text("Sign in")').waitFor();
  });

  // close the context first so Playwright flushes the .webm to disk
  await context.close();
  await browser.close();

  let deliverable = `${label} screenshots in ${shotsDir}${sep}`;
  if (GIF) {
    deliverable = await encodeGif(label);
  }
  server.close();
  console.log(`\nDone: ${deliverable}`);
}

/** Transcode the tour's recorded video into a compact looping GIF via ffmpeg. */
async function encodeGif(label) {
  const recordings = readdirSync(shotsDir)
    .filter((f) => f.endsWith('.webm'))
    .map((f) => join(shotsDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (recordings.length === 0) {
    throw new Error('GIF mode: no recorded video found');
  }

  const webm = recordings[0];
  const out = join(shotsDir, `showcase-${label}.gif`);
  const width = MOBILE ? 390 : 800;
  // two-pass palette keeps the dark theme free of banding artifacts;
  // multi-stream chains must run under -filter_complex (not -vf)
  const chain = `[0:v]fps=12,scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;

  execFileSync('ffmpeg', ['-y', '-i', webm, '-filter_complex', chain, '-loop', '0', out], {
    stdio: 'ignore',
  });
  unlinkSync(webm);
  return out;
}

async function routeAllApi(page) {
  await page.route('**/api/**', mockApi);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});