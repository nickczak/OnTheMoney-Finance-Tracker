import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import TransactionCard from "@/components/transactions/TransactionCard";
import type { Transaction } from "@/types/Transaction";

const baseTx: Transaction = {
  id: 1,
  fromAccountId: null,
  toAccountId: 1,
  amount: 1200.5,
  description: "Paycheck",
  date: "2026-08-06",
  type: "DEPOSIT",
};

describe("TransactionCard", () => {
  it("renders description, formatted amount, date, and type", () => {
    render(<TransactionCard transaction={baseTx} />);
    expect(screen.getByText("Paycheck")).toBeInTheDocument();
    expect(screen.getByText("$1,200.50")).toBeInTheDocument();
    expect(screen.getByText("Deposit")).toBeInTheDocument();
  });

  it("applies a + sign for deposits into the viewed account", () => {
    render(<TransactionCard transaction={baseTx} accountId={1} />);
    expect(screen.getByText("+$1,200.50")).toBeInTheDocument();
  });

  it("applies a - sign for withdrawals from the viewed account", () => {
    render(
      <TransactionCard
        transaction={{
          ...baseTx,
          type: "WITHDRAW",
          fromAccountId: 1,
          toAccountId: null,
        }}
        accountId={1}
      />,
    );
    expect(screen.getByText("-$1,200.50")).toBeInTheDocument();
  });

  it("renders the destination account for transfers", () => {
    render(
      <TransactionCard
        transaction={{
          ...baseTx,
          type: "TRANSFER",
          fromAccountId: 1,
          toAccountId: 2,
          description: "Transfer",
        }}
        accountId={1}
        toAccountName="Savings"
      />,
    );
    expect(
      screen.getByText((content) => content.includes("→ Savings")),
    ).toBeInTheDocument();
  });

  it("shows no sign when no accountId is provided", () => {
    render(<TransactionCard transaction={baseTx} />);
    expect(screen.getByText("$1,200.50")).toBeInTheDocument();
    expect(screen.queryByText("+$1,200.50")).not.toBeInTheDocument();
  });

  it("calls onEdit with the transaction when the card is clicked", () => {
    const onEdit = vi.fn();
    render(<TransactionCard transaction={baseTx} onEdit={onEdit} />);
    fireEvent.click(screen.getByText("Paycheck"));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(baseTx);
  });

  it("is not clickable when no onEdit is provided", () => {
    const { container } = render(<TransactionCard transaction={baseTx} />);
    expect(container.querySelector("button")).toHaveAttribute("disabled");
  });
});
