# C++ Engine

The C++ engine handles **heavy computations that benefit from C++ speed**. Simple portfolio math (net worth, total assets, etc.) is done directly in Java. The engine is only invoked for operations like Monte Carlo simulation.

> **NOTE:** The engine binary is optional. Without it, the Java API still works for all DB and simple computation endpoints. Only heavy computation endpoints (`POST /api/project`) will return an error.

## Build & Test

**macOS (Homebrew):**

```bash
cmake -S . -B build -DCMAKE_PREFIX_PATH="$(brew --prefix nlohmann-json);$(brew --prefix catch2)"
cmake --build build -j
./build/tests/run_tests
```

**Debian/Ubuntu (system packages):**

```bash
sudo apt install cmake g++ nlohmann-json3-dev catch2
cmake -S . -B build
cmake --build build -j
./build/tests/run_tests
```

Dependencies can also be installed via [vcpkg](https://vcpkg.io/) — see `vcpkg.json`. To run a Valgrind memory-leak check, use `scripts/valgrind.sh` (expects a vcpkg checkout at `engine/vcpkg`).

## Structure

```
engine/
├── include/
│   └── monte_carlo.h          # Monte Carlo API (testable)
├── src/
│   ├── CMakeLists.txt
│   └── engine_core/
│       ├── main.cpp           # I/O loop, delegates to monte_carlo
│       └── monte_carlo.cpp    # Simulation logic
├── tests/
│   ├── CMakeLists.txt
│   └── monte_carlo_tests.cpp
├── scripts/
│   ├── check_format.sh        # clang-format check/fix
│   └── valgrind.sh            # memory-leak check
├── CMakeLists.txt
└── vcpkg.json                 # nlohmann-json + catch2 (optional)
```

## Actions

### `projectRetirement` — Monte Carlo simulation

Runs thousands of random market simulations to project retirement savings.

**Request:**
```json
{
  "action": "projectRetirement",
  "initialBalance": 10000,
  "monthlyContribution": 500,
  "returnRate": 0.07,
  "years": 30,
  "simulations": 10000
}
```

**Response:**
```json
{
  "status": "ok",
  "worst10": 182345.67,
  "median": 892345.12,
  "best10": 2456789.34,
  "mean": 1045678.90,
  "simulations": 10000,
  "years": 30,
  "percentiles": [182345.67, 234567.89, ..., 1987654.32, 2456789.34],
  "worst10Trajectory": [10000.0, 11230.45, ...],
  "medianTrajectory": [10000.0, 12340.56, ...],
  "best10Trajectory": [10000.0, 13450.67, ...],
  "meanTrajectory": [10000.0, 12345.67, ...]
}
```

Each trajectory array has `years + 1` entries (year 0 = `initialBalance`). An error is reported as `{"status":"error","message":"..."}`; the API converts that into a server error response.

Each simulation starts at `initialBalance` and runs `years` of random annual returns drawn from a normal distribution (mean = `returnRate`, std dev = 10%). Annual contributions (`monthlyContribution × 12`) are added each year. The result is sorted across all `simulations` and summarized as percentiles.

## Protocol

Newline-delimited JSON over stdin/stdout:

```
stdin  ──►  {"action":"projectRetirement", ...}\n
stdout ◄──  {"status":"ok", "median":...}\n
```

Strictly synchronous — one request in, one response out. Each response is flushed immediately.
