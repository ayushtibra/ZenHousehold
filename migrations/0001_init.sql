-- A household is shared by everyone who knows its join code.
CREATE TABLE households (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Last revision handed out; every write bumps it so clients can pull "everything after rev N".
  rev INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Generic synced rows (helpers, attendance entries, payments, future features) stored as JSON,
-- so new record kinds need no migration. Deletes are rows with data.deleted = true.
CREATE TABLE records (
  household TEXT NOT NULL,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  rev INTEGER NOT NULL,
  PRIMARY KEY (household, kind, id)
);

CREATE INDEX records_by_rev ON records (household, rev);
