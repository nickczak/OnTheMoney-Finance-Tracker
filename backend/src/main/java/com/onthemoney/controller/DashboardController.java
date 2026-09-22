package com.onthemoney.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onthemoney.dto.CreditScoreRequest;
import com.onthemoney.dto.UpdateAccountRequest;
import com.onthemoney.dto.UpdateTransactionRequest;
import com.onthemoney.entity.CreditScoreEntity;
import com.onthemoney.entity.UserEntity;
import com.onthemoney.repository.CreditScoreRepository;
import com.onthemoney.service.PortfolioService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api") // route prefix (relativeTo: url)
@Validated // enables @Positive/@NotBlank on @RequestParam/@PathVariable
public class DashboardController {

  private final PortfolioService portfolioService;
  private final CreditScoreRepository creditScoreRepo;
  private final ObjectMapper mapper; // handles all JSON serialization

  public DashboardController(
      PortfolioService portfolioService,
      CreditScoreRepository creditScoreRepo,
      ObjectMapper mapper) {
    this.portfolioService = portfolioService;
    this.creditScoreRepo = creditScoreRepo;
    this.mapper = mapper;
  }

  @GetMapping("/") // Spring Annotation (root)
  public String index() {
    return "Greetings from the Dashboard Controller";
  }

  @GetMapping("/status")
  public JsonNode getEngineStatus() { // return JsonNode (returns a JSON object)
    var status = mapper.createObjectNode(); // ObjectNode (a subclass os Jsonnode
    status.put(
        "engineStatus",
        portfolioService.isRunning()
            ? "online"
            : "offline"); // add stirng field to JSON object (key : value)
    return status; // Spring serializes status to the HTTP resposne body as {"engineStatus":
    // "online"}
  }

  // Computation endpoints

  @GetMapping("/net-worth")
  public JsonNode getNetWorth(@RequestAttribute("currentUser") UserEntity currentUser) {
    var result = mapper.createObjectNode();
    result.put("netWorth", portfolioService.netWorth(currentUser));
    return result;
  }

  @GetMapping("/total-assets")
  public JsonNode getTotalAssets(@RequestAttribute("currentUser") UserEntity currentUser) {
    var result = mapper.createObjectNode();
    result.put("totalAssets", portfolioService.totalAssets(currentUser));
    return result;
  }

  @GetMapping("/total-liabilities")
  public JsonNode getTotalLiabilities(@RequestAttribute("currentUser") UserEntity currentUser) {
    var result = mapper.createObjectNode();
    result.put("totalLiabilities", portfolioService.totalLiabilities(currentUser));
    return result;
  }

  @GetMapping("/in-the-red")
  public JsonNode getInTheRed(@RequestAttribute("currentUser") UserEntity currentUser) {
    var result = mapper.createObjectNode();
    result.put("inTheRed", portfolioService.inTheRed(currentUser));
    return result;
  }

  @GetMapping("/in-the-green")
  public JsonNode getInTheGreen(@RequestAttribute("currentUser") UserEntity currentUser) {
    var result = mapper.createObjectNode();
    result.put("inTheGreen", portfolioService.inTheGreen(currentUser));
    return result;
  }

  @GetMapping("/net-worth/history")
  public JsonNode getNetWorthHistory(@RequestAttribute("currentUser") UserEntity currentUser) {
    return mapper.valueToTree(portfolioService.getNetWorthHistory(currentUser));
  }

  @PostMapping("/net-worth/snapshot")
  @ResponseStatus(HttpStatus.CREATED)
  public JsonNode recordSnapshot(@RequestAttribute("currentUser") UserEntity currentUser) {
    portfolioService.recordSnapshot(currentUser);
    var result = mapper.createObjectNode();
    result.put("status", "recorded");
    return result; // return {"status": "recorded"}
  }

