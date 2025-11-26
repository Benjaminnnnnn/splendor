import { APIRequestContext, APIResponse, Browser, BrowserContext, Page, expect, test as base } from '@playwright/test';
import { buildApiUrl } from '../helpers/game-state';

export interface PlayerSession {
  context: BrowserContext;
  page: Page;
  playerId: string;
  name: string;
}

export interface GameSetup {
  host: PlayerSession;
  guest: PlayerSession;
  gameId: string;
  inviteCode: string;
  apiUrl: string;
}

export interface GameSetupOptions {
  hostName?: string;
  guestName?: string;
  lobbyName?: string;
  autoStart?: boolean;
}

export interface GameFixtures {
  gameSetup: GameSetup;
  gameSetupOptions: GameSetupOptions;
}

type ApiUser = {
  id: string;
  username: string;
  email: string;
  [key: string]: unknown;
};

const TEST_HOST_USER = {
  email: 'test@gmail.com',
  password: 'Password123!',
  username: 'Test Host'
};

const API_BASE_URL = process.env.E2E_API_BASE_URL || 'http://localhost:3001/api';
const VIEWPORT = { width: 1280, height: 720 };

async function safeJson(response: APIResponse) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function registerHostUser(request: APIRequestContext): Promise<ApiUser | null> {
  const response = await request.post(`${API_BASE_URL}/users/register`, {
    data: { ...TEST_HOST_USER }
  });
  const body = await safeJson(response);

  if (response.ok()) {
    return body;
  }

  const alreadyExists = response.status() === 400 && body?.error?.includes('exists');
  if (alreadyExists) {
    return null;
  }

  throw new Error(`Failed to register host test user (${response.status()}): ${body?.error || 'Unknown error'}`);
}

async function loginHostUser(request: APIRequestContext): Promise<ApiUser> {
  const response = await request.post(`${API_BASE_URL}/users/login`, {
    data: { email: TEST_HOST_USER.email, password: TEST_HOST_USER.password }
  });
  const body = await safeJson(response);

  if (!response.ok()) {
    throw new Error(`Failed to log in host test user (${response.status()}): ${body?.error || 'Unknown error'}`);
  }

  return body;
}

async function provisionHostUser(request: APIRequestContext): Promise<ApiUser> {
  const registeredUser = await registerHostUser(request);
  if (registeredUser) return registeredUser;
  return loginHostUser(request);
}

async function createAuthedContext(browser: Browser, user: ApiUser) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addInitScript((storedUser) => {
    window.localStorage.setItem('splendor_user', JSON.stringify(storedUser));
  }, user);
  return context;
}

async function createGuestContext(browser: Browser) {
  return browser.newContext({ viewport: VIEWPORT });
}

async function createPublicGame(page: Page, options: Required<GameSetupOptions>) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.getByTestId('create-game-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const hostNameInput = page.getByLabel(/Host Name/i);
  if (await hostNameInput.count()) {
    await hostNameInput.fill(options.hostName);
  }

  const lobbyInput = page.getByLabel(/Lobby Name/i);
  await lobbyInput.fill(options.lobbyName);

  const privateToggle = page.locator('input[type="checkbox"]');
  if ((await privateToggle.count()) && (await privateToggle.isChecked())) {
    await privateToggle.click();
  }

  await page.getByRole('button', { name: /Create Game/i }).click();
  await page.waitForURL('**/lobby/*', { waitUntil: 'networkidle' });

  const gameId = extractGameId(page.url());
  const inviteCode = new URL(`/invite/${gameId}`, page.url()).toString();

  const playerId = await readPlayerId(page);
  if (!playerId) {
    throw new Error('Host player id missing from localStorage after game creation');
  }

  return { gameId, inviteCode, playerId };
}

async function joinViaInvite(page: Page, inviteUrl: string, guestName: string) {
  await page.goto(inviteUrl);
  await page.waitForLoadState('networkidle');

  const nameInput = page.getByLabel(/Your Name/i);
  if (await nameInput.count()) {
    await nameInput.fill(guestName);
  }

  await page.getByRole('button', { name: /Join Game/i }).click();
  await page.waitForURL('**/lobby/*', { waitUntil: 'domcontentloaded' });

  const playerId = await readPlayerId(page);
  if (!playerId) {
    throw new Error('Guest player id missing from localStorage after joining');
  }

  return playerId;
}

async function startGameIfNeeded(page: Page, gameId: string, autoStart: boolean) {
  if (!autoStart) return;

  const startButton = page.getByRole('button', { name: /^Start Game$/i });
  await expect(startButton).toBeVisible({ timeout: 15000 });
  await expect(startButton).toBeEnabled();
  await startButton.click();
  await page.waitForURL(`**/game/${gameId}`, { waitUntil: 'networkidle' });
}

async function waitForGamePage(page: Page, gameId: string) {
  const gamePath = new RegExp(`/game/${gameId}`);
  await page.waitForURL(gamePath, { waitUntil: 'networkidle', timeout: 20000 });
  await expect(page).toHaveURL(gamePath);
}

async function readPlayerId(page: Page) {
  return page.evaluate(() => localStorage.getItem('currentPlayerId') || '');
}

function extractGameId(url: string) {
  const match = url.match(/\/(?:lobby|game)\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Unable to extract game id from url: ${url}`);
  }
  return match[1];
}

export const test = base.extend<GameFixtures>({
  gameSetupOptions: [{ hostName: 'HostPlayer', guestName: 'GuestPlayer', lobbyName: 'QA Lobby', autoStart: true }, { option: true }],

  gameSetup: async ({ browser, request, gameSetupOptions }, use) => {
    const hostUser = await provisionHostUser(request);

    const options: Required<GameSetupOptions> = {
      hostName: gameSetupOptions.hostName || hostUser.username || 'HostPlayer',
      guestName: gameSetupOptions.guestName || 'GuestPlayer',
      lobbyName: gameSetupOptions.lobbyName || `Lobby-${Date.now()}`,
      autoStart: gameSetupOptions.autoStart ?? true
    };

    const hostContext = await createAuthedContext(browser, hostUser);
    const guestContext = await createGuestContext(browser);
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      const { gameId, inviteCode, playerId: hostId } = await createPublicGame(hostPage, options);
      const guestId = await joinViaInvite(guestPage, inviteCode, options.guestName);

      if (options.autoStart) {
        await startGameIfNeeded(hostPage, gameId, options.autoStart);
        await Promise.all([
          waitForGamePage(hostPage, gameId),
          waitForGamePage(guestPage, gameId)
        ]);
      }

      const apiUrl = buildApiUrl(gameId);

      await use({
        host: { context: hostContext, page: hostPage, playerId: hostId, name: options.hostName },
        guest: { context: guestContext, page: guestPage, playerId: guestId, name: options.guestName },
        gameId,
        inviteCode,
        apiUrl
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  }
});

export { expect } from '@playwright/test';
