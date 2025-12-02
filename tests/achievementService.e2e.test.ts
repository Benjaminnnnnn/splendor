import { APIRequestContext, Page, expect, test } from '@playwright/test';
import path from 'path';
import { DatabaseConnection } from '../server/src/infrastructure/database';

const DB_PATH = path.join(__dirname, '../server/data/splendor-test.db');

const resetTestDatabase = (): void => {
  const db = DatabaseConnection.createAtPath(DB_PATH);
  try {
    db.run('PRAGMA foreign_keys = OFF');
    const tables = [
      'user_achievements',
      'user_stats',
      'notification_preferences',
      'notifications',
      'lobby_participants',
      'lobbies',
      'game_participants',
      'game_history',
      'bets',
      'friendships',
      'friend_requests',
      'chat_messages',
      'users',
    ];
    tables.forEach((table) => db.run(`DELETE FROM ${table}`));
    db.run('PRAGMA foreign_keys = ON');
  } finally {
    db.close();
  }
};

const API_BASE_URL = 'http://localhost:3001/api';
const USERS_BASE = `${API_BASE_URL}/users`;

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthSession {
  user: User;
  token: string;
}

type UserStatsUpdate = {
  gamesPlayed: number;
  gamesWon: number;
  totalPrestigePoints: number;
  totalCardsPurchased: number;
  totalNoblesAcquired: number;
  fastestWinTime?: number;
  highestPrestigeScore: number;
  favoriteGemType?: string;
};

const defaultStats: UserStatsUpdate = {
  gamesPlayed: 25,
  gamesWon: 15,
  totalPrestigePoints: 250,
  totalCardsPurchased: 120,
  totalNoblesAcquired: 15,
  fastestWinTime: 590, // under 10 minutes to trigger both speed achievements
  highestPrestigeScore: 20,
  favoriteGemType: 'emerald'
};

const expectedAchievements = [
  'first_game',
  'first_win',
  'marathon_20',
  'card_collector',
  'card_mogul',
  'winner_10',
  'prestige_hunter',
  'prestige_hoarder',
  'speedrunner',
  'swift_victory',
  'noble_courtier',
  'gem_specialist',
  'consistent_winner'
];

const createUser = (name: string): User => {
  const unique = `${name}-${Date.now()}`;
  return {
    id: name,
    username: `${unique}`,
    email: `${unique}$@example.com`,
  };
}

const createStats = (overrides: Partial<UserStatsUpdate> = {}): UserStatsUpdate => ({
  gamesPlayed: 0,
  gamesWon: 0,
  totalPrestigePoints: 0,
  totalCardsPurchased: 0,
  totalNoblesAcquired: 0,
  highestPrestigeScore: 0,
  ...overrides,
});

