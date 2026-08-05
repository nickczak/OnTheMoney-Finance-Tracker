#!/usr/bin/env bash
FILES=$(find ./engine/src ./engine/include -type f \( -name "*.cpp" -o -name "*.h" \))

if ! echo "$FILES" | xargs clang-format-17 --dry-run --Werror; then
  read -p "clang-format-17............................................Failed! Would you like to auto-fix them? (y/n): " answer
  if [ "$answer" == "y" ]; then
    echo "$FILES" | xargs clang-format-17 -i
    echo "Files formatted successfully"
  else
    echo "Skipping formatting"
  fi
else
  echo "clang-format-17............................................Passed!"
fi
