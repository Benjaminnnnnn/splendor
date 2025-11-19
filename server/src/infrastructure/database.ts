import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseConnection {
  private db: Database.Database;
  private static instance: DatabaseConnection | null = null;

  private constructor() {
    const dbPath = path.join(__dirname, '../../data/splendor.db');
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    this.initializeTables();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private initializeTables(): void {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_login INTEGER
      )
    `);

    // User stats table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        total_prestige_points INTEGER DEFAULT 0,
        total_cards_purchased INTEGER DEFAULT 0,
        total_nobles_acquired INTEGER DEFAULT 0,
        fastest_win_time INTEGER,
        highest_prestige_score INTEGER DEFAULT 0,
        favorite_gem_type TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Lobbies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lobbies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host_id TEXT NOT NULL,
        max_players INTEGER NOT NULL DEFAULT 4,
        min_players INTEGER NOT NULL DEFAULT 2,
        is_public INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'waiting',
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        game_id TEXT,
        FOREIGN KEY (host_id) REFERENCES users(id)
      )
    `);

    // Lobby participants table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lobby_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lobby_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        is_ready INTEGER NOT NULL DEFAULT 0,
        joined_at INTEGER NOT NULL,
        FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(lobby_id, user_id)
      )
    `);

    // Notifications table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Notification preferences table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id TEXT PRIMARY KEY,
        email_enabled INTEGER NOT NULL DEFAULT 1,
        push_enabled INTEGER NOT NULL DEFAULT 1,
        game_invites INTEGER NOT NULL DEFAULT 1,
  turn_reminders INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Game history table (for stats tracking)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_history (
        id TEXT PRIMARY KEY,
        game_data TEXT NOT NULL,
        winner_id TEXT,
        duration_seconds INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (winner_id) REFERENCES users(id)
      )
    `);

    // Game participants table (for tracking who played)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_history_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        final_score INTEGER NOT NULL DEFAULT 0,
        cards_purchased INTEGER NOT NULL DEFAULT 0,
        nobles_acquired INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (game_history_id) REFERENCES game_history(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  public query(sql: string, params?: any[]): any[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(params || []);
  }

  public get(sql: string, params?: any[]): any {
    const stmt = this.db.prepare(sql);
    return stmt.get(params || []);
  }

  public run(sql: string, params?: any[]): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return stmt.run(params || []);
  }

  public transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  public close(): void {
    this.db.close();
    DatabaseConnection.instance = null;
  }
}
