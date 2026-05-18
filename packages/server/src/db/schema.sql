CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'cash', 'investment', 'credit', 'loan')),
  balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'COP',
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'obligation', 'growth', 'transfer')),
  amount REAL NOT NULL,
  account_id TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  recurrence_frequency TEXT NOT NULL DEFAULT 'once',
  recurrence_interval INTEGER NOT NULL DEFAULT 1,
  recurrence_day_of_month INTEGER,
  recurrence_end_date TEXT,
  recurrence_max_occurrences INTEGER,
  category TEXT NOT NULL DEFAULT 'general',
  priority_level TEXT NOT NULL DEFAULT 'personal',
  priority_human INTEGER NOT NULL DEFAULT 5,
  priority_financial INTEGER NOT NULL DEFAULT 5,
  interest_rate REAL,
  total_periods INTEGER,
  amortization_type TEXT,
  scenario_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'personal',
  linked_account_id TEXT,
  monthly_contribution REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (linked_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lender TEXT NOT NULL DEFAULT '',
  debt_type TEXT NOT NULL DEFAULT 'loan' CHECK (debt_type IN ('loan', 'credit_card')),
  principal_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  annual_interest_rate REAL NOT NULL DEFAULT 0,
  amortization_type TEXT NOT NULL DEFAULT 'french',
  installment_value REAL NOT NULL DEFAULT 0,
  total_periods INTEGER NOT NULL,
  current_period INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  payment_frequency TEXT NOT NULL DEFAULT 'monthly',
  payment_day_of_month INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
  account_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  credit_limit REAL,
  minimum_payment_pct REAL,
  cut_off_day INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS credit_card_purchases (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  installments INTEGER NOT NULL DEFAULT 1,
  remaining_installments INTEGER NOT NULL DEFAULT 1,
  interest_rate REAL,
  is_paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO config (key, value) VALUES ('inflation_rate', '0.05');
INSERT OR IGNORE INTO config (key, value) VALUES ('currency', 'COP');
INSERT OR IGNORE INTO config (key, value) VALUES ('period_type', 'monthly');
