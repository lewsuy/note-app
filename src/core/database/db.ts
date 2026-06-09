// src/core/database/db.ts
// SQLite connection management using sql.js (pure JavaScript, no native compilation)
// Provides a compatibility layer matching the better-sqlite3 API

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { DB_FILENAME, NOTES_DIR, ATTACHMENTS_DIR } from '../../shared/constants';

// ─── sql.js compatibility wrapper ────────────────────────────────────────────

interface PreparedResult {
  get(...params: any[]): Record<string, any> | undefined;
  all(...params: any[]): Record<string, any>[];
  run(...params: any[]): void;
}

class SqlJsWrapper {
  private _db: SqlJsDatabase;
  private _dbPath: string;
  private _saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(db: SqlJsDatabase, dbPath: string) {
    this._db = db;
    this._dbPath = dbPath;
  }

  /** Execute raw SQL (one or multiple statements, no return value) */
  exec(sql: string): void {
    this._db.run(sql);
    this._scheduleSave();
  }

  /** Prepare a statement and return get/all/run methods */
  prepare(sql: string): PreparedResult {
    const wrapper = this;
    return {
      get(...params: any[]): Record<string, any> | undefined {
        const stmt = wrapper._db.prepare(sql);
        try {
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            return stmt.getAsObject() as Record<string, any>;
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      all(...params: any[]): Record<string, any>[] {
        const stmt = wrapper._db.prepare(sql);
        const rows: Record<string, any>[] = [];
        try {
          if (params.length > 0) stmt.bind(params);
          while (stmt.step()) {
            rows.push(stmt.getAsObject() as Record<string, any>);
          }
          return rows;
        } finally {
          stmt.free();
        }
      },

      run(...params: any[]): void {
        wrapper._db.run(sql, params);
        wrapper._scheduleSave();
      },
    };
  }

  /** Execute a pragma command */
  pragma(pragmaStr: string): void {
    this._db.run(`PRAGMA ${pragmaStr}`);
  }

  /** Run a function inside a transaction */
  transaction(fn: () => void): () => void {
    const wrapper = this;
    return () => {
      wrapper._db.run('BEGIN');
      try {
        fn();
        wrapper._db.run('COMMIT');
        wrapper._scheduleSave();
      } catch (err) {
        wrapper._db.run('ROLLBACK');
        throw err;
      }
    };
  }

  /** Close the database, saving first */
  close(): void {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    this._save();
    this._db.close();
  }

  /** Debounced save – batches rapid writes into a single disk flush */
  private _scheduleSave(): void {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._save();
    }, 200);
  }

  /** Write the in-memory database to disk */
  private _save(): void {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this._dbPath, buffer);
  }
}

// ─── Singleton state ─────────────────────────────────────────────────────────

let db: SqlJsWrapper | null = null;

/**
 * Get data directory path
 * Windows: %APPDATA%/note-app/data/
 */
export function getDataDir(): string {
  const dataDir = path.join(app.getPath('userData'), 'data');
  return dataDir;
}

/**
 * Ensure data directory structure exists
 */
function ensureDataDirs(dataDir: string): void {
  const dirs = [
    dataDir,
    path.join(dataDir, NOTES_DIR),
    path.join(dataDir, ATTACHMENTS_DIR),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Get database connection (singleton).
 * Uses sql.js (pure JS SQLite) with an on-disk persistence layer.
 */
export async function initDb(): Promise<SqlJsWrapper> {
  if (db) return db;

  // locateFile ensures sql.js can find its WASM binary at runtime,
  // especially important in packaged Electron apps where __dirname
  // points to the .vite/build/ directory alongside the WASM file.
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(__dirname, file),
  });
  const dataDir = getDataDir();
  ensureDataDirs(dataDir);
  const dbPath = path.join(dataDir, DB_FILENAME);

  let sqlite: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlite = new SQL.Database(fileBuffer);
  } else {
    sqlite = new SQL.Database();
  }

  // Enable foreign keys (WAL not applicable for sql.js in-memory)
  sqlite.run('PRAGMA foreign_keys = ON');

  db = new SqlJsWrapper(sqlite, dbPath);
  return db;
}

/**
 * Get the existing database connection (synchronous).
 * Must call initDb() first during app startup.
 */
export function getDb(): SqlJsWrapper {
  if (!db) {
    throw new Error('[DB] Database not initialized. Call initDb() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Run database migrations (must be called after initDb)
 */
export function runMigrations(): void {
  const database = getDb();

  // Create migrations version table
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  // Check current version
  const currentVersion = database.prepare(
    'SELECT MAX(version) as version FROM migrations'
  ).get() as { version: number | null } | undefined;

  const version = currentVersion?.version || 0;

  if (version < 1) {
    runMigration001(database);
  }
}

/**
 * Migration 001: Create initial schema
 */
function runMigration001(db: SqlJsWrapper): void {
  db.exec(`
    -- Folders table
    CREATE TABLE IF NOT EXISTS folders (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      parent_id    TEXT,
      sort_order   INTEGER DEFAULT 0,
      icon         TEXT DEFAULT 'folder',
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
    CREATE INDEX IF NOT EXISTS idx_folders_sort ON folders(parent_id, sort_order);

    -- Notes table
    CREATE TABLE IF NOT EXISTS notes (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      folder_id    TEXT NOT NULL,
      file_path    TEXT NOT NULL,
      is_pinned    INTEGER DEFAULT 0,
      word_count   INTEGER DEFAULT 0,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned DESC, updated_at DESC);

    -- Tags table
    CREATE TABLE IF NOT EXISTS tags (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL UNIQUE,
      color        TEXT DEFAULT '#409EFF',
      created_at   TEXT NOT NULL
    );

    -- Note-tag junction table
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id      TEXT NOT NULL,
      tag_id       TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);

    -- App settings table
    CREATE TABLE IF NOT EXISTS app_settings (
      key          TEXT PRIMARY KEY,
      value        TEXT NOT NULL
    );
  `);

  // Insert default settings
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)'
  );
  insertSetting.run('data_dir', getDataDir());
  insertSetting.run('editor_font_size', '14');
  insertSetting.run('editor_theme', 'light');
  insertSetting.run('auto_save_interval', '3000');
  insertSetting.run('last_opened_note', '');
  insertSetting.run('last_opened_folder', '');
  insertSetting.run('sidebar_width', '260');
  insertSetting.run('editor_preview_mode', 'split');

  // Record migration version
  db.prepare(
    "INSERT INTO migrations (version, name, applied_at) VALUES (1, '001-init', datetime('now'))"
  ).run();

  console.log('[DB] Migration 001-init completed');
}
