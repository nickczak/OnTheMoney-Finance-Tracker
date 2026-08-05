#include "monte_carlo.h"

#include <algorithm>
#include <cmath>
#include <numeric>
#include <random>

namespace monte_carlo
{

double monteCarloPercentile(const std::vector<double> &results, double p)
{
  if (results.empty())
  {
    return 0.0;
  }
  size_t idx = static_cast<size_t>(std::round(p / 100.0 * (results.size() - 1)));
  return results[idx];
}

json projectRetirement(
    double initialBalance,
    double monthlyContribution,
    double returnRate,
    int years,
    int simulations)
{
  double annualContribution{monthlyContribution * 12};
  double volatility{0.10};

  std::mt19937_64 rng(std::random_device{}());
  std::normal_distribution<double> noise(0.0, volatility); // mean=0, stddev=0.10

  std::vector<double> finalResults;
  finalResults.reserve(simulations);

  // Track each simulation's full trajectory
  std::vector<std::vector<double>> trajectories(simulations, std::vector<double>(years + 1));
  // Running sum per year for mean trajectory
  std::vector<double> sumAtYear(years + 1, 0.0);

  for (int s{0}; s < simulations; ++s)
  {
    double balance{initialBalance};
    trajectories[s][0] = balance;
    sumAtYear[0] += balance;

    for (int y{1}; y <= years; ++y)
    {
      double annualReturn{returnRate + noise(rng)};
      balance = balance * (1.0 + annualReturn) + annualContribution;
      trajectories[s][y] = balance;
      sumAtYear[y] += balance;
    }
    finalResults.push_back(balance);
  }

  std::sort(finalResults.begin(), finalResults.end());

  auto worst10 = finalResults[static_cast<size_t>(simulations * 0.10)];
  auto median = finalResults[static_cast<size_t>(simulations * 0.50)];
  auto best10 = finalResults[static_cast<size_t>(simulations * 0.90)];
  auto mean = std::accumulate(finalResults.begin(), finalResults.end(), 0.0) / simulations;

  json percentiles = json::array();
  for (double p{5.0}; p <= 95.0; p += 5.0)
  {
    percentiles.push_back(monteCarloPercentile(finalResults, p));
  }

  // Mean trajectory
  json meanTrajectory = json::array();
  for (int y{0}; y <= years; ++y)
  {
    meanTrajectory.push_back(sumAtYear[y] / simulations);
  }

  // Percentile trajectories
  json worst10Trajectory = json::array();
  json medianTrajectory = json::array();
  json best10Trajectory = json::array();

  for (int y{0}; y <= years; ++y)
  {
    std::vector<double> yearValues(simulations);
    for (int s{0}; s < simulations; ++s)
    {
      yearValues[s] = trajectories[s][y];
    }
    std::sort(yearValues.begin(), yearValues.end());
    worst10Trajectory.push_back(yearValues[static_cast<size_t>(simulations * 0.10)]);
    medianTrajectory.push_back(yearValues[static_cast<size_t>(simulations * 0.50)]);
    best10Trajectory.push_back(yearValues[static_cast<size_t>(simulations * 0.90)]);
  }

  return {
      {"status", "ok"},
      {"worst10", worst10},
      {"median", median},
      {"best10", best10},
      {"mean", mean},
      {"simulations", simulations},
      {"percentiles", percentiles},
      {"worst10Trajectory", worst10Trajectory},
      {"medianTrajectory", medianTrajectory},
      {"best10Trajectory", best10Trajectory},
      {"meanTrajectory", meanTrajectory},
      {"years", years},
  };
}

} // namespace monte_carlo
