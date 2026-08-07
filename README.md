<p align="center"><img src="On-The-Money_logo.png" alt="On-The-Money Logo" width=600 style="background: transparent;" /></p>

<h4 align="center">A Personal Finance Solution.</h4>

### Description
A personal finance tracker: Java/Spring Boot API, PostgreSQL, iOS app (Expo/TypeScript), and an optional C++ Monte Carlo engine. Tracks accounts, transactions, net worth, credit score, stocks, and retirement projections.

### Features
- **Account Management** — checking, savings, credit card, and investment accounts with full CRUD
- **Transactions** — deposits, withdrawals, and transfers with date/description tracking
- **Net Worth Tracking** — totals, asset/liability breakdown, and daily snapshots (manual + automatic) with history
- **Monte Carlo Projections** — C++ engine runs thousands of simulations to project portfolio growth
- **Stock Market** — live quotes, market indices, symbol search, and a watchlist via [Finnhub](https://finnhub.io/)
- **Credit Score** — record and track your score over time
- **iOS App** — Expo (React Native) client with net worth charting (time ranges + touch-to-inspect), account management, and account detail screens

---
# Building this project

Uses: Java 17 + Spring Boot 3.3 + Gradle · TypeScript + Expo/React Native · PostgreSQL + Docker · C++20/CMake (optional) · [Finnhub API](https://finnhub.io/docs/api)

## Setup & Run

### 1. Database

```bash
docker compose up -d db
```

Tables are auto-created by Hibernate.

### 2. Java API

```bash
cd backend
./gradlew build      # build
./gradlew bootRun    # run
./gradlew test       # tests (H2 in-memory DB, no Postgres needed)
./gradlew spotlessCheck
./gradlew dependencyCheckAnalyze
```

API connects to PostgreSQL at host `db` by default. Run against a local DB:

```bash
./gradlew bootRun --args='--spring.datasource.url=jdbc:postgresql://localhost:5432/onthemoney'
```

### 3. iOS App (Expo / React Native)

```bash
cd ios
npm install
npx expo start          # press i for the simulator
npm run typecheck       # TypeScript check
```

API defaults to `http://localhost:8080`. Point elsewhere (e.g. a physical device):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080 npx expo start
```

### 4. C++ Engine (optional)

Only `POST /api/project` needs it; the rest of the API works without it. Requires CMake 3.16+, C++20, and nlohmann/json (Catch2 for tests).

**macOS (Homebrew):**
```bash
cd engine
cmake -S . -B build -DCMAKE_PREFIX_PATH="$(brew --prefix nlohmann-json);$(brew --prefix catch2)"
cmake --build build -j
./build/tests/run_tests
```

**Debian/Ubuntu:**
```bash
cd engine
sudo apt install cmake g++ nlohmann-json3-dev catch2
cmake -S . -B build
cmake --build build -j
./build/tests/run_tests
```

### 5. Full Stack (Docker)

```bash
cp .env.example .env    # fill in DB_PASSWORD and FINNHUB_API_KEY
docker compose up -d
```

Builds engine + API into one image, starts PostgreSQL and the API at `http://localhost:8080` (health check: `GET /api/status`).

### Code Quality

- **Java** — `cd backend && ./gradlew spotlessCheck`
- **TypeScript** — `cd ios && npm run typecheck` · `npm run lint` (ESLint) · `npm run format` (Prettier)
- **C++** — `engine/scripts/check_format.sh`

Pre-commit hooks auto-format C++ and Java:
```bash
sudo apt install pre-commit && pre-commit install
```

CI (`.github/workflows/ci.yml`) runs Spotless + tests for the backend, typecheck + ESLint + Prettier for iOS, and CMake/Catch2 tests for the engine.

---
## API Endpoints

```http
### Status
GET  /api/
GET  /api/status

### Net Worth
GET  /api/net-worth
GET  /api/total-assets
GET  /api/total-liabilities
GET  /api/in-the-red
GET  /api/in-the-green
GET  /api/net-worth/history
POST /api/net-worth/snapshot

### Monte Carlo Projection
POST /api/project?initialBalance=10000&monthlyContribution=500&returnRate=7&years=30&simulations=10000

### Accounts
GET  /api/accounts
GET  /api/accounts?name=Checking
GET  /api/accounts/1
POST /api/accounts?name=Checking&balance=5000&accType=CHECKING
PUT  /api/accounts/1?name=Primary&balance=6000&accType=CHECKING
DEL  /api/accounts/1
DEL  /api/accounts

### Transactions
POST /api/accounts/1/deposit?amount=500&description=paycheck&date=2026-06-19
POST /api/accounts/1/withdraw?amount=100&description=groceries&date=2026-06-20
GET  /api/transactions
GET  /api/transactions?start=2026-01-01&end=2026-12-31
GET  /api/transactions?accountId=1
PUT  /api/transactions/1?amount=250
DEL  /api/transactions/1

### Transfers
POST /api/transfers?fromAccountId=2&toAccountId=1&amount=2000&date=2026-06-19

### Credit Score
GET  /api/credit-score
POST /api/credit-score?score=742

### Stock Market (Finnhub)
GET  /api/stocks/quote?symbol=AAPL
GET  /api/stocks/search?q=apple
GET  /api/stocks/overview
GET  /api/stocks/candles?symbol=AAPL&resolution=D&from=1700000000&to=1730000000
GET  /api/stocks/watchlist
POST /api/stocks/watchlist?symbol=AAPL
DEL  /api/stocks/watchlist/AAPL
```

## JSON Protocol

See [`engine/README.md`](engine/README.md) for the C++ engine JSON protocol.

For the Java API, requests and responses use JSON body format. Simple computations (net worth, assets, liabilities) are computed directly in Java. The Monte Carlo projection delegates to the C++ engine.

## How Dates Work

Dates are stored and serialized as ISO-8601 calendar dates (`yyyy-MM-dd`, e.g. `2026-08-06`) with **no time or timezone component**. Here is how that date flows through each layer.

### Backend (Java / Spring)
- Every date is a `java.time.LocalDate` (a pure calendar day, no timezone) and is serialized by Jackson as `yyyy-MM-dd`.
- `PortfolioService.recordSnapshot()` stamps the daily net-worth snapshot with `LocalDate.now()` and **upserts** on that date (`findByDate(today)` → update, else insert), so only one point per day exists.
- Transaction/transfer endpoints accept an optional `date` param parsed with `LocalDate.parse(date, ISO_LOCAL_DATE)`; an invalid format returns a `400`.
- The snapshot scheduler (`@Scheduled(fixedRate = 86_400_000)`) records a point every 24h, and deposits/withdraws/transfers also record one, so the history has at most one entry per day in ascending date order.

### Frontend (Expo / TypeScript)

- History points and transaction dates arrive as `"yyyy-MM-dd"` strings. Formatting them with the JS `Date` object (via `new Date("2026-08-06")`) parses that as **UTC midnight**, not local — so naive `toLocaleDateString()` can display the *previous* day in timezones behind UTC.
- The Portfolio screen avoids that off-by-one by:
  - `formatDate()` splitting the `yyyy-MM-dd` into `[year, month, day]` and formatting with `timeZone: 'UTC'`.
  - `rangeStart()` resolving range cutoffs (`1W`, `1M`, `3M`, `1Y`, `YTD`) at **UTC day boundaries** so history filtering compares date-to-date, not date-to-current-time. This is why a `1W` filter is `utcNow − 6 days` (7 calendar days inclusive of today).
- The daily net-worth chart/history rows are rendered from these UTC-normalized `LocalDate` strings, so the displayed day always matches the stored date.

### Engine (C++)

The engine does **not** handle dates at all. Its only action is `projectRetirement`, which takes purely numeric parameters (`initialBalance`, `monthlyContribution`, `returnRate`, `years`, `simulations`) and returns a projected trajectory keyed by numeric year. No chrono/date/timezone code exists in the engine today.

This is why the engine is built with **C++20** (set via `CMAKE_CXX_STANDARD 20` in `engine/CMakeLists.txt`): it is configured ahead of time so that if date handling is ever added to the engine (e.g. real calendar-aware time-advancement or date math), the modern `<chrono>` calendar/clock types (`std::chrono::year_month_day`, `sys_days`, time-point arithmetic) are available without changing the build. For now the standard is forward-looking rather than enabling any current date code — all real-world date semantics are owned by the Java `LocalDate` and the iOS UTC normalization above.

## Use & Distribution
_This project is for personal use only. It is not affiliated with any financial or institutional corporations. No gains or profits are made from this project — it is simply a tool for personal finance tracking._

## Security Notes

- **There is no authentication.** Every API endpoint is open and the app stores real financial data, so only run it locally (or on a trusted network). Do **not** expose port 8080 publicly.
- The database password defaults to `devpassword` if `DB_PASSWORD` is not set — always set it via `.env`.
- The schema is managed with `spring.jpa.hibernate.ddl-auto=update`; fine for personal use, but prefer explicit migrations (e.g. Flyway) if this ever grows.
- The Finnhub API key is sent as a query parameter (Finnhub's design) and never logged; upstream errors are masked in API responses.
