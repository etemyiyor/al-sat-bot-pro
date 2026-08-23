ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN subscription_required INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS owner_claims (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  claimed_by_user_id TEXT,
  claimed_at INTEGER,
  FOREIGN KEY (claimed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO owner_claims (id, claimed_by_user_id, claimed_at) VALUES (1, NULL, NULL);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
