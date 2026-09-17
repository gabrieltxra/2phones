PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER','ADMIN')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE user_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'PBKDF2-SHA256',
  iterations INTEGER NOT NULL DEFAULT 100000,
  changed_at INTEGER NOT NULL
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  user_agent TEXT
);
CREATE TABLE licenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('UNLIMITED','CASE')),
  case_id TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, kind, case_id)
);
CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  cover_key TEXT,
  duration_min INTEGER NOT NULL,
  duration_max INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  free_checkpoint INTEGER NOT NULL,
  current_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE case_versions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  definition_json TEXT NOT NULL,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(case_id, version)
);
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  case_id TEXT NOT NULL REFERENCES cases(id),
  case_version INTEGER NOT NULL,
  host_user_id TEXT REFERENCES users(id),
  status TEXT NOT NULL CHECK(status IN ('WAITING','READY','PLAYING','PAYWALL','COMPLETED','ABANDONED')),
  progress INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER,
  completed_at INTEGER,
  last_activity_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE room_players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT CHECK(role IN ('ARCHIVE','FIELD')),
  reconnect_token_hash TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  connected INTEGER NOT NULL DEFAULT 0 CHECK(connected IN (0,1)),
  UNIQUE(room_id, role)
);
CREATE TABLE room_events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id TEXT,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT NOT NULL UNIQUE,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  case_id TEXT NOT NULL REFERENCES cases(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING','COMPLETED','FAILED','REFUNDED')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE entitlements (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id),
  source TEXT NOT NULL,
  purchase_id TEXT REFERENCES purchases(id),
  created_at INTEGER NOT NULL,
  UNIQUE(room_id, case_id)
);
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL
);
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  room_id TEXT,
  case_id TEXT,
  locale TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE login_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  window_started_at INTEGER NOT NULL,
  blocked_until INTEGER
);

CREATE INDEX idx_rooms_status ON rooms(status, last_activity_at);
CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_room_events_room_time ON room_events(room_id, created_at);
CREATE INDEX idx_analytics_name_time ON analytics_events(event_name, created_at);
CREATE INDEX idx_purchases_room ON purchases(room_id, created_at);

INSERT INTO cases (id, slug, title, active, duration_min, duration_max, price_cents, currency, free_checkpoint, current_version, created_at, updated_at)
VALUES ('case-room-404', 'room-404', 'ROOM 404', 1, 25, 40, 499, 'USD', 3, 1, unixepoch() * 1000, unixepoch() * 1000)
ON CONFLICT(id) DO NOTHING;

INSERT INTO case_versions (id, case_id, version, definition_json, published_at, created_at)
VALUES ('case-room-404-v1', 'case-room-404', 1, '{"slug":"room-404","version":1}', unixepoch() * 1000, unixepoch() * 1000)
ON CONFLICT(id) DO NOTHING;
