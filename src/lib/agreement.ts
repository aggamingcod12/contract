import "server-only";
import Database from "better-sqlite3";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

export type Party = "mentor" | "student";
export type Signature = { name: string; image: string; signed_at: string; evidence?: { user_agent?: string; ip?: string; battery?: { level: number; charging: boolean }; location?: { latitude: number; longitude: number; accuracy: number } } };
export type Agreement = {
  id: string; status: "awaiting_signatures" | "partially_signed" | "fully_signed" | "withdrawn";
  mentor: Signature | null; student: Signature | null; created_at: string;
};

type Row = { id: string; status: Agreement["status"]; mentor: string | null; student: string | null; created_at: string };
type AuditRow = { id: number; agreement_id: string; event: string; party: string | null; metadata: string; created_at: string };
type DbGlobal = typeof globalThis & { halfGirlfriendDb?: Database.Database };

function openDb() {
  const globalDb = globalThis as DbGlobal;
  if (globalDb.halfGirlfriendDb) return globalDb.halfGirlfriendDb;
  const requested = process.env.SQLITE_PATH || join(process.cwd(), "data", "agreement.sqlite3");
  const path = isAbsolute(requested) ? requested : join(process.cwd(), requested);
  mkdirSync(dirname(path), { recursive: true });
  const database = new Database(path);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
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
    CREATE TABLE IF NOT EXISTS agreement_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS signing_invites (
      token_hash TEXT PRIMARY KEY,
      party TEXT NOT NULL CHECK(party IN ('mentor','student')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      revoked_at TEXT
    );
  `);
  globalDb.halfGirlfriendDb = database;
  return database;
}

export function configuredId() {
  const configured = process.env.AGREEMENT_ID?.trim();
  if (configured) return configured;

  const database = openDb();
  const stored = database.prepare("SELECT value FROM agreement_settings WHERE key = 'agreement_id'").get() as { value: string } | undefined;
  if (stored) return stored.value;

  const legacy = database.prepare("SELECT id FROM agreements WHERE id = 'HG-2026-XXXXX'").get() as { id: string } | undefined;
  const generated = legacy?.id ?? `HG-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  database.prepare("INSERT OR IGNORE INTO agreement_settings (key, value) VALUES ('agreement_id', ?)").run(generated);
  return (database.prepare("SELECT value FROM agreement_settings WHERE key = 'agreement_id'").get() as { value: string }).value;
}

export function tokenParty(token: string | null): Party | null {
  if (!token) return null;
  if (process.env.PARTY_A_TOKEN && token === process.env.PARTY_A_TOKEN) return "mentor";
  if (process.env.PARTY_B_TOKEN && token === process.env.PARTY_B_TOKEN) return "student";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = openDb().prepare("SELECT party FROM signing_invites WHERE token_hash = ? AND revoked_at IS NULL").get(tokenHash) as { party: Party } | undefined;
  return invite?.party ?? null;
}

export function createSigningInvite(party: Party) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const database = openDb();
  const issue = database.transaction(() => {
    database.prepare("UPDATE signing_invites SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE party = ? AND revoked_at IS NULL").run(party);
    database.prepare("INSERT INTO signing_invites (token_hash, party) VALUES (?, ?)").run(tokenHash, party);
  });
  issue.immediate();
  return token;
}

function fromRow(row: Row | undefined): Agreement | null {
  if (!row) return null;
  return { ...row, mentor: row.mentor ? JSON.parse(row.mentor) as Signature : null, student: row.student ? JSON.parse(row.student) as Signature : null };
}

export function fetchAgreement(id: string): Agreement | null {
  const row = openDb().prepare("SELECT * FROM agreements WHERE id = ?").get(id) as Row | undefined;
  return fromRow(row);
}

export function getOrCreateAgreement(id: string): Agreement {
  const database = openDb();
  const create = database.transaction(() => {
    database.prepare("INSERT OR IGNORE INTO agreements (id, status) VALUES (?, 'awaiting_signatures')").run(id);
    const row = database.prepare("SELECT * FROM agreements WHERE id = ?").get(id) as Row;
    if (row.mentor === null && row.student === null && row.status === "awaiting_signatures") {
      const created = database.prepare("SELECT 1 FROM agreement_audit WHERE agreement_id = ? AND event = 'created' LIMIT 1").get(id);
      if (!created) database.prepare("INSERT INTO agreement_audit (agreement_id, event) VALUES (?, 'created')").run(id);
    }
    return fromRow(row)!;
  });
  return create.immediate();
}

export function signAgreement(id: string, party: Party, signature: Signature): Agreement {
  const database = openDb();
  const sign = database.transaction(() => {
    const current = database.prepare("SELECT * FROM agreements WHERE id = ?").get(id) as Row | undefined;
    if (!current) throw Object.assign(new Error("Agreement not found"), { statusCode: 404 });
    if (current.status === "fully_signed" || current.status === "withdrawn") throw Object.assign(new Error("Agreement is closed"), { statusCode: 409 });
    if (current[party] !== null) throw Object.assign(new Error("Party has already signed"), { statusCode: 409 });
    const mentor = party === "mentor" ? JSON.stringify(signature) : current.mentor;
    const student = party === "student" ? JSON.stringify(signature) : current.student;
    const status = mentor && student ? "fully_signed" : "partially_signed";
    database.prepare("UPDATE agreements SET mentor = ?, student = ?, status = ? WHERE id = ?").run(mentor, student, status, id);
    database.prepare("INSERT INTO agreement_audit (agreement_id, event, party, metadata) VALUES (?, 'signed', ?, ?)").run(id, party, JSON.stringify({ name: signature.name, evidence: signature.evidence ?? {} }));
    return fromRow(database.prepare("SELECT * FROM agreements WHERE id = ?").get(id) as Row)!;
  });
  return sign.immediate();
}

export function withdrawAgreement(id: string, party: Party): Agreement {
  const database = openDb();
  const withdraw = database.transaction(() => {
    const current = database.prepare("SELECT * FROM agreements WHERE id = ?").get(id) as Row | undefined;
    if (!current) throw Object.assign(new Error("Agreement not found"), { statusCode: 404 });
    if (current.status === "withdrawn") throw Object.assign(new Error("Agreement has already been withdrawn"), { statusCode: 409 });
    database.prepare("UPDATE agreements SET status = 'withdrawn' WHERE id = ?").run(id);
    database.prepare("INSERT INTO agreement_audit (agreement_id, event, party, metadata) VALUES (?, 'withdrawn', ?, '{}')").run(id, party);
    return fromRow(database.prepare("SELECT * FROM agreements WHERE id = ?").get(id) as Row)!;
  });
  return withdraw.immediate();
}

export function getAuditTrail(id: string): AuditRow[] {
  return openDb().prepare("SELECT * FROM agreement_audit WHERE agreement_id = ? ORDER BY id").all(id) as AuditRow[];
}