async function registerUser(
  request: APIRequestContext,
  username: string,
  email: string,
  password: string
): Promise<AuthSession> {
  const response = await request.post(`${USERS_BASE}/register`, {
    data: { username, email, password }
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { user: User; token: string };
  return { user: body.user, token: body.token };
}

async function updateUserStats(request: APIRequestContext, userId: string, update: UserStatsUpdate = defaultStats) {
  const response = await request.put(`${USERS_BASE}/${userId}/stats`, { data: update });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function evaluateAchievements(request: APIRequestContext, userId: string) {
  const response = await request.post(`${USERS_BASE}/${userId}/achievements/evaluate`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ newlyUnlocked: Array<{ code: string }>; alreadyUnlocked: string[] }>;
}

async function primeAuth(page: Page, session: AuthSession) {
  await page.addInitScript((storedUser) => {
    localStorage.setItem('splendor_user', JSON.stringify(storedUser.user));
    localStorage.setItem('splendor_token', storedUser.token);
  }, session);
}

test.describe('Achievement service e2e', () => {
  test.beforeEach(() => resetTestDatabase());
  test.afterEach(() => resetTestDatabase());

  test('evaluates stats, persists unlocks, and renders profile badges', async ({ request, page }) => {
    // Arrange: create a fresh user and seed stats high enough to unlock many achievements.
    const creds = createUser('achiever');
    const session = await registerUser(request, creds.username, creds.email, 'Password123!');
    await updateUserStats(request, session.user.id);

    // Act: evaluate achievements and load the profile page as the new user.
    const evaluation = await evaluateAchievements(request, session.user.id);
    await primeAuth(page, session);
    await page.goto('/profile');

    // Assert: achievements evaluator returns the expected unlock set and none marked as already unlocked.
    expect(new Set(evaluation.newlyUnlocked.map((a) => a.code))).toEqual(new Set(expectedAchievements));
    expect(evaluation.alreadyUnlocked).toEqual([]);

    // Assert: stats tab shows the seeded numbers.
    await expect(page.getByTestId('profile-hero')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('stats-card-games')).toContainText('25');
    await expect(page.getByTestId('stats-card-wins')).toContainText('15');
    await expect(page.getByTestId('stats-card-winrate')).toContainText('60.0%');
    await expect(page.getByTestId('stats-card-fastest')).toContainText('9m 50s');
    await expect(page.getByTestId('stats-card-prestige')).toContainText('250');
    await expect(page.getByTestId('stats-card-cards')).toContainText('120');
    await expect(page.getByTestId('stats-card-nobles')).toContainText('15');

    // Assert: achievements tab renders unlocked/locked states.
    await page.getByRole('tab', { name: /Achievements/i }).click();
    const grid = page.getByTestId('achievements-grid');
    await expect(grid).toBeVisible({ timeout: 15000 });

    for (const code of ['first_win', 'card_mogul', 'swift_victory', 'consistent_winner']) {
      const badge = page.getByTestId(`badge-card-${code}`);
      await expect(badge).toBeVisible();
      await expect(badge.getByText(/Unlocked/i)).toBeVisible();
    }

    const lockedBadge = page.getByTestId('badge-card-marathon_50');
    await expect(lockedBadge).toBeVisible();
    await expect(lockedBadge.getByText(/Locked/i)).toBeVisible();
  });

  test('is idempotent across repeated evaluations and reloads', async ({ request, page }) => {
    const creds = createUser('idempotent');
    const session = await registerUser(request, creds.username, creds.email, 'Password123!');
    await updateUserStats(request, session.user.id);

    const firstEval = await evaluateAchievements(request, session.user.id);
    expect(new Set(firstEval.newlyUnlocked.map((a) => a.code))).toEqual(new Set(expectedAchievements));
    expect(firstEval.alreadyUnlocked).toEqual([]);

    const secondEval = await evaluateAchievements(request, session.user.id);
    expect(secondEval.newlyUnlocked).toEqual([]);
    expect(new Set(secondEval.alreadyUnlocked)).toEqual(new Set(expectedAchievements));

    await primeAuth(page, session);
    await page.goto('/profile');
    await expect(page.getByTestId('profile-hero')).toBeVisible({ timeout: 15000 });
    await page.reload();
    await expect(page.getByTestId('profile-hero')).toBeVisible({ timeout: 15000 });

    await page.getByRole('tab', { name: /Achievements/i }).click();
    for (const code of ['first_win', 'card_mogul', 'swift_victory']) {
      const badge = page.getByTestId(`badge-card-${code}`);
      await expect(badge.getByText(/Unlocked/i)).toBeVisible();
    }
  });

  test('unlocks progressively as stats improve', async ({ request, page }) => {
    const creds = createUser('progressive');
    const session = await registerUser(request, creds.username, creds.email, 'Password123!');

    await updateUserStats(
      request,
      session.user.id,
      createStats({
        gamesPlayed: 1,
        gamesWon: 1,
      })
    );
    const firstEval = await evaluateAchievements(request, session.user.id);
    expect(new Set(firstEval.newlyUnlocked.map((a) => a.code))).toEqual(new Set(['first_game', 'first_win']));
    expect(firstEval.alreadyUnlocked).toEqual([]);

    await updateUserStats(
      request,
      session.user.id,
      {
        gamesPlayed: 24,
        gamesWon: 14,
        totalPrestigePoints: 250,
        totalCardsPurchased: 120,
        totalNoblesAcquired: 15,
        fastestWinTime: 590,
        highestPrestigeScore: 20,
        favoriteGemType: 'ruby',
      }
    );

    const secondEval = await evaluateAchievements(request, session.user.id);
    const expectedNew = expectedAchievements.filter((code) => !['first_game', 'first_win'].includes(code));
    expect(new Set(secondEval.newlyUnlocked.map((a) => a.code))).toEqual(new Set(expectedNew));
    expect(new Set(secondEval.alreadyUnlocked)).toEqual(new Set(['first_game', 'first_win']));

    await primeAuth(page, session);
    await page.goto('/profile');
    await page.getByRole('tab', { name: /Achievements/i }).click();
    await expect(page.getByTestId('badge-card-first_win').getByText(/Unlocked/i)).toBeVisible();
    await expect(page.getByTestId('badge-card-card_mogul').getByText(/Unlocked/i)).toBeVisible();
    await expect(page.getByTestId('badge-card-marathon_50').getByText(/Locked/i)).toBeVisible();
  });

  test('respects min sample size for consistent_winner', async ({ request, page }) => {
    const creds = createUser('winrate');
    const session = await registerUser(request, creds.username, creds.email, 'Password123!');

    await updateUserStats(
      request,
      session.user.id,
      createStats({
        gamesPlayed: 5,
        gamesWon: 5,
      })
    );

    const firstEval = await evaluateAchievements(request, session.user.id);
    expect(firstEval.newlyUnlocked.some((a) => a.code === 'consistent_winner')).toBeFalsy();

    await updateUserStats(
      request,
      session.user.id,
      createStats({
        gamesPlayed: 5,
        gamesWon: 1,
      })
    );

    const secondEval = await evaluateAchievements(request, session.user.id);
    const consistentUnlock = secondEval.newlyUnlocked.find((a) => a.code === 'consistent_winner');

    await primeAuth(page, session);
    await page.goto('/profile');
    await page.getByRole('tab', { name: /Achievements/i }).click();
    await expect(page.getByTestId('badge-card-consistent_winner').getByText(/Unlocked/i)).toBeVisible();
  });

  test('requires favorite gem type to unlock gem_specialist', async ({ request, page }) => {
    const creds = createUser('gem-specialist');
    const session = await registerUser(request, creds.username, creds.email, 'Password123!');

    await updateUserStats(
      request,
      session.user.id,
      createStats({
        gamesPlayed: 6,
        gamesWon: 6,
      })
    );

    const firstEval = await evaluateAchievements(request, session.user.id);
    expect(firstEval.newlyUnlocked.some((a) => a.code === 'gem_specialist')).toBeFalsy();

    await updateUserStats(
      request,
      session.user.id,
      createStats({
        favoriteGemType: 'sapphire',
      })
    );

    const secondEval = await evaluateAchievements(request, session.user.id);
    expect(secondEval.newlyUnlocked.map((a) => a.code)).toContain('gem_specialist');

    await primeAuth(page, session);
    await page.goto('/profile');
    await page.getByRole('tab', { name: /Achievements/i }).click();
    await expect(page.getByTestId('badge-card-gem_specialist').getByText(/Unlocked/i)).toBeVisible();
  });

  test('applies speed thresholds at boundaries', async ({ request }) => {
    const fastCreds = createUser('speed-600');
    const fastSession = await registerUser(request, fastCreds.username, fastCreds.email, 'Password123!');
    await updateUserStats(
      request,
      fastSession.user.id,
      createStats({
        gamesPlayed: 1,
        gamesWon: 1,
        fastestWinTime: 600,
      })
    );

    const fastEval = await evaluateAchievements(request, fastSession.user.id);
    expect(new Set(fastEval.newlyUnlocked.map((a) => a.code))).toEqual(
      new Set(['first_game', 'first_win', 'speedrunner', 'swift_victory'])
    );

    const slowCreds = createUser('speed-601');
    const slowSession = await registerUser(request, slowCreds.username, slowCreds.email, 'Password123!');
    await updateUserStats(
      request,
      slowSession.user.id,
      createStats({
        gamesPlayed: 1,
        gamesWon: 1,
        fastestWinTime: 601,
      })
    );
    const slowEval = await evaluateAchievements(request, slowSession.user.id);
    const slowCodes = new Set(slowEval.newlyUnlocked.map((a) => a.code));
    expect(slowCodes.has('speedrunner')).toBeTruthy();
    expect(slowCodes.has('swift_victory')).toBeFalsy();
  });

  test('keeps achievements unlocked even if stats regress', async ({ request }) => {
    const creds = createUser('regression');
    const session = await registerUser(request, creds.username, creds.email, 'Password123!');
    await updateUserStats(request, session.user.id);

    const initialEval = await evaluateAchievements(request, session.user.id);
    expect(new Set(initialEval.newlyUnlocked.map((a) => a.code))).toEqual(new Set(expectedAchievements));

    await updateUserStats(
      request,
      session.user.id,
      {
        gamesPlayed: -15,
        gamesWon: -10,
        totalPrestigePoints: -200,
        totalCardsPurchased: -120,
        totalNoblesAcquired: -15,
        highestPrestigeScore: 0,
      }
    );

    const afterRegression = await evaluateAchievements(request, session.user.id);
    expect(afterRegression.newlyUnlocked).toEqual([]);
    expect(new Set(afterRegression.alreadyUnlocked)).toEqual(new Set(expectedAchievements));
  });

  test('returns errors for missing stats and surfaces UI fallback', async ({ request, page }) => {
    const missingUserId = `ghost-${Date.now()}`;
    const apiResponse = await request.post(`${USERS_BASE}/${missingUserId}/achievements/evaluate`);
    expect(apiResponse.status()).toBe(400);
    const body = await apiResponse.json();
    expect(body.error).toMatch(/stats not found/i);

    const fakeSession: AuthSession = {
      user: {
        id: missingUserId,
        username: 'Ghost',
        email: 'ghost@example.com',
      },
      token: 'fake-token',
    };
    await primeAuth(page, fakeSession);
    await page.goto('/profile');
    await expect(page.getByRole('alert')).toContainText(/not found|failed to load/i);
  });
});
