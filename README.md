<p align="center"><img src="On-The-Money_logo.png" alt="On-The-Money Logo" width=600 style="background: transparent;" /></p>

<h4 align="center">A Personal Finance Solution.</h4>

<p align="center">
  <a href="https://github.com/nickczak/OnTheMoney-Finance-Tracker/actions/workflows/ci.yml"
     ><img src="https://github.com/nickczak/OnTheMoney-Finance-Tracker/actions/workflows/ci.yml/badge.svg"
           alt="Build & Test"></a>
</p>

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

## Architecture

Three components talk to each other over HTTP/REST, with an optional C++ binary used for one heavy computation:

```
ios/ (Expo app) ──REST/JSON──► backend/ (Spring Boot :8080) ──JDBC──► PostgreSQL (:5432)
                                     │
                                     └──spawns (stdin/stdout JSON)──► engine/ (C++ Monte Carlo)
```

### Data flow

- The iOS app never talks to the database or the engine — every request goes through the Spring Boot API at `http://localhost:8080` (single entry point: [`ios/lib/api.ts`](ios/lib/api.ts), overridable with `EXPO_PUBLIC_API_URL`).
- Simple portfolio math (net worth, total assets/liabilities, in-the-green/red) is computed directly in Java from the database.
- Heavy Monte Carlo projections are delegated to the C++ engine: `PortfolioService` spawns `engine/build/src/run_engine` (or `ENGINE_BINARY_PATH`) and exchanges newline-delimited JSON over stdin/stdout. The protocol is documented in [`engine/README.md`](engine/README.md).
- Market data (quotes, search, candles, watchlist) is proxied from the [Finnhub API](https://finnhub.io/) by `StockController` + `FinnhubService`.

### Docker topology

`docker compose up -d` (see `compose.yml`) starts:

- **`db`** — `postgres:16-alpine`, port 5432, named volume `db-data`
- **`app`** — one image built by `Dockerfile` (Java jar **and** the compiled `run_engine` binary), port 8080, waits on the `db` healthcheck

Run locally without Docker: start Postgres, `./gradlew bootRun` in `backend/`, optionally build the engine, then start the app in `ios/`.

### Repo layout

```
├── backend/     # Spring Boot REST API (Java 17, Gradle)
├── engine/      # C++ Monte Carlo engine (optional)
├── ios/         # Expo / React Native app — see ios/README.md
```

---

# Building this project

Uses: Java 17 + Spring Boot 3.3 + Gradle · TypeScript + Expo/React Native + Jest · PostgreSQL + Docker · C++17/CMake (optional) · [Finnhub API](https://finnhub.io/docs/api)

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

### 3. iOS App (Expo / React Native)

```bash
cd ios
npm install
npx expo start          # press i for the simulator
npm run typecheck       # TypeScript check
npm test                # Jest unit tests
```

API defaults to `http://localhost:8080`. Point elsewhere (e.g. a physical device):

Plug in your device and run:
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080 npx expo start --device
```

See [`ios/README.md`](ios/README.md) for the app structure, screen flow, configuration, and how to run on a physical device.

### 4. C++ Engine (optional)

Only `POST /api/project` needs it; the rest of the API works without it. Requires CMake 3.16+, C++17, and nlohmann/json (Catch2 for tests).

**macOS (Homebrew):**

```bash
cd engine
cmake -S . -B build -DCMAKE_PREFIX_PATH="$(brew --prefix nlohmann-json);$(brew --prefix catch2)"
cmake --build build -j
./build/tests/run_tests
```

### 5. Full Stack (Docker)

```bash
cp .env.example .env    # fill in DB_PASSWORD and FINNHUB_API_KEY
docker compose up -d
```

### Code Quality

- **Java** — `cd backend && ./gradlew spotlessCheck`
- **TypeScript** — `cd ios && npm run typecheck` · `npm run lint` (ESLint) · `npm run format` (Prettier) · `npm test` (Jest + Testing Library)
- **C++** — `engine/scripts/check_format.sh`

Pre-commit hooks auto-format C++ and Java:

```bash
sudo apt install pre-commit && pre-commit install
```

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
POST /api/transfers?fromAccountId=2&toAccountId=1&amount=2000&description=move%20to%20savings&date=2026-06-19

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

The TypeScript client types mirror the Java entity/controller shapes exactly (`ios/types/Account.ts`, `ios/types/Transaction.ts`, `ios/types/NetWorth.ts`).

### Account

```json
{
  "id": 1,
  "name": "Checking Account",
  "balance": 5000.0,
  "accType": "CHECKING"
}
```

`accType` is one of `CHECKING`, `SAVINGS`, `CREDIT_CARD`, `LOAN`, `INVESTMENT`.
Java type: `AccountEntity` — TypeScript type: `Account`.

### Transaction

```json
{
  "id": 1,
  "fromAccountId": 2,
  "toAccountId": 1,
  "amount": 250.0,
  "description": "Payday",
  "date": "2026-06-19",
  "type": "DEPOSIT"
}
```

`type` is one of `DEPOSIT`, `WITHDRAW`, `TRANSFER`. For deposits/withdrawals the money moves from `fromAccountId` to `toAccountId`; for transfers both account IDs are the source and destination.
Java: `TransactionEntity` — TypeScript: `Transaction`.

### Net Worth History Point

```json
{
  "id": 1,
  "netWorth": 12500.0,
  "date": "2026-06-19"
}
```

Java: `NetWorthHistoryEntity` — TypeScript: `NetWorthHistoryPoint`.

### Scalar computation responses

`GET /api/net-worth`, `/api/total-assets`, `/api/total-liabilities`, `/api/in-the-red`, `/api/in-the-green` each return a single-key object:

```json
{ "netWorth": 12500.0 }
```

```json
{ "totalAssets": 25000.0 }
```

```json
{ "totalLiabilities": 12500.0 }
```

```json
{ "inTheRed": false }
```

```json
{ "inTheGreen": true }
```

### Credit Score

`GET /api/credit-score` and `POST /api/credit-score?score=742`:

```json
{
  "score": 742,
  "date": "2026-06-19",
  "id": 1,
  "previousScore": 730
}
```

`previousScore` is `null` when there is no prior record and `id`/`date` are `0`/`null` when no score exists.

### Net Worth Snapshot

`POST /api/net-worth/snapshot`:

```json
{ "status": "recorded" }
```

### Monte Carlo Projection

`POST /api/project?...` returns the C++ engine's JSON unchanged — see [`engine/README.md`](engine/README.md).

## Use & Distribution

_This project is for personal use only. It is not affiliated with any financial or institutional corporations. No gains or profits are made from this project — it is simply a tool for personal finance tracking._
