import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnection } from '../infrastructure/database';
import { HashingService } from '../infrastructure/hashingService';
import { EmailProvider } from '../infrastructure/emailProvider';
import { User, UserStats, GameStatsUpdate } from '../../../shared/types/user';

export class UserService {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async registerUser(username: string, email: string, password: string): Promise<User> {
    // Validation
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = this.db.get(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    
    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    const passwordHash = await HashingService.hashPassword(password);
    
    const userId = uuidv4();
    const now = Date.now();

    this.db.transaction(() => {
      // Create user
      this.db.run(
        'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        [userId, username, email, passwordHash, now]
      );

      // Create user stats
      this.db.run(
        'INSERT INTO user_stats (user_id, created_at, updated_at) VALUES (?, ?, ?)',
        [userId, now, now]
      );

      // Create notification preferences
      this.db.run(
        'INSERT INTO notification_preferences (user_id) VALUES (?)',
        [userId]
      );
    });

    await EmailProvider.sendWelcomeEmail(email, username);

    const user: User = {
      id: userId,
      username,
      email,
      created_at: new Date(now),
    };

    return user;
  }

  async loginUser(email: string, password: string): Promise<User> {
    const userRow = this.db.get(
      'SELECT id, username, email, password_hash, created_at, last_login FROM users WHERE email = ?',
      [email]
    );

    if (!userRow) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await HashingService.comparePassword(password, userRow.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    const now = Date.now();
    this.db.run('UPDATE users SET last_login = ? WHERE id = ?', [now, userRow.id]);

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      created_at: new Date(userRow.created_at),
      last_login: new Date(now),
    };

    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    const userRow = this.db.get(
      'SELECT id, username, email, created_at, last_login FROM users WHERE id = ?',
      [userId]
    );

    if (!userRow) {
      return null;
    }

    return {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      created_at: new Date(userRow.created_at),
      last_login: userRow.last_login ? new Date(userRow.last_login) : undefined,
    };
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    const statsRow = this.db.get(
      'SELECT * FROM user_stats WHERE user_id = ?',
      [userId]
    );

    if (!statsRow) {
      return null;
    }

    return {
      id: statsRow.id,
      user_id: statsRow.user_id,
      games_played: statsRow.games_played,
      games_won: statsRow.games_won,
      total_prestige_points: statsRow.total_prestige_points,
      total_cards_purchased: statsRow.total_cards_purchased,
      total_nobles_acquired: statsRow.total_nobles_acquired,
      fastest_win_time: statsRow.fastest_win_time,
      highest_prestige_score: statsRow.highest_prestige_score,
      favorite_gem_type: statsRow.favorite_gem_type,
      virtual_currency: statsRow.virtual_currency || 1000,
      created_at: new Date(statsRow.created_at),
      updated_at: new Date(statsRow.updated_at),
    };
  }

  async updateUserStats(userId: string, update: GameStatsUpdate): Promise<UserStats> {
    const now = Date.now();

    const currentStats = await this.getUserStats(userId);
    if (!currentStats) {
      throw new Error('User stats not found');
    }

    // Calculate new stats
    const newGamesPlayed = currentStats.games_played + update.gamesPlayed;
    const newGamesWon = currentStats.games_won + update.gamesWon;
    const newTotalPrestige = currentStats.total_prestige_points + update.totalPrestigePoints;
    const newTotalCards = currentStats.total_cards_purchased + update.totalCardsPurchased;
    const newTotalNobles = currentStats.total_nobles_acquired + update.totalNoblesAcquired;
    
    // Update fastest win time if applicable
    let newFastestWin = currentStats.fastest_win_time;
    if (update.fastestWinTime && (!newFastestWin || update.fastestWinTime < newFastestWin)) {
      newFastestWin = update.fastestWinTime;
    }

    // Update highest prestige score
    let newHighestScore = currentStats.highest_prestige_score;
    if (update.highestPrestigeScore > newHighestScore) {
      newHighestScore = update.highestPrestigeScore;
    }

    // Update favorite gem type (most commonly used)
    const favoriteGem = update.favoriteGemType || currentStats.favorite_gem_type;

    this.db.run(
      `UPDATE user_stats SET 
        games_played = ?, 
        games_won = ?, 
        total_prestige_points = ?,
        total_cards_purchased = ?,
        total_nobles_acquired = ?,
        fastest_win_time = ?,
        highest_prestige_score = ?,
        favorite_gem_type = ?,
        updated_at = ?
      WHERE user_id = ?`,
      [
        newGamesPlayed,
        newGamesWon,
        newTotalPrestige,
        newTotalCards,
        newTotalNobles,
        newFastestWin,
        newHighestScore,
        favoriteGem,
        now,
        userId,
      ]
    );

    return {
      id: currentStats.id,
      user_id: userId,
      games_played: newGamesPlayed,
      games_won: newGamesWon,
      total_prestige_points: newTotalPrestige,
      total_cards_purchased: newTotalCards,
      total_nobles_acquired: newTotalNobles,
      fastest_win_time: newFastestWin,
      highest_prestige_score: newHighestScore,
      favorite_gem_type: favoriteGem,
      virtual_currency: currentStats.virtual_currency,
      created_at: currentStats.created_at,
      updated_at: new Date(now),
    };
  }

  async getLeaderboard(limit: number = 10): Promise<Array<{ user: User; stats: UserStats }>> {
    const rows = this.db.query(
      `SELECT 
        u.id, u.username, u.email, u.created_at, u.last_login,
        s.id as stats_id, s.user_id, s.games_played, s.games_won,
        s.total_prestige_points, s.total_cards_purchased, s.total_nobles_acquired,
        s.fastest_win_time, s.highest_prestige_score, s.favorite_gem_type, s.virtual_currency,
        s.created_at as stats_created_at, s.updated_at as stats_updated_at
      FROM users u
      JOIN user_stats s ON u.id = s.user_id
      ORDER BY s.games_won DESC, s.highest_prestige_score DESC
      LIMIT ?`,
      [limit]
    );

    return rows.map((row: any) => ({
      user: {
        id: row.id,
        username: row.username,
        email: row.email,
        created_at: new Date(row.created_at),
        last_login: row.last_login ? new Date(row.last_login) : undefined,
      },
      stats: {
        id: row.stats_id,
        user_id: row.user_id,
        games_played: row.games_played,
        games_won: row.games_won,
        total_prestige_points: row.total_prestige_points,
        total_cards_purchased: row.total_cards_purchased,
        total_nobles_acquired: row.total_nobles_acquired,
        fastest_win_time: row.fastest_win_time,
        highest_prestige_score: row.highest_prestige_score,
        favorite_gem_type: row.favorite_gem_type,
        virtual_currency: row.virtual_currency || 1000,
        created_at: new Date(row.stats_created_at),
        updated_at: new Date(row.stats_updated_at),
      },
    }));
  }

  async getUserLeaderboardRank(userId: string): Promise<number | null> {
    // Get all users ordered by leaderboard criteria
    const rows = this.db.query(
      `SELECT user_id,
        ROW_NUMBER() OVER (ORDER BY games_won DESC, highest_prestige_score DESC) as rank
      FROM user_stats`
    );

    const userRank = rows.find((row: any) => row.user_id === userId);
    return userRank ? userRank.rank : null;
  }

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const rows = this.db.query(
      'SELECT id, username, email, created_at, last_login FROM users WHERE username LIKE ? LIMIT ?',
      [`%${query}%`, limit]
    );

    return rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      created_at: new Date(row.created_at),
      last_login: row.last_login ? new Date(row.last_login) : undefined,
    }));
  }
}
