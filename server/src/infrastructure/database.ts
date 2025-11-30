import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class DatabaseConnection {
  private db: Database.Database;
  private static instance: DatabaseConnection | null = null;

  private constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? process.env.DATABASE_PATH ?? path.join(__dirname, '../../data/splendor.db');
    const dbDir = path.dirname(resolvedPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.db.pragma('foreign_keys = ON');
    this.initializeTables();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Creates a database connection at the provided path (useful for tests).
   * Does not affect the global singleton.
   */
  public static createAtPath(dbPath: string): DatabaseConnection {
    return new DatabaseConnection(dbPath);
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
        user_id TEXT NOT NULL UNIQUE,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        total_prestige_points INTEGER DEFAULT 0,
        total_cards_purchased INTEGER DEFAULT 0,
        total_nobles_acquired INTEGER DEFAULT 0,
        fastest_win_time INTEGER,
        highest_prestige_score INTEGER DEFAULT 0,
        favorite_gem_type TEXT,
        virtual_currency INTEGER DEFAULT 1000,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
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

    // Bets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bets (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        odds REAL NOT NULL DEFAULT 1.0,
        status TEXT NOT NULL DEFAULT 'pending',
        payout INTEGER,
        created_at INTEGER NOT NULL,
        settled_at INTEGER
      )
    `);

    // Create index for faster bet queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bets_game_id ON bets(game_id)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id)
    `);
    // Achievement catalog
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        unlock_type TEXT NOT NULL CHECK (unlock_type IN ('threshold', 'ratio', 'composite')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Achievement criteria (supports multi-condition or ratio-based unlocks)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS achievement_criteria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        achievement_id INTEGER NOT NULL,
        stat_key TEXT NOT NULL,
        comparator TEXT NOT NULL CHECK (comparator IN ('>=', '<=', '>', '<', '=')),
        target_value REAL NOT NULL,
        denominator_stat_key TEXT,
        min_sample_size INTEGER,
        notes TEXT,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
      )
    `);

    // User achievement state
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        achievement_id INTEGER NOT NULL,
        unlocked_at INTEGER NOT NULL,
        progress_value REAL,
        progress_detail TEXT,
        notified_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
        UNIQUE(user_id, achievement_id)
      )
    `);

    // Indexes to speed lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_achievement_code ON achievements(code);
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
    `);
    // Friendships table (bidirectional relationships)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id_1 TEXT NOT NULL,
        user_id_2 TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id_1) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id_2) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id_1, user_id_2)
      )
    `);

    // Friend requests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id TEXT NOT NULL,
        to_user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(from_user_id, to_user_id)
      )
    `);

    // Chat messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        recipient_id TEXT,
        game_id TEXT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
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
