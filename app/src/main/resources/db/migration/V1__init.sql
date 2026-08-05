-- Initial schema. Column nullability mirrors the JPA entities exactly so that
-- Hibernate's ddl-auto=validate passes against a Flyway-migrated database.

CREATE TABLE accounts (
    id       BIGSERIAL PRIMARY KEY,
    name     VARCHAR(255),
    balance  NUMERIC(19, 2),
    acc_type VARCHAR(255)
);

CREATE TABLE transactions (
    id              BIGSERIAL PRIMARY KEY,
    from_account_id BIGINT,
    to_account_id   BIGINT,
    amount          NUMERIC(19, 2),
    description     VARCHAR(255),
    date            DATE,
    type            VARCHAR(255)
);

CREATE TABLE net_worth_history (
    id        BIGSERIAL PRIMARY KEY,
    net_worth NUMERIC(19, 2),
    date      DATE
);

CREATE TABLE credit_scores (
    id    BIGSERIAL PRIMARY KEY,
    score INTEGER NOT NULL,
    date  DATE
);

CREATE TABLE watchlist (
    id         BIGSERIAL PRIMARY KEY,
    symbol     VARCHAR(255) NOT NULL UNIQUE,
    added_date TIMESTAMP
);

CREATE INDEX idx_transactions_date ON transactions (date);
CREATE INDEX idx_transactions_from_account ON transactions (from_account_id);
CREATE INDEX idx_transactions_to_account ON transactions (to_account_id);
CREATE INDEX idx_net_worth_history_date ON net_worth_history (date);
