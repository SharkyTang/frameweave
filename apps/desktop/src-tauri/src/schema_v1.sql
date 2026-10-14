CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE assets(
 id TEXT PRIMARY KEY, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
 description TEXT NOT NULL DEFAULT '', learning_goal TEXT NOT NULL DEFAULT '',
 original_filename TEXT NOT NULL, source_kind TEXT NOT NULL DEFAULT 'manual_import' CHECK(source_kind='manual_import'),
 managed_relpath TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL UNIQUE CHECK(length(sha256)=64),
 byte_size INTEGER NOT NULL CHECK(byte_size>0), favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0,1)),
 archived_at INTEGER, revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0), imported_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 duration_ms INTEGER, width INTEGER, height INTEGER, playback_status TEXT NOT NULL DEFAULT 'unknown'
);
CREATE TABLE tags(id INTEGER PRIMARY KEY, name TEXT NOT NULL, normalized TEXT NOT NULL UNIQUE);
CREATE TABLE asset_tags(asset_id TEXT NOT NULL REFERENCES assets(id), tag_id INTEGER NOT NULL REFERENCES tags(id), position INTEGER NOT NULL, PRIMARY KEY(asset_id,tag_id));
CREATE TABLE import_attempts(
 id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, candidate_id TEXT NOT NULL, original_filename TEXT NOT NULL, title TEXT NOT NULL,
 stage_relpath TEXT NOT NULL UNIQUE, target_relpath TEXT NOT NULL, state TEXT NOT NULL,
 bytes_copied INTEGER NOT NULL DEFAULT 0, total_bytes INTEGER NOT NULL DEFAULT 0,
 sha256 TEXT, asset_id TEXT REFERENCES assets(id), error_json TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX import_batch ON import_attempts(batch_id,created_at,id);
INSERT INTO schema_migrations VALUES(1, CAST(strftime('%s','now') AS INTEGER)*1000);
PRAGMA user_version=1;
