<p align="center"><img src="On-The-Money_logo.png" alt="On-The-Money Logo" width=600 style="background: transparent;" /></p>

<h4 align="center">A Personal Finance Solution.</h4>

### Description
On The Money is a personal finance tracker with a Java/Spring Boot API, PostgreSQL persistence, a C++ Monte Carlo engine, and an iOS app built with Expo (React Native). It tracks accounts, transactions, net worth history, credit score, stock market watchlist, and retirement projections.

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

### This project uses
- C++20, CMake, [nlohmann/json](https://json.nlohmann.me/), [Catch2](https://github.com/catchorg/Catch2)
- Java 17, [Spring Boot 3.3](https://spring.io/projects/spring-boot), [Gradle](https://docs.gradle.org/)
- [PostgreSQL](https://www.postgresql.org/docs/), [Docker](https://docs.docker.com/manuals/)
- [Expo](https://expo.dev/) / React Native with TypeScript and Expo Router
- [Finnhub API](https://finnhub.io/docs/api)

## Project Structure

```
├── backend/     # Spring Boot REST API (Java 17, Gradle)
├── engine/      # C++ Monte Carlo engine (CMake)
├── ios/         # iOS app (Expo / React Native)
├── compose.yml  # PostgreSQL + API services
├── Dockerfile   # Multi-stage build: API jar + C++ engine binary
└── .env.example # Environment variable template
```

## Setup & Run

### 1. Database

```bash
docker compose up -d db
```

Tables are auto-created by Hibernate. To inspect:

```bash
docker compose exec db psql -U app -d onthemoney
\d    # show tables
\q    # quit
```

### 2. C++ Engine

Requires CMake 3.16+, a C++20 compiler, and [nlohmann/json](https://json.nlohmann.me/). Catch2 is only needed to build the tests.

**macOS (Homebrew):**

```bash
cd engine
cmake -S . -B build -DCMAKE_PREFIX_PATH="$(brew --prefix nlohmann-json);$(brew --prefix catch2)"
cmake --build build -j
./build/tests/run_tests
```

**Debian/Ubuntu (system packages):**

```bash
cd engine
sudo apt install cmake g++ nlohmann-json3-dev catch2
cmake -S . -B build
cmake --build build -j
./build/tests/run_tests
```

Dependencies can also be installed via [vcpkg](https://vcpkg.io/) — see `engine/vcpkg.json`. Helper scripts live in `engine/scripts/`: `check_format.sh` (clang-format check/fix) and `valgrind.sh` (memory-leak check).

> The engine binary is optional at runtime — the API works for all database and simple computation endpoints without it (only `POST /api/project` needs it). Inside Docker it is built automatically; locally it defaults to `engine/build/src/run_engine`, resolved relative to where the API is launched (override with `ENGINE_BINARY_PATH`). See [engine/README.md](engine/README.md) for the JSON protocol.

### 3. Java API

```bash
cd backend

# Build
./gradlew build

# Run
./gradlew bootRun

# Test (uses H2 in-memory DB, no PostgreSQL needed)
./gradlew test

# OWASP dependency vulnerability check
./gradlew dependencyCheckAnalyze
```

By default the API connects to PostgreSQL at host `db` (the Docker service name). To run the API on your machine against a local database:

```bash
./gradlew bootRun --args='--spring.datasource.url=jdbc:postgresql://localhost:5432/onthemoney'
```

### 4. iOS App (Expo / React Native)

```bash
cd ios
npm install
npx expo start    # press i for the iOS simulator
```

The app calls the API at `http://localhost:8080` by default. To point it elsewhere (e.g. a physical device — which can't reach your machine's `localhost` — or a deployed API), set an env var when starting Expo:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080 npx expo start
```

### 5. Full Stack (Docker)

```bash
cp .env.example .env    # then fill in DB_PASSWORD and FINNHUB_API_KEY
docker compose up -d
```

This builds the C++ engine and Spring Boot API into one image, starts PostgreSQL and the API, and exposes the API at `http://localhost:8080` (health check: `GET /api/status`).

### Code Formatting

Pre-commit hooks auto-format C++ (clang-format-17) and Java (Spotless / google-java-format):

```bash
sudo apt install pre-commit
pre-commit install
```

Or run `engine/scripts/check_format.sh` to check/fix the C++ formatting manually.

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

## Use & Distribution
_This project is for personal use only. It is not affiliated with any financial or institutional corporations. No gains or profits are made from this project — it is simply a tool for personal finance tracking._

## Security Notes

- **There is no authentication.** Every API endpoint is open and the app stores real financial data, so only run it locally (or on a trusted network). Do **not** expose port 8080 publicly.
- The database password defaults to `devpassword` if `DB_PASSWORD` is not set — always set it via `.env`.
- The schema is managed with `spring.jpa.hibernate.ddl-auto=update`; fine for personal use, but prefer explicit migrations (e.g. Flyway) if this ever grows.
- The Finnhub API key is sent as a query parameter (Finnhub's design) and never logged; upstream errors are masked in API responses.
