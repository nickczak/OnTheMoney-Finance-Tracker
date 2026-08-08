cmake_minimum_required(VERSION 3.16)
project(OnTheMoneyEngine LANGUAGES CXX)

find_program(CLANG_TIDY clang-tidy)
if(CLANG_TIDY)
  set(CMAKE_CXX_CLANG_TIDY "${CLANG_TIDY}")
endif()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(ON_THE_MONEY_BUILD_TESTS "Build the C++ unit tests (requires Catch2)" ON)

find_package(nlohmann_json 3.2.0 CONFIG REQUIRED)

add_subdirectory(src)

if(ON_THE_MONEY_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()
