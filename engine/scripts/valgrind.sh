#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE_DIR="$SCRIPT_DIR/"
BUILD_DIR="$ENGINE_DIR/build"

echo "=== Running Valgrind on C++ Engine ==="

# Build with debug symbols
echo "Building with debug symbols..."
cmake -S "$ENGINE_DIR" -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_TOOLCHAIN_FILE="$ENGINE_DIR/vcpkg/scripts/buildsystems/vcpkg.cmake"
cmake --build "$BUILD_DIR" -j"$(nproc)"

VALGRIND_FLAGS="--leak-check=full --show-leak-kinds=all --track-origins=yes --verbose --log-file=valgrind_output.txt"

# Feed test JSON data into the run_engine executable under valgrind
echo "Running run_engine under valgrind with test data..."
valgrind $VALGRIND_FLAGS "$BUILD_DIR/src/run_engine" <<'EOF'
{"action":"projectRetirement","initialBalance":10000,"monthlyContribution":500,"returnRate":0.07,"years":30,"simulations":1000}
{"action":"projectRetirement","initialBalance":50000,"monthlyContribution":1000,"returnRate":0.08,"years":20,"simulations":500}
EOF

echo ""
echo "=== Valgrind complete ==="
echo "Output saved to valgrind_output.txt"
echo ""
echo "=== Summary (definite leaks) ==="
grep -A5 "definitely lost:" valgrind_output.txt || echo "No definite leaks found!"
