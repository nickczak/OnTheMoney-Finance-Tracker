#include "monte_carlo.h"

#include <catch2/catch_approx.hpp>
#include <catch2/catch_test_macros.hpp>

using namespace monte_carlo;

TEST_CASE("monteCarloPercentile on empty vector returns 0")
{
  std::vector<double> empty;
  REQUIRE(monteCarloPercentile(empty, 50.0) == 0.0);
}

TEST_CASE("monteCarloPercentile on single element")
{
  std::vector<double> v = {42.0};
  REQUIRE(monteCarloPercentile(v, 0.0) == 42.0);
  REQUIRE(monteCarloPercentile(v, 50.0) == 42.0);
  REQUIRE(monteCarloPercentile(v, 100.0) == 42.0);
}

TEST_CASE("monteCarloPercentile on sorted values")
{
  std::vector<double> v = {10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0};
  REQUIRE(monteCarloPercentile(v, 0.0) == 10.0);
  REQUIRE(monteCarloPercentile(v, 50.0) == 60.0);
  REQUIRE(monteCarloPercentile(v, 100.0) == 100.0);
}

TEST_CASE("monteCarloPercentile at boundaries")
{
  std::vector<double> v = {1.0, 2.0, 3.0, 4.0, 5.0};
  REQUIRE(monteCarloPercentile(v, 0.0) == 1.0);
  REQUIRE(monteCarloPercentile(v, 100.0) == 5.0);
}

TEST_CASE("projectRetirement with zero years returns initial balance")
{
  auto result = monte_carlo::projectRetirement(10000.0, 500.0, 0.07, 0, 100);
  REQUIRE(result["status"] == "ok");
  REQUIRE(result["simulations"] == 100);
  REQUIRE(result["median"].get<double>() == 10000.0);
}

TEST_CASE("projectRetirement returns expected keys")
{
  auto result = monte_carlo::projectRetirement(10000.0, 500.0, 0.07, 30, 1000);
  REQUIRE(result["status"] == "ok");
  REQUIRE(result.contains("worst10"));
  REQUIRE(result.contains("median"));
  REQUIRE(result.contains("best10"));
  REQUIRE(result.contains("mean"));
  REQUIRE(result.contains("simulations"));
  REQUIRE(result.contains("percentiles"));
  REQUIRE(result.contains("worst10Trajectory"));
  REQUIRE(result.contains("medianTrajectory"));
  REQUIRE(result.contains("best10Trajectory"));
  REQUIRE(result.contains("meanTrajectory"));
  REQUIRE(result.contains("years"));

  REQUIRE(result["simulations"] == 1000);
  REQUIRE(result["percentiles"].size() == 19);
  REQUIRE(result["years"] == 30);
}

TEST_CASE("projectRetirement trajectories have correct length")
{
  auto result = monte_carlo::projectRetirement(10000.0, 500.0, 0.07, 30, 100);
  int y = result["years"].get<int>();
  REQUIRE(result["meanTrajectory"].size() == static_cast<size_t>(y + 1));
  REQUIRE(result["worst10Trajectory"].size() == static_cast<size_t>(y + 1));
  REQUIRE(result["medianTrajectory"].size() == static_cast<size_t>(y + 1));
  REQUIRE(result["best10Trajectory"].size() == static_cast<size_t>(y + 1));
}

TEST_CASE("projectRetirement trajectories start at initialBalance")
{
  auto result = monte_carlo::projectRetirement(50000.0, 1000.0, 0.05, 10, 100);
  REQUIRE(result["meanTrajectory"][0].get<double>() == 50000.0);
  REQUIRE(result["worst10Trajectory"][0].get<double>() == 50000.0);
  REQUIRE(result["medianTrajectory"][0].get<double>() == 50000.0);
  REQUIRE(result["best10Trajectory"][0].get<double>() == 50000.0);
}

TEST_CASE("projectRetirement trajectory end matches final summary")
{
  auto result = monte_carlo::projectRetirement(10000.0, 500.0, 0.07, 30, 1000);
  int last = result["years"].get<int>();
  REQUIRE(result["worst10Trajectory"][last].get<double>() == result["worst10"].get<double>());
  REQUIRE(result["medianTrajectory"][last].get<double>() == result["median"].get<double>());
  REQUIRE(result["best10Trajectory"][last].get<double>() == result["best10"].get<double>());
  REQUIRE(
      result["meanTrajectory"][last].get<double>() == Catch::Approx(result["mean"].get<double>()));
}

TEST_CASE("projectRetirement results are monotonic")
{
  auto result = monte_carlo::projectRetirement(10000.0, 500.0, 0.07, 30, 1000);
  auto worst10 = result["worst10"].get<double>();
  auto median = result["median"].get<double>();
  auto best10 = result["best10"].get<double>();

  REQUIRE(worst10 <= median);
  REQUIRE(median <= best10);
}

TEST_CASE("projectRetirement trajectories are monotonic at each year")
{
  auto result = monte_carlo::projectRetirement(10000.0, 500.0, 0.05, 10, 500);
  int y = result["years"].get<int>();
  for (int i{0}; i <= y; ++i)
  {
    REQUIRE(
        result["worst10Trajectory"][i].get<double>() <=
        result["medianTrajectory"][i].get<double>());
    REQUIRE(
        result["medianTrajectory"][i].get<double>() <= result["best10Trajectory"][i].get<double>());
  }
}

TEST_CASE("projectRetirement with zero return rate")
{
  auto result = monte_carlo::projectRetirement(10000.0, 500.0, 0.0, 1, 5000);
  auto median = result["median"].get<double>();
  REQUIRE(median == Catch::Approx(16000.0).margin(500));
}
