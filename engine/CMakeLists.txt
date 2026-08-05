cmake_minimum_required(VERSION 3.16)
project(OnTheMoneyEngine LANGUAGES CXX)

find_program(CLANG_TIDY clang-tidy)
if(CLANG_TIDY)
  set(CMAKE_CXX_CLANG_TIDY "${CLANG_TIDY}")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(nlohmann_json 3.2.0 CONFIG REQUIRED)

add_subdirectory(src)

enable_testing()
add_subdirectory(tests)
