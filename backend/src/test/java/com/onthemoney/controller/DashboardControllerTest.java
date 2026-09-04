package com.onthemoney.controller;

import static com.onthemoney.entity.AccountType.CHECKING;
import static com.onthemoney.entity.AccountType.CREDIT_CARD;
import static com.onthemoney.entity.AccountType.INVESTMENT;
import static com.onthemoney.entity.AccountType.LOAN;
import static com.onthemoney.entity.AccountType.SAVINGS;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.onthemoney.entity.AccountEntity;
import com.onthemoney.entity.AccountType;
import com.onthemoney.service.AuthService;
import java.math.BigDecimal;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DashboardControllerTest {

  @Autowired private WebApplicationContext context;
  @Autowired private AuthService authService;
  @Autowired private com.onthemoney.service.PortfolioService portfolioService;
  @Autowired private com.onthemoney.repository.NetWorthHistoryRepository netWorthHistoryRepository;

  private MockMvc mockMvc;

  @BeforeEach
  void setUpMockMvcWithSession() {
    // Every request carries a valid session token so it passes the AuthInterceptor.
    var session = authService.signup("dashboard@test.com", "password123", "Tester");
    token = session.getToken();
    testUser = session.getUser();
    mockMvc =
        MockMvcBuilders.webAppContextSetup(context)
            .defaultRequest(get("/").header("Authorization", "Bearer " + token))
            .build();
  }

  private String token;
  private com.onthemoney.entity.UserEntity testUser;

  private AccountEntity addAccount(String name, double balance, AccountType type) {
    return portfolioService.addAccount(name, BigDecimal.valueOf(balance), type, testUser);
  }

  private long firstTransactionId(String json) {
    var matcher = Pattern.compile("\"id\":(\\d+)").matcher(json);
    if (!matcher.find()) throw new IllegalStateException("no id found in: " + json);
    return Long.parseLong(matcher.group(1));
  }

  @Nested
  @DisplayName("Root & status")
  class RootAndStatus {

    @Test
    void rootReturnsGreeting() throws Exception {
      mockMvc
          .perform(get("/api/"))
          .andExpect(status().isOk())
          .andExpect(content().string("Greetings from the Dashboard Controller"));
    }

    @Test
    void statusExposesEngineStatus() throws Exception {
      mockMvc
          .perform(get("/api/status"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.engineStatus").isString());
    }
  }

  @Nested
  @DisplayName("Net worth")
  class NetWorth {

    @Test
    void startsAtZeroWhenNoAccountsExist() throws Exception {
      mockMvc
          .perform(get("/api/net-worth"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.netWorth").value(0.0));
    }

    @Test
    void increasesWithAssets() throws Exception {
      addAccount("asset", 1000.0, CHECKING);

      mockMvc
          .perform(get("/api/net-worth"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.netWorth").value(1000.0));
    }

    @Test
    void decreasesWithLiabilities() throws Exception {
      addAccount("asset", 1000.0, CHECKING);
      addAccount("creditCard", 500.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/net-worth"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.netWorth").value(500.0));
    }

    @Test
    void sumsAcrossMultipleAssetAndLiabilityAccounts() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("savings", 500.0, SAVINGS);
      addAccount("creditCard", 300.0, CREDIT_CARD);
      addAccount("loan", 200.0, LOAN);

      mockMvc
          .perform(get("/api/net-worth"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.netWorth").value(1000.0));
    }

    @Test
    void canGoNegativeWhenLiabilitiesExceedAssets() throws Exception {
      addAccount("asset", 1000.0, CHECKING);
      addAccount("creditCard", 1500.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/net-worth"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.netWorth").value(-500.0));
    }

    @Test
    void returnsZeroWhenAllAccountsHaveZeroBalance() throws Exception {
      addAccount("asset", 0.0, CHECKING);
      addAccount("creditCard", 0.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/net-worth"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.netWorth").value(0.0));
    }
  }

  @Nested
  @DisplayName("Total assets")
  class TotalAssets {

    @Test
    void reflectsAPositiveAsset() throws Exception {
      addAccount("checking", 1000.0, CHECKING);

      mockMvc
          .perform(get("/api/total-assets"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.totalAssets").value(1000.0));
    }

    @Test
    void sumsMultipleAssetAccountTypes() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("investment", 500.0, INVESTMENT);

      mockMvc
          .perform(get("/api/total-assets"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.totalAssets").value(1500.0));
    }

    @Test
    void excludesLiabilities() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("creditCard", 300.0, CREDIT_CARD);
      addAccount("loan", 200.0, LOAN);

      mockMvc
          .perform(get("/api/total-assets"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.totalAssets").value(1000.0));
    }

    @Test
    void returnsZeroWhenOnlyLiabilitiesOrZeroBalancesExist() throws Exception {
      addAccount("creditCard", 0.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/total-assets"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.totalAssets").value(0.0));
    }
  }

  @Nested
  @DisplayName("Total liabilities")
  class TotalLiabilities {

    @Test
    void reflectsACreditCardBalance() throws Exception {
      addAccount("creditCard", 500.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/total-liabilities"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.totalLiabilities").value(500.0));
    }

    @Test
    void sumsMultipleLiabilityAccountTypes() throws Exception {
      addAccount("creditCard", 300.0, CREDIT_CARD);
      addAccount("loan", 200.0, LOAN);

      mockMvc
          .perform(get("/api/total-liabilities"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.totalLiabilities").value(500.0));
    }

    @Test
    void excludesAssets() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("creditCard", 300.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/total-liabilities"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.totalLiabilities").value(300.0));
    }

    @Test
    void returnsZeroWhenNoLiabilitiesOrZeroBalancesExist() throws Exception {
      addAccount("checking", 500.0, CHECKING);

      mockMvc
          .perform(get("/api/total-liabilities"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.totalLiabilities").value(0.0));
    }
  }

  @Nested
  @DisplayName("In the red")
  class InTheRed {

    @Test
    void returnsTrueWhenNetWorthIsNegative() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("creditCard", 1500.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/in-the-red"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.inTheRed").value(true));
    }

    @Test
    void returnsFalseWhenNetWorthIsPositive() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("creditCard", 500.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/in-the-red"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.inTheRed").value(false));
    }

    @Test
    void returnsFalseWhenNetWorthIsZero() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("creditCard", 1000.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/in-the-red"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.inTheRed").value(false));
    }
  }

  @Nested
  @DisplayName("In the green")
  class InTheGreen {

    @Test
    void returnsTrueWhenNetWorthIsPositive() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("creditCard", 500.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/in-the-green"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.inTheGreen").value(true));
    }

    @Test
    void returnsFalseWhenNetWorthIsNegative() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("creditCard", 1500.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/in-the-green"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.inTheGreen").value(false));
    }

    @Test
    void returnsTrueWhenNetWorthIsZero() throws Exception {
      addAccount("checking", 1000.0, CHECKING);
      addAccount("creditCard", 1000.0, CREDIT_CARD);

      mockMvc
          .perform(get("/api/in-the-green"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.inTheGreen").value(true));
    }
  }

  @Nested
  @DisplayName("Projection")
  class Projection {

    @Test
    void rejectsSimulationsOverCap() throws Exception {
      mockMvc
          .perform(post("/api/project").param("simulations", "100001"))
          .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsNonPositiveSimulations() throws Exception {
      mockMvc
          .perform(post("/api/project").param("simulations", "0"))
          .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsNonPositiveYears() throws Exception {
      mockMvc.perform(post("/api/project").param("years", "0")).andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("Net worth history & snapshot")
  @Transactional
  class NetWorthHistory {

    @BeforeEach
    void clearHistory() {
      netWorthHistoryRepository.deleteAll();
    }

    @Test
    void historyIsEmptyArrayInitially() throws Exception {
      mockMvc
          .perform(get("/api/net-worth/history"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void snapshotRecordsCurrentNetWorth() throws Exception {
      addAccount("asset", 1000.0, CHECKING);
      addAccount("creditCard", 400.0, CREDIT_CARD);

      mockMvc
          .perform(post("/api/net-worth/snapshot"))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.status").value("recorded"));

      mockMvc
          .perform(get("/api/net-worth/history"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$[0].netWorth").value(600.0));
    }
  }

  @Nested
  @DisplayName("Accounts")
  class Accounts {

    @Test
    void listAllReturnsEmptyArrayInitially() throws Exception {
      mockMvc
          .perform(get("/api/accounts"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void createsAnAccount() throws Exception {
      mockMvc
          .perform(
              post("/api/accounts")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"name\":\"Savings\",\"balance\":500,\"accType\":\"SAVINGS\"}"))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.name").value("Savings"))
          .andExpect(jsonPath("$.balance").value(500.0))
          .andExpect(jsonPath("$.accType").value("SAVINGS"));
    }

    @Test
    void rejectsCreatingAnAccountWithNonPositiveBalance() throws Exception {
      mockMvc
          .perform(
              post("/api/accounts")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"name\":\"Bad\",\"balance\":0,\"accType\":\"CHECKING\"}"))
          .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsCreatingAnAccountWithUnknownType() throws Exception {
      mockMvc
          .perform(
              post("/api/accounts")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"name\":\"Bad\",\"balance\":100,\"accType\":\"NOT_A_TYPE\"}"))
          .andExpect(status().isBadRequest());
    }

    @Test
    void listsAccounts() throws Exception {
      addAccount("one", 100.0, CHECKING);
      addAccount("two", 200.0, SAVINGS);

      mockMvc
          .perform(get("/api/accounts"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void findsAnAccountByName() throws Exception {
      addAccount("target", 300.0, CHECKING);

      mockMvc
          .perform(get("/api/accounts").param("name", "target"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.name").value("target"))
          .andExpect(jsonPath("$.balance").value(300.0));
    }

    @Test
    void returnsNotFoundForUnknownAccountName() throws Exception {
      mockMvc
          .perform(get("/api/accounts").param("name", "missing"))
          .andExpect(status().isNotFound());
    }

    @Test
    void findsAnAccountById() throws Exception {
      var id = addAccount("by-id", 250.0, CHECKING).getId();

      mockMvc
          .perform(get("/api/accounts/{id}", id))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.name").value("by-id"));
    }

    @Test
    void returnsNotFoundForUnknownAccountId() throws Exception {
      mockMvc.perform(get("/api/accounts/99999")).andExpect(status().isNotFound());
    }

    @Test
    void updatesAnAccount() throws Exception {
      var id = addAccount("before", 100.0, CHECKING).getId();

      mockMvc
          .perform(
              put("/api/accounts/{id}", id)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"name\":\"after\",\"balance\":250}"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.name").value("after"))
          .andExpect(jsonPath("$.balance").value(250.0));
    }

    @Test
    void returnsNotFoundWhenUpdatingUnknownAccount() throws Exception {
      mockMvc
          .perform(
              put("/api/accounts/99999")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"name\":\"x\"}"))
          .andExpect(status().isNotFound());
    }

    @Test
    void deletesAnAccountById() throws Exception {
      var id = addAccount("doomed", 50.0, CHECKING).getId();

      mockMvc.perform(delete("/api/accounts/{id}", id)).andExpect(status().isNoContent());
    }

    @Test
    void deletingAnAccountRemovesItsTransactions() throws Exception {
      var account = addAccount("doomed", 50.0, CHECKING);
      mockMvc
          .perform(
              post("/api/accounts/{id}/deposit", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":25}"))
          .andExpect(status().isCreated());

      mockMvc
          .perform(delete("/api/accounts/{id}", account.getId()))
          .andExpect(status().isNoContent());

      mockMvc
          .perform(get("/api/transactions"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void deletesAllAccounts() throws Exception {
      addAccount("one", 100.0, CHECKING);
      addAccount("two", 200.0, SAVINGS);

      mockMvc.perform(delete("/api/accounts")).andExpect(status().isNoContent());

      mockMvc
          .perform(get("/api/accounts"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isEmpty());
    }
  }

  @Nested
  @DisplayName("Deposits & withdrawals")
  class DepositWithdraw {

    @Test
    void depositsIncreaseTheAccountBalance() throws Exception {
      var account = addAccount("checking", 500.0, CHECKING);

      mockMvc
          .perform(
              post("/api/accounts/{id}/deposit", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":100}"))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.amount").value(100.0))
          .andExpect(jsonPath("$.type").value("DEPOSIT"));

      mockMvc
          .perform(get("/api/accounts/{id}", account.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(600.0));
    }

    @Test
    void withdrawDecreaseTheAccountBalance() throws Exception {
      var account = addAccount("checking", 500.0, CHECKING);

      mockMvc
          .perform(
              post("/api/accounts/{id}/withdraw", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":150}"))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.amount").value(150.0))
          .andExpect(jsonPath("$.type").value("WITHDRAW"));

      mockMvc
          .perform(get("/api/accounts/{id}", account.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(350.0));
    }

    @Test
    void returnsNotFoundWhenDepositingToUnknownAccount() throws Exception {
      mockMvc
          .perform(
              post("/api/accounts/99999/deposit")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":10}"))
          .andExpect(status().isNotFound());
    }

    @Test
    void returnsNotFoundWhenWithdrawingFromUnknownAccount() throws Exception {
      mockMvc
          .perform(
              post("/api/accounts/99999/withdraw")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":10}"))
          .andExpect(status().isNotFound());
    }

    @Test
    void rejectsWithdrawalExceedingBalance() throws Exception {
      var account = addAccount("checking", 500.0, CHECKING);

      mockMvc
          .perform(
              post("/api/accounts/{id}/withdraw", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":600}"))
          .andExpect(status().isBadRequest());

      mockMvc
          .perform(get("/api/accounts/{id}", account.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(500.0));
    }

    @Test
    void allowsWithdrawalEqualToBalance() throws Exception {
      var account = addAccount("checking", 500.0, CHECKING);

      mockMvc
          .perform(
              post("/api/accounts/{id}/withdraw", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":500}"))
          .andExpect(status().isCreated());
    }

    @Test
    void rejectsInvalidDateOnDeposit() throws Exception {
      var account = addAccount("checking", 500.0, CHECKING);

      mockMvc
          .perform(
              post("/api/accounts/{id}/deposit", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":10,\"date\":\"not-a-date\"}"))
          .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsInvalidDateOnWithdraw() throws Exception {
      var account = addAccount("checking", 500.0, CHECKING);

      mockMvc
          .perform(
              post("/api/accounts/{id}/withdraw", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":10,\"date\":\"not-a-date\"}"))
          .andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("Transfers")
  class Transfers {

    @Test
    void movesMoneyBetweenAccounts() throws Exception {
      var from = addAccount("from", 1000.0, CHECKING);
      var to = addAccount("to", 0.0, SAVINGS);

      mockMvc
          .perform(
              post("/api/transfers")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      "{\"fromAccountId\":"
                          + from.getId()
                          + ",\"toAccountId\":"
                          + to.getId()
                          + ",\"amount\":300,\"description\":\"monthly move\"}"))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.amount").value(300.0))
          .andExpect(jsonPath("$.type").value("TRANSFER"))
          .andExpect(jsonPath("$.description").value("monthly move"));

      mockMvc
          .perform(get("/api/accounts/{id}", from.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(700.0));

      mockMvc
          .perform(get("/api/accounts/{id}", to.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(300.0));
    }

    @Test
    void returnsNotFoundWhenAnAccountIsMissing() throws Exception {
      var to = addAccount("to", 100.0, SAVINGS);

      mockMvc
          .perform(
              post("/api/transfers")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      "{\"fromAccountId\":99999,\"toAccountId\":" + to.getId() + ",\"amount\":10}"))
          .andExpect(status().isNotFound());
    }

    @Test
    void rejectsTransferToTheSameAccount() throws Exception {
      var account = addAccount("only", 1000.0, CHECKING);

      mockMvc
          .perform(
              post("/api/transfers")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      "{\"fromAccountId\":"
                          + account.getId()
                          + ",\"toAccountId\":"
                          + account.getId()
                          + ",\"amount\":100}"))
          .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsTransferExceedingSourceBalance() throws Exception {
      var from = addAccount("from", 200.0, CHECKING);
      var to = addAccount("to", 0.0, SAVINGS);

      mockMvc
          .perform(
              post("/api/transfers")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      "{\"fromAccountId\":"
                          + from.getId()
                          + ",\"toAccountId\":"
                          + to.getId()
                          + ",\"amount\":300}"))
          .andExpect(status().isBadRequest());

      mockMvc
          .perform(get("/api/accounts/{id}", from.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(200.0));
    }

    @Test
    void rejectsInvalidDateOnTransfer() throws Exception {
      var from = addAccount("from", 500.0, CHECKING);
      var to = addAccount("to", 0.0, SAVINGS);

      mockMvc
          .perform(
              post("/api/transfers")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      "{\"fromAccountId\":"
                          + from.getId()
                          + ",\"toAccountId\":"
                          + to.getId()
                          + ",\"amount\":100,\"date\":\"not-a-date\"}"))
          .andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("Transactions")
  class Transactions {

    @Test
    void returnsEmptyListInitially() throws Exception {
      mockMvc
          .perform(get("/api/transactions"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void listsTransactionsWithinDateRange() throws Exception {
      var account = addAccount("checking", 1000.0, CHECKING);
      mockMvc
          .perform(
              post("/api/accounts/{id}/deposit", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":50}"))
          .andExpect(status().isCreated());
      mockMvc
          .perform(
              post("/api/accounts/{id}/withdraw", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":30}"))
          .andExpect(status().isCreated());

      mockMvc
          .perform(get("/api/transactions").param("start", "2000-01-01").param("end", "2100-01-01"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void listsTransactionsForASpecificAccount() throws Exception {
      var account = addAccount("checking", 1000.0, CHECKING);
      mockMvc
          .perform(
              post("/api/accounts/{id}/deposit", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":50}"))
          .andExpect(status().isCreated());

      mockMvc
          .perform(get("/api/transactions").param("accountId", account.getId().toString()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$[0].toAccountId").value(account.getId()));
    }

    @Test
    void updatesATransaction() throws Exception {
      var account = addAccount("checking", 1000.0, CHECKING);
      mockMvc
          .perform(
              post("/api/accounts/{id}/deposit", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":50}"))
          .andExpect(status().isCreated());

      String body =
          mockMvc
              .perform(get("/api/transactions"))
              .andExpect(status().isOk())
              .andReturn()
              .getResponse()
              .getContentAsString();
      long txnId = firstTransactionId(body);

      mockMvc
          .perform(
              put("/api/transactions/{id}", txnId)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"description\":\"Rent\"}"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.description").value("Rent"));
    }

    @Test
    void returnsNotFoundWhenUpdatingUnknownTransaction() throws Exception {
      mockMvc
          .perform(
              put("/api/transactions/99999")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":10}"))
          .andExpect(status().isNotFound());
    }

    @Test
    void deletesATransaction() throws Exception {
      var account = addAccount("checking", 1000.0, CHECKING);
      mockMvc
          .perform(
              post("/api/accounts/{id}/deposit", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":50}"))
          .andExpect(status().isCreated());

      String body =
          mockMvc
              .perform(get("/api/transactions"))
              .andExpect(status().isOk())
              .andReturn()
              .getResponse()
              .getContentAsString();
      long txnId = firstTransactionId(body);

      mockMvc.perform(delete("/api/transactions/{id}", txnId)).andExpect(status().isNoContent());

      mockMvc
          .perform(get("/api/transactions"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void deletingADepositReturnsTheMoney() throws Exception {
      var account = addAccount("checking", 500.0, CHECKING);
      mockMvc
          .perform(
              post("/api/accounts/{id}/deposit", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":100}"))
          .andExpect(status().isCreated());

      String body =
          mockMvc
              .perform(get("/api/transactions"))
              .andExpect(status().isOk())
              .andReturn()
              .getResponse()
              .getContentAsString();
      long txnId = firstTransactionId(body);

      mockMvc.perform(delete("/api/transactions/{id}", txnId)).andExpect(status().isNoContent());

      mockMvc
          .perform(get("/api/accounts/{id}", account.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(500.0));
    }

    @Test
    void deletingAWithdrawRestoresTheMoney() throws Exception {
      var account = addAccount("checking", 500.0, CHECKING);
      mockMvc
          .perform(
              post("/api/accounts/{id}/withdraw", account.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"amount\":150}"))
          .andExpect(status().isCreated());

      String body =
          mockMvc
              .perform(get("/api/transactions"))
              .andExpect(status().isOk())
              .andReturn()
              .getResponse()
              .getContentAsString();
      long txnId = firstTransactionId(body);

      mockMvc.perform(delete("/api/transactions/{id}", txnId)).andExpect(status().isNoContent());

      mockMvc
          .perform(get("/api/accounts/{id}", account.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(500.0));
    }

    @Test
    void deletingATransferUndoesTheMove() throws Exception {
      var from = addAccount("from", 1000.0, CHECKING);
      var to = addAccount("to", 0.0, SAVINGS);
      mockMvc
          .perform(
              post("/api/transfers")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      "{\"fromAccountId\":"
                          + from.getId()
                          + ",\"toAccountId\":"
                          + to.getId()
                          + ",\"amount\":300}"))
          .andExpect(status().isCreated());

      String body =
          mockMvc
              .perform(get("/api/transactions"))
              .andExpect(status().isOk())
              .andReturn()
              .getResponse()
              .getContentAsString();
      long txnId = firstTransactionId(body);

      mockMvc.perform(delete("/api/transactions/{id}", txnId)).andExpect(status().isNoContent());

      mockMvc
          .perform(get("/api/accounts/{id}", from.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(1000.0));

      mockMvc
          .perform(get("/api/accounts/{id}", to.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.balance").value(0.0));
    }

    @Test
    void rejectsInvalidDateRangeOnTransactionList() throws Exception {
      mockMvc
          .perform(get("/api/transactions").param("start", "not-a-date"))
          .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsStartAfterEndOnTransactionList() throws Exception {
      mockMvc
          .perform(get("/api/transactions").param("start", "2026-06-01").param("end", "2026-01-01"))
          .andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("Credit score")
  class CreditScore {

    @Test
    void returnsZeroWhenNoScoreRecorded() throws Exception {
      mockMvc
          .perform(get("/api/credit-score"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.score").value(0));
    }

    @Test
    void recordsACreditScore() throws Exception {
      mockMvc
          .perform(
              post("/api/credit-score")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"score\":750}"))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.score").value(750));
    }

    @Test
    void returnsTheLatestScore() throws Exception {
      mockMvc
          .perform(
              post("/api/credit-score")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"score\":700}"))
          .andExpect(status().isCreated());
      mockMvc
          .perform(
              post("/api/credit-score")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"score\":755}"))
          .andExpect(status().isCreated());

      mockMvc
          .perform(get("/api/credit-score"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.score").value(755))
          .andExpect(jsonPath("$.previousScore").value(700));
    }

    @Test
    void rejectsScoreBelowRange() throws Exception {
      mockMvc
          .perform(
              post("/api/credit-score")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"score\":299}"))
          .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsScoreAboveRange() throws Exception {
      mockMvc
          .perform(
              post("/api/credit-score")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"score\":999}"))
          .andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("CORS preflight")
  class CorsPreflight {

    // The AuthInterceptor guards /api/** but must skip preflight OPTIONS
    // requests, which never carry an Authorization header. If it rejects them,
    // the browser blocks the real request and the web app fails with a
    // network-style "load failed" error right after login.
    @Test
    void preflightToAProtectedEndpointIsAnsweredWithoutAuth() throws Exception {
      MockMvcBuilders.webAppContextSetup(context)
          .build() // no default Authorization header
          .perform(
              options("/api/net-worth")
                  .header("Origin", "http://localhost:8081")
                  .header("Access-Control-Request-Method", "GET")
                  .header("Access-Control-Request-Headers", "authorization"))
          .andExpect(status().isOk())
          .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8081"));
    }
  }

  @Nested
  @DisplayName("Per-user isolation")
  class PerUserIsolation {

    @Test
    void secondUserSeesNoAccountsFromFirstUser() throws Exception {
      addAccount("mine", 1000.0, CHECKING);

      var other = authService.signup("other@test.com", "password123", "Other");

      // The owner sees the account.
      mockMvc
          .perform(get("/api/accounts"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.length()").value(1));

      // The other user sees an empty list and cannot read the account by id.
      mockMvc
          .perform(get("/api/accounts").header("Authorization", "Bearer " + other.getToken()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.length()").value(0));
      long id = addAccount("second", 10.0, SAVINGS).getId();
      mockMvc
          .perform(get("/api/accounts/" + id).header("Authorization", "Bearer " + other.getToken()))
          .andExpect(status().isNotFound());
    }

    @Test
    void netWorthIsScopedToTheCallingUser() throws Exception {
      addAccount("mine", 1000.0, CHECKING);
      var other = authService.signup("rich@test.com", "password123", "Rich");
      portfolioService.addAccount(
          "theirs", java.math.BigDecimal.valueOf(9999.0), INVESTMENT, other.getUser());

      mockMvc
          .perform(get("/api/net-worth"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.netWorth").value(1000.0));
      mockMvc
          .perform(get("/api/net-worth").header("Authorization", "Bearer " + other.getToken()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.netWorth").value(9999.0));
    }
  }
}
