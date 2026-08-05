find_package(Catch2 REQUIRED)
include(Catch)

add_executable(run_tests
  monte_carlo_tests.cpp
)

target_link_libraries(run_tests PRIVATE
  Catch2::Catch2WithMain
  monte_carlo
)

catch_discover_tests(run_tests)
