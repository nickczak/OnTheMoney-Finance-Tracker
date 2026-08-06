#!/usr/bin/env bash
# Runs clang-format over the engine sources. Resolves paths relative to this
# script so it works from any working directory, and uses whatever
# `clang-format` is on the PATH (override with CLANG_FORMAT, e.g.
# CLANG_FORMAT=clang-format-17).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLANG_FORMAT="${CLANG_FORMAT:-clang-format}"

FILES=$(find "$SCRIPT_DIR/src" "$SCRIPT_DIR/include" -type f \( -name "*.cpp" -o -name "*.h" \))

if ! echo "$FILES" | xargs "$CLANG_FORMAT" --dry-run --Werror; then
  read -p "clang-format..................................................Failed! Would you like to auto-fix them? (y/n): " answer
  if [ "$answer" == "y" ]; then
    echo "$FILES" | xargs "$CLANG_FORMAT" -i
    echo "Files formatted successfully"
  else
    echo "Skipping formatting"
  fi
else
  echo "clang-format.....................................................Passed!"
fi
