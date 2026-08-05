<p align="center"><img src="On-The-Money_logo.png" alt="On-The-Money Logo" width=600 style="background: transparent;" /></p>

<h4 align="center">A Personal Finance Solution.</h4>

#

### Description
On The Money is a personal finance tracker with a Java/Spring Boot API, PostgreSQL persistence, a C++ Monte Carlo engine, and a SwiftUI iOS app. It tracks accounts, transactions, net worth history, credit score, stock market watchlist, and retirement projections.

### Features
- **Account Management** — checking, savings, credit card, and investment accounts with full CRUD
- **Transactions** — deposits, withdrawals, transfers with date/description tracking
- **Net Worth Tracking** — daily snapshots with interactive chart (1W, 1M, 3M, YTD, 1Y, ALL)
- **Monte Carlo Projections** — C++ engine runs 10,000+ simulations to project portfolio growth
- **Stock Market** — live quotes, market indices, and search via [Finnhub](https://finnhub.io/)

---
# Building this project

### This project uses
- C++20
- Java 17
- React Native
- [Spring Boot 3.3](https://spring.io/projects/spring-boot)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Docker](https://docs.docker.com/manuals/)
- CMake / [Gradle](https://docs.gradle.org/)
- [nlohmann/json](https://json.nlohmann.me/) / [Catch2](https://github.com/catchorg/Catch2)
- [Finnhub API](https://finnhub.io/docs/api)

## Setup & Run

### Database

```bash
docker compose up -d db
```

Tables are auto-created by Hibernate. To inspect:

```bash
docker exec -it onthemoney-db psql -U app -d onthemoney
\d    # show tables
\q    # quit
```

### C++ Engine

```bash
cd engine
cmake -S . -B build -DCMAKE_PREFIX_PATH="$(brew --prefix nlohmann-json);$(brew --prefix catch2)"
cmake --build build -j
./build/tests/run_tests
```

### Java API

```bash
# Build
./gradlew build

# Run
./gradlew bootRun

# Test (uses H2 in-memory DB, no PostgreSQL needed)
./gradlew test

# OWASP dependency vulnerability check
./gradlew dependencyCheckAnalyze
```

### Full Stack (Docker)

```bash
docker compose up -d
```

This starts PostgreSQL, the Spring Boot API, and Nginx. The API is available at `http://localhost:8080`.

### Code Formatting

Pre-commit hooks auto-format C++ (clang-format) and Java (Spotless / google-java-format):

```bash
sudo apt install pre-commit
pre-commit install
```

CI uses `clang-format-17` for C++ and Spotless for Java.

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
PUT  /api/accounts/1?name=Primary&balance=6000
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
GET  /api/stocks/search?query=apple
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
