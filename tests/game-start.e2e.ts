import { expect, test } from './fixtures/game-fixtures';
import { getGameState, setGameState } from './helpers/game-state';

test.describe('Game start flow', () => {
  test('host can start a new game and guests reach the board', async ({ gameSetup }) => {
    const { host, guest, gameId } = gameSetup;

    // Fixture auto-starts; verify both players land on the game page.
    await expect(host.page).toHaveURL(new RegExp(`/game/${gameId}`));
    await expect(guest.page).toHaveURL(new RegExp(`/game/${gameId}`));

    // Basic sanity checks that the board renders.
    await expect(host.page.getByTestId('player-prestige').first()).toBeVisible();
    await expect(guest.page.getByText(/tokens?/i).first()).toBeVisible();
  });

  test('setGameState helper updates the board bank', async ({ gameSetup, request }) => {
    const { apiUrl } = gameSetup;
    const customTokens = { diamond: 9, sapphire: 8, emerald: 7, ruby: 6, onyx: 5, gold: 4 };

    await setGameState(request, apiUrl, { board: { tokens: customTokens } });
    const state = await getGameState(request, apiUrl);

    expect(state.board.tokens).toMatchObject(customTokens);
  });
});