  @PostMapping("/project")
  public JsonNode
      projectRetirement( // @Positive annotation triggers a 400 Bad Request automatically if the
          // value is zero or negative
          @RequestParam(defaultValue = "10000") @Positive double initialBalance,
          @RequestParam(defaultValue = "500") @Positive double monthlyContribution,
          @RequestParam(defaultValue = "7") double returnRate,
          @RequestParam(defaultValue = "30") @Positive int years,
          @RequestParam(defaultValue = "10000") @Positive int simulations)
          throws
              IOException { // can throw IOException because the service writes and reads from a C++
    // process, Spring will catch it and return a 500 Internal Server Error
    if (simulations > 100_000) {
      // Cap simulations so the C++ engine can't be asked to allocate
      // unbounded memory (simulations x years trajectories).
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "simulations must be 100000 or less");
    }
    return portfolioService
        .projectRetirement( // pass return value straight through (JSON read from stdout)
            initialBalance, monthlyContribution, returnRate / 100, years, simulations);
  }

  // Account endpoints

  @GetMapping("/accounts")
  public JsonNode getAccounts(@RequestAttribute("currentUser") UserEntity currentUser) {
    return mapper.valueToTree(portfolioService.getAllAccounts(currentUser));
  }

  @GetMapping("/accounts/{id}")
  public JsonNode getAccountById(
      @PathVariable Long id, @RequestAttribute("currentUser") UserEntity currentUser) {
    var account = portfolioService.getAccountById(id, currentUser);
    if (account == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "account not found");
    }
    return mapper.valueToTree(account);
  }

  // Delete endpoints

  @DeleteMapping("/accounts/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteAccountById(
      @PathVariable Long id, @RequestAttribute("currentUser") UserEntity currentUser) {
    if (!portfolioService.deleteAccountById(id, currentUser)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "account not found");
    }
  }

  @PutMapping("/accounts/{id}")
  public JsonNode updateAccount(
      @PathVariable Long id,
      @Valid @RequestBody UpdateAccountRequest request,
      @RequestAttribute("currentUser") UserEntity currentUser) {
    var account =
        portfolioService.updateAccount(
            id, request.name(), request.balance(), request.accType(), currentUser);
    if (account == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "account not found");
    }
    return mapper.valueToTree(account);
  }

  // Transaction endpoints

  @GetMapping("/transactions")
  public JsonNode getTransactions(
      @RequestParam Long accountId, @RequestAttribute("currentUser") UserEntity currentUser) {
    return mapper.valueToTree(portfolioService.getTransactionsByAccount(accountId, currentUser));
  }

  @PutMapping("/transactions/{id}")
  public JsonNode updateTransaction(
      @PathVariable Long id,
      @Valid @RequestBody UpdateTransactionRequest request,
      @RequestAttribute("currentUser") UserEntity currentUser) {
    LocalDate d = parseDate(request.date());
    var t =
        portfolioService.updateTransaction(
            id, request.amount(), request.description(), d, currentUser);
    if (t == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "transaction not found");
    }
    return mapper.valueToTree(t);
  }

  @DeleteMapping("/transactions/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteTransaction(
      @PathVariable Long id, @RequestAttribute("currentUser") UserEntity currentUser) {
    portfolioService.deleteTransaction(id, currentUser);
  }

  // Credit score endpoints

  @GetMapping("/credit-score")
  public JsonNode getCreditScore(@RequestAttribute("currentUser") UserEntity currentUser) {
    var result = mapper.createObjectNode();
    var recent = creditScoreRepo.findTop2ByUserOrderByDateDescIdDesc(currentUser);
    if (!recent.isEmpty()) {
      CreditScoreEntity latest = recent.get(0);
      result.put("score", latest.getScore());
      result.put("date", latest.getDate() != null ? latest.getDate().toString() : null);
      result.put("id", latest.getId());
      if (recent.size() > 1) {
        result.put("previousScore", recent.get(1).getScore());
      } else {
        result.putNull("previousScore");
      }
    } else {
      result.put("score", 0);
      result.put("date", (String) null);
      result.put("id", 0);
      result.putNull("previousScore");
    }
    return result;
  }

  @PostMapping("/credit-score")
  @ResponseStatus(HttpStatus.CREATED)
  public JsonNode recordCreditScore(
      @RequestAttribute("currentUser") UserEntity currentUser,
      @Valid @RequestBody CreditScoreRequest request) {
    CreditScoreEntity cs = new CreditScoreEntity();
    cs.setUser(currentUser);
    cs.setScore(request.score());
    cs.setDate(LocalDate.now());
    creditScoreRepo.save(cs);
    var result = mapper.createObjectNode();
    result.put("score", cs.getScore());
    result.put("date", cs.getDate().toString());
    result.put("id", cs.getId());
    return result;
  }

  private static LocalDate parseDate(String date) {
    if (date == null) return null;
    try {
      return LocalDate.parse(date, DateTimeFormatter.ISO_LOCAL_DATE);
    } catch (DateTimeParseException e) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "invalid date format, expected yyyy-MM-dd");
    }
  }
}
