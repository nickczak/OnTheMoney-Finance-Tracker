#include "monte_carlo.h"

#include <iostream>
#include <nlohmann/json.hpp>
#include <string>

using json = nlohmann::json;

int main()
{
  std::ios_base::sync_with_stdio(false);
  std::cin.tie(nullptr);

  std::string line;
  while (std::getline(std::cin, line))
  {
    try
    {
      auto req = json::parse(line);
      auto action = req["action"].get<std::string>();

      if (action == "projectRetirement")
      {
        auto result = monte_carlo::projectRetirement(
            req["initialBalance"].get<double>(), req["monthlyContribution"].get<double>(),
            req["returnRate"].get<double>(), req["years"].get<int>(),
            req["simulations"].get<int>());
        std::cout << result.dump() << "\n" << std::flush;
      }
      else
      {
        std::cout << json({{"status", "error"}, {"message", "unknown action: " + action}}).dump()
                  << "\n"
                  << std::flush;
      }
    }
    catch (const std::exception &e)
    {
      try
      {
        std::cout << json({{"status", "error"}, {"message", e.what()}}).dump() << "\n"
                  << std::flush;
      }
      catch (...)
      {
        std::cout << "{\"status\":\"error\",\"message\":\"internal error\"}\n" << std::flush;
      }
    }
  }

  return 0;
}
