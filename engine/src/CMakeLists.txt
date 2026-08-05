add_library(monte_carlo STATIC
  engine_core/monte_carlo.cpp
)

target_include_directories(monte_carlo PUBLIC
  ../include
)

target_link_libraries(monte_carlo PUBLIC
  nlohmann_json::nlohmann_json
)

add_executable(run_engine
  engine_core/main.cpp
)

target_link_libraries(run_engine PRIVATE
  monte_carlo
)
