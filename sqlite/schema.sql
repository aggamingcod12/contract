-- SQLite DDL applied automatically by src/lib/agreement.ts.
CREATE TABLE IF NOT EXISTS agreements (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'awaiting_signatures'
    CHECK(status IN ('awaiting_signatures','partially_signed','fully_signed','withdrawn')),
  mentor TEXT,
  student TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK(status <> 'fully_signed' OR (mentor IS NOT NULL AND student IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS agreement_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agreement_id TEXT NOT NULL REFERENCES agreements(id),
  event TEXT NOT NULL CHECK(event IN ('created','signed','withdrawn')),
  party TEXT CHECK(party IN ('mentor','student')),
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS signing_invites (
  token_hash TEXT PRIMARY KEY,
  party TEXT NOT NULL CHECK(party IN ('mentor','student')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS agreement_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
