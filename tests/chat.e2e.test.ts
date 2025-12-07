import { APIRequestContext, Page, expect, test } from '@playwright/test';
import path from 'path';
import { DatabaseConnection } from '../server/src/infrastructure/database';

const DB_PATH = path.join(__dirname, '../server/data/splendor-test.db');

const TIME_OUT = 10000;

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
const CHAT_BASE = `${API_BASE_URL}/chat`;

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthSession {
  user: User;
  token: string;
}

const createUser = (name: string): { username: string; email: string; password: string } => {
  const unique = `${name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return {
    username: `user-${unique}`,
    email: `${unique}@example.com`,
    password: 'Password123!',
  };
};

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

async function primeAuth(page: Page, session: AuthSession) {
  await page.addInitScript((storedUser) => {
    localStorage.setItem('splendor_user', JSON.stringify(storedUser.user));
    localStorage.setItem('splendor_token', storedUser.token);
  }, session);
}

async function openChatPanel(page: Page) {
  // Click the chat icon to expand the panel
  const chatButton = page.locator('button').filter({ has: page.locator('svg[data-testid="ChatIcon"]') }).first();
  await chatButton.click();
  // Wait for chat panel to be visible
  await expect(page.getByRole('heading', { name: 'Chat' })).toBeVisible({ timeout: TIME_OUT });
}

async function navigateToTab(page: Page, tabName: string) {
  const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
  await tab.click();
  await page.waitForTimeout(500); // Brief wait for tab content to render
}

test.describe('Chat & Friend System E2E', () => {
  test.beforeEach(() => resetTestDatabase());
  test.afterEach(() => resetTestDatabase());

  test('verify initial DM tab is empty when user has no friends', async ({ page }) => {
    // Arrange: create and authenticate a user with no friends
    const creds = createUser('loner');
    const { request } = page.context();
    const session = await registerUser(request, creds.username, creds.email, creds.password);
    
    await primeAuth(page, session);
    await page.goto('/');
    
    // Act: open chat panel and navigate to Direct Messages tab
    await openChatPanel(page);
    await navigateToTab(page, 'Direct');
    
    // Assert: verify empty state message is displayed
    await expect(page.getByText(/No friends yet/i)).toBeVisible();
    await expect(page.getByText(/Add friends to start chatting/i)).toBeVisible();
  });

  test('send friend request and recipient receives it', async ({ browser }) => {
    // Arrange: create two users in separate browser contexts
    const senderCreds = createUser('sender');
    const recipientCreds = createUser('recipient');
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const senderPage = await context1.newPage();
    const recipientPage = await context2.newPage();
    
    const senderSession = await registerUser(context1.request, senderCreds.username, senderCreds.email, senderCreds.password);
    const recipientSession = await registerUser(context2.request, recipientCreds.username, recipientCreds.email, recipientCreds.password);
    
    await primeAuth(senderPage, senderSession);
    await primeAuth(recipientPage, recipientSession);
    
    await senderPage.goto('/');
    await recipientPage.goto('/');
    
    // Act: sender searches for recipient and sends friend request
    await openChatPanel(senderPage);
    await navigateToTab(senderPage, 'Add');
    
    const searchField = senderPage.getByPlaceholder(/Search users by username/i);
    await searchField.fill(recipientCreds.username);
    await senderPage.waitForTimeout(2000); // Wait for search results
    
    // Click on the user in search results to send friend request - find the ListItemButton containing the username
    const userListItem = senderPage.locator('.MuiListItemButton-root').filter({ hasText: recipientCreds.username });
    await userListItem.click();
    
    // Wait for request sent confirmation
    // await expect(senderPage.getByText('Request sent!')).toBeVisible({ timeout: 10000 });
    
    // Assert: recipient opens chat and sees the friend request
    await openChatPanel(recipientPage);
    await navigateToTab(recipientPage, 'Requests');
    
    // Wait a moment for socket event to propagate
    await recipientPage.waitForTimeout(2000);
    
    // Verify friend request is visible
    await expect(recipientPage.getByText(senderCreds.username)).toBeVisible({ timeout: TIME_OUT });
    await expect(recipientPage.getByRole('button', { name: /Accept/i })).toBeVisible();
    await expect(recipientPage.getByRole('button', { name: /Reject/i })).toBeVisible();
    
    // Verify badge shows unread count
    const requestsTab = recipientPage.getByRole('tab', { name: /Requests/i });
    await expect(requestsTab.locator('.MuiBadge-badge')).toBeVisible();
    
    await context1.close();
    await context2.close();
  });

  test('accept friend request and both users can see each other in Direct tab', async ({ browser }) => {
    // Arrange: create two users and send friend request
    const user1Creds = createUser('user1');
    const user2Creds = createUser('user2');
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const session1 = await registerUser(context1.request, user1Creds.username, user1Creds.email, user1Creds.password);
    const session2 = await registerUser(context2.request, user2Creds.username, user2Creds.email, user2Creds.password);
    
    await primeAuth(page1, session1);
    await primeAuth(page2, session2);
    
    await page1.goto('/');
    await page2.goto('/');
    
    // User 1 sends friend request to User 2
    await openChatPanel(page1);
    await navigateToTab(page1, 'Add');
    await page1.getByPlaceholder(/Search users by username/i).fill(user2Creds.username);
    await page1.waitForTimeout(2000);
    const userListItem = page1.locator('.MuiListItemButton-root').filter({ hasText: user2Creds.username });
    await userListItem.click();
    // await expect(page1.getByText('Request sent!')).toBeVisible({ timeout: 10000 });
    
    // Act: User 2 accepts the friend request
    await openChatPanel(page2);
    await navigateToTab(page2, 'Requests');
    await page2.waitForTimeout(2000); // Wait for socket event
    
    const acceptButton = page2.getByRole('button', { name: /Accept/i }).first();
    await acceptButton.click();
    await page2.waitForTimeout(1000); // Wait for acceptance to process
    
    // Assert: User 2 can see User 1 in Direct Messages tab
    await navigateToTab(page2, 'Direct');
    await expect(page2.getByText(user1Creds.username)).toBeVisible({ timeout: TIME_OUT });
    
    // Assert: User 1 can see User 2 in Direct Messages tab
    await navigateToTab(page1, 'Direct');
    await page1.waitForTimeout(2000); // Wait for socket event
    await expect(page1.getByText(user2Creds.username)).toBeVisible({ timeout: TIME_OUT });
    
    await context1.close();
    await context2.close();
  });

  test('exchange direct messages between friends', async ({ browser }) => {
    // Arrange: create two users who are already friends
    const user1Creds = createUser('alice');
    const user2Creds = createUser('bob');
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const session1 = await registerUser(context1.request, user1Creds.username, user1Creds.email, user1Creds.password);
    const session2 = await registerUser(context2.request, user2Creds.username, user2Creds.email, user2Creds.password);
    
    // Make them friends via API - send friend request
    await context1.request.post(`${CHAT_BASE}/users/${session1.user.id}/friends`, {
      data: { friendId: session2.user.id },
      headers: { 'Authorization': `Bearer ${session1.token}` }
    });
    
    // Accept friend request
    await context2.request.post(`${CHAT_BASE}/users/${session2.user.id}/friends/accept`, {
      data: { friendId: session1.user.id },
      headers: { 'Authorization': `Bearer ${session2.token}` }
    });
    
    await primeAuth(page1, session1);
    await primeAuth(page2, session2);
    
    await page1.goto('/');
    await page2.goto('/');
    
    // Act: User 1 sends a message to User 2
    await openChatPanel(page1);
    await navigateToTab(page1, 'Direct');
    await page1.waitForTimeout(2000);
    
    // Find the friend in the list and click to open conversation
    const friendListItem = page1.locator('.MuiListItemButton-root').filter({ hasText: user2Creds.username });
    await expect(friendListItem).toBeVisible({ timeout: TIME_OUT });
    await friendListItem.click();
    
    const message1 = `Hello from ${user1Creds.username}!`;
    const messageInput1 = page1.getByPlaceholder(/Type a message/i);
    await messageInput1.fill(message1);
    await messageInput1.press('Enter');
    
    // Assert: User 1 sees their own message
    await expect(page1.getByText(message1)).toBeVisible({ timeout: TIME_OUT });
    await expect(page1.getByText('You')).toBeVisible();
    
    // Assert: User 2 receives the message
    await openChatPanel(page2);
    await navigateToTab(page2, 'Direct');
    await page2.waitForTimeout(2000); // Wait for socket event
    
    // Check for friend and open conversation
    await expect(page2.getByText(user1Creds.username).first()).toBeVisible();
    
    // Open the conversation
    const friendListItem2 = page2.locator('.MuiListItemButton-root').filter({ hasText: user1Creds.username });
    await expect(friendListItem2).toBeVisible({ timeout: TIME_OUT });
    await friendListItem2.click();
    await expect(page2.getByText(message1)).toBeVisible({ timeout: TIME_OUT });
    
    // Act: User 2 replies
    const message2 = `Hi ${user1Creds.username}, nice to meet you!`;
    const messageInput2 = page2.getByPlaceholder(/Type a message/i);
    await messageInput2.fill(message2);
    await messageInput2.press('Enter');
    
    // Assert: User 2 sees their own message
    await expect(page2.getByText(message2)).toBeVisible({ timeout: TIME_OUT });
    
    // Assert: User 1 receives the reply
    await page1.waitForTimeout(2000); // Wait for socket event
    await expect(page1.getByText(message2)).toBeVisible({ timeout: TIME_OUT });
    
    await context1.close();
    await context2.close();
  });

  test('direct messages are persisted via API', async ({ browser }) => {
    // Arrange: create two users who are friends
    const user1Creds = createUser('persistent1');
    const user2Creds = createUser('persistent2');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const session1 = await registerUser(context.request, user1Creds.username, user1Creds.email, user1Creds.password);
    const session2 = await registerUser(context.request, user2Creds.username, user2Creds.email, user2Creds.password);
    
    // Make them friends via API - send friend request
    await context.request.post(`${CHAT_BASE}/users/${session1.user.id}/friends`, {
      data: { friendId: session2.user.id },
      headers: { 'Authorization': `Bearer ${session1.token}` }
    });
    // Accept friend request
    await context.request.post(`${CHAT_BASE}/users/${session2.user.id}/friends/accept`, {
      data: { friendId: session1.user.id },
      headers: { 'Authorization': `Bearer ${session2.token}` }
    });
    
    await primeAuth(page, session1);
    await page.goto('/');
    
    // Act: send several messages
    await openChatPanel(page);
    await navigateToTab(page, 'Direct');
    await page.waitForTimeout(2000);
    
    // Open conversation with friend
    const friendListItem = page.locator('.MuiListItemButton-root').filter({ hasText: user2Creds.username });
    await friendListItem.click();
    
    const messages = [
      'First message',
      'Second message',
      'Third message'
    ];
    
    const messageInput = page.getByPlaceholder(/Type a message/i);
    for (const msg of messages) {
      await messageInput.fill(msg);
      await messageInput.press('Enter');
      await page.waitForTimeout(500); // Brief wait between messages
    }
    
    // Verify all messages are visible in UI
    for (const msg of messages) {
      await expect(page.getByText(msg)).toBeVisible();
    }
    
    // Assert: verify messages are persisted via API
    const historyResponse = await context.request.get(
      `${CHAT_BASE}/users/${session1.user.id}/conversations/${session2.user.id}`,
      { headers: { 'Authorization': `Bearer ${session1.token}` } }
    );
    expect(historyResponse.ok()).toBeTruthy();
    
    const historyData = await historyResponse.json();
    const history = historyData.messages;
    expect(Array.isArray(history)).toBeTruthy();
    expect(history.length).toBeGreaterThanOrEqual(messages.length);
    
    // Verify message content
    const persistedContents = history.map((m: any) => m.content);
    for (const msg of messages) {
      expect(persistedContents).toContain(msg);
    }
    
    await context.close();
  });

  test('messages persist after page reload', async ({ page }) => {
    // Arrange: create two users who are friends with message history
    const user1Creds = createUser('reloader1');
    const user2Creds = createUser('reloader2');
    
    const session1 = await registerUser(page.context().request, user1Creds.username, user1Creds.email, user1Creds.password);
    const session2 = await registerUser(page.context().request, user2Creds.username, user2Creds.email, user2Creds.password);
    
    // Make them friends via API - send friend request
    await page.context().request.post(`${CHAT_BASE}/users/${session1.user.id}/friends`, {
      data: { friendId: session2.user.id },
      headers: { 'Authorization': `Bearer ${session1.token}` }
    });
    // Accept friend request
    await page.context().request.post(`${CHAT_BASE}/users/${session2.user.id}/friends/accept`, {
      data: { friendId: session1.user.id },
      headers: { 'Authorization': `Bearer ${session2.token}` }
    });
    
    await primeAuth(page, session1);
    await page.goto('/');
    
    // Send messages before reload
    await openChatPanel(page);
    await navigateToTab(page, 'Direct');
    await page.waitForTimeout(2000);
    
    // Open conversation with friend
    const friendListItem = page.locator('.MuiListItemButton-root').filter({ hasText: user2Creds.username });
    await friendListItem.click();
    
    const testMessages = [
      'Message before reload 1',
      'Message before reload 2',
      'This should persist!'
    ];
    
    const messageInput = page.getByPlaceholder(/Type a message/i);
    for (const msg of testMessages) {
      await messageInput.fill(msg);
      await messageInput.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Verify messages are visible before reload
    for (const msg of testMessages) {
      await expect(page.getByText(msg)).toBeVisible();
    }
    
    // Act: reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Re-open chat panel and navigate to conversation
    await openChatPanel(page);
    await navigateToTab(page, 'Direct');
    await page.waitForTimeout(2000);
    
    // Open conversation with friend
    const friendListItemAfterReload = page.locator('.MuiListItemButton-root').filter({ hasText: user2Creds.username });
    await expect(friendListItemAfterReload).toBeVisible({ timeout: TIME_OUT });
    await friendListItemAfterReload.click();
    await page.waitForTimeout(1000); // Wait for message history to load
    
    // Assert: verify all messages are still visible after reload
    for (const msg of testMessages) {
      await expect(page.getByText(msg)).toBeVisible({ timeout: TIME_OUT });
    }
  });
});
