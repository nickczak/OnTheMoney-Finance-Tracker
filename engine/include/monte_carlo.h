#pragma once

#include <nlohmann/json.hpp>
#include <vector>

namespace monte_carlo
{

using json = nlohmann::json;

double monteCarloPercentile(const std::vector<double> &results, double p);

json projectRetirement(
    double initialBalance,
    double monthlyContribution,
    double returnRate,
    int years,
    int simulations);

} // namespace monte_carlo
