import { describe, it, expect, beforeEach } from "vitest";
import { AIService } from "../server/src/services/aiService";
import { GameService } from "../server/src/services/gameService";
import { GameState } from "../shared/types/game";

describe("AIService Property-Based Tests", () => {
  let aiService: AIService;
  let mockGameService: GameService;

  beforeEach(() => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable must be set to run integration tests"
      );
    }
  });

  // Helper to create a valid game state
  const createGameState = (
    playerTokens: any,
    playerCards: any[],
    playerReservedCards: any[],
    availableCards: any[],
    boardTokens: any,
    playerPrestige: number = 0
  ) => ({
    id: "property-test-game",
    state: GameState.IN_PROGRESS,
    currentPlayerIndex: 0,
    players: [
      {
        id: "player-1",
        name: "TestPlayer",
        prestige: playerPrestige,
        tokens: playerTokens,
        cards: playerCards,
        reservedCards: playerReservedCards,
        nobles: [],
      },
      {
        id: "player-2",
        name: "Opponent",
        prestige: 5,
        tokens: {
          diamond: 2,
          sapphire: 1,
          emerald: 1,
          ruby: 1,
          onyx: 0,
          gold: 0,
        },
        cards: [
          {
            id: "opp-card-1",
            tier: 1,
            prestige: 1,
            gemBonus: "diamond",
            cost: { diamond: 2 },
          },
        ],
        reservedCards: [],
        nobles: [],
      },
    ],
    board: {
      tokens: boardTokens,
      availableCards: {
        tier1: availableCards.filter((c: any) => c.tier === 1),
        tier2: availableCards.filter((c: any) => c.tier === 2),
        tier3: availableCards.filter((c: any) => c.tier === 3),
      },
      cardDecks: {
        tier1: 20,
        tier2: 15,
        tier3: 10,
      },
      nobles: [
        {
          id: "noble-1",
          name: "Test Noble",
          prestige: 3,
          requirements: {
            diamond: 3,
            sapphire: 3,
            emerald: 0,
            ruby: 0,
            onyx: 0,
          },
        },
      ],
    },
  });

  describe("Property 1: AI moves must be valid", () => {
    it("when purchasing a card, payment should match card cost and player has tokens", async () => {
      // Create test scenario where player can afford a specific card
      const cardToBuy = {
        id: "affordable-card",
        tier: 1,
        prestige: 1,
        gemBonus: "diamond",
        cost: { diamond: 2, sapphire: 1, emerald: 0, ruby: 0, onyx: 0 },
      };

      const playerTokens = {
        diamond: 3,
        sapphire: 2,
        emerald: 1,
        ruby: 0,
        onyx: 0,
        gold: 1,
      };
      const game = createGameState(playerTokens, [], [], [cardToBuy], {
        diamond: 5,
        sapphire: 5,
        emerald: 5,
        ruby: 5,
        onyx: 5,
        gold: 5,
      });

      mockGameService = {
        getGame: async () => game,
      } as any;
      aiService = new AIService(mockGameService);

      const result = await aiService.getGameRecommendation(
        "property-test-game",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      if (recommendation.action === "purchase_card") {
        const cardId = recommendation.details.cardId;
        const payment = recommendation.details.payment || {};

        // Find the card being purchased
        const allCards = [
          ...game.board.availableCards.tier1,
          ...game.board.availableCards.tier2,
          ...game.board.availableCards.tier3,
        ];
        const card = allCards.find((c: any) => c.id === cardId);

        expect(card).toBeDefined();

        // Verify player has enough tokens to make the payment
        Object.entries(payment).forEach(([gem, count]) => {
          const tokenCount = count as number;
          if (tokenCount > 0) {
            expect(
              playerTokens[gem as keyof typeof playerTokens]
            ).toBeGreaterThanOrEqual(tokenCount);
          }
        });

        // Verify payment covers the cost (accounting for bonuses)
        const playerBonuses = game.players[0].cards.reduce(
          (acc: any, card: any) => {
            acc[card.gemBonus] = (acc[card.gemBonus] || 0) + 1;
            return acc;
          },
          { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 }
        );

        Object.entries(card.cost).forEach(([gem, costAmount]) => {
          const cost = costAmount as number;
          const paid = payment[gem as keyof typeof payment] || 0;
          const bonus = playerBonuses[gem] || 0;

          // Total coverage = payment + bonuses, should equal or exceed cost
          expect(paid + bonus).toBeGreaterThanOrEqual(cost);
        });
      }
    }, 30000);

    it("when taking tokens, should not suggest invalid token combinations", async () => {
      const game = createGameState(
        { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 },
        [],
        [],
        [
          {
            id: "card-1",
            tier: 1,
            prestige: 0,
            gemBonus: "diamond",
            cost: { diamond: 3 },
          },
          {
            id: "card-2",
            tier: 1,
            prestige: 1,
            gemBonus: "sapphire",
            cost: { sapphire: 3 },
          },
        ],
        { diamond: 5, sapphire: 5, emerald: 5, ruby: 5, onyx: 5, gold: 5 }
      );

      mockGameService = {
        getGame: async () => game,
      } as any;
      aiService = new AIService(mockGameService);

      const result = await aiService.getGameRecommendation(
        "property-test-game",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      if (recommendation.action === "take_tokens") {
        const tokens = recommendation.details.tokens;
        const totalTokens = Object.values(tokens).reduce(
          (sum: number, count: any) => sum + count,
          0
        );

        // Valid token taking rules
        expect(totalTokens).toBeGreaterThan(0);
        expect(totalTokens).toBeLessThanOrEqual(3);

        const nonZeroGems = Object.entries(tokens).filter(
          ([_, count]) => (count as number) > 0
        );

        // Check valid patterns: 3 different, 2 same, or mix
        if (totalTokens === 3) {
          // Should be 3 different gems with 1 each
          expect(nonZeroGems.every(([_, count]) => count === 1)).toBe(true);
        } else if (totalTokens === 2) {
          // Either 2 same or 2 different
          const isTwoSame = nonZeroGems.length === 1 && nonZeroGems[0][1] === 2;
          const isTwoDifferent =
            nonZeroGems.length === 2 &&
            nonZeroGems.every(([_, count]) => count === 1);
          expect(isTwoSame || isTwoDifferent).toBe(true);
        }

        // Verify tokens are available in the bank
        Object.entries(tokens).forEach(([gem, count]) => {
          const tokenCount = count as number;
          if (tokenCount > 0 && gem !== "gold") {
            expect(
              game.board.tokens[gem as keyof typeof game.board.tokens]
            ).toBeGreaterThanOrEqual(tokenCount);
          }
        });
      }
    }, 30000);
  });

  describe("Property 2: AI should not suggest exceeding 10 token limit", () => {
    it("should not recommend taking tokens when player already has 10 tokens", async () => {
      const game = createGameState(
        { diamond: 3, sapphire: 3, emerald: 2, ruby: 2, onyx: 0, gold: 0 }, // 10 tokens total
        [],
        [],
        [
          {
            id: "card-1",
            tier: 1,
            prestige: 0,
            gemBonus: "diamond",
            cost: { diamond: 5 },
          },
        ],
        { diamond: 5, sapphire: 5, emerald: 5, ruby: 5, onyx: 5, gold: 5 }
      );

      mockGameService = {
        getGame: async () => game,
      } as any;
      aiService = new AIService(mockGameService);

      const result = await aiService.getGameRecommendation(
        "property-test-game",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      console.log(
        "Player has 10 tokens, AI recommended:",
        recommendation.action
      );
      console.log(
        "Recommendation details:",
        JSON.stringify(recommendation, null, 2)
      );

      // Player has 10 tokens, should NOT recommend taking more tokens
      expect(recommendation.action).not.toBe("take_tokens");
    }, 30000);

    it("should not recommend taking tokens that would exceed 10 token limit", async () => {
      const game = createGameState(
        { diamond: 2, sapphire: 2, emerald: 2, ruby: 2, onyx: 0, gold: 0 }, // 8 tokens total
        [],
        [],
        [
          {
            id: "card-1",
            tier: 1,
            prestige: 0,
            gemBonus: "diamond",
            cost: { diamond: 10 },
          },
        ],
        { diamond: 5, sapphire: 5, emerald: 5, ruby: 5, onyx: 5, gold: 5 }
      );

      mockGameService = {
        getGame: async () => game,
      } as any;
      aiService = new AIService(mockGameService);

      const result = await aiService.getGameRecommendation(
        "property-test-game",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      if (recommendation.action === "take_tokens") {
        const currentTokens = Object.values(game.players[0].tokens).reduce(
          (sum: number, count: any) => sum + count,
          0
        );
        const newTokens = Object.values(recommendation.details.tokens).reduce(
          (sum: number, count: any) => sum + count,
          0
        );

        // Total should not exceed 10
        expect(currentTokens + newTokens).toBeLessThanOrEqual(10);
      }
    }, 30000);
  });

  describe("Property 3: AI should not suggest reserving when player has 3 reserved cards", () => {
    it("should not recommend reserving a card when player already has 3 reserved cards", async () => {
      const game = createGameState(
        { diamond: 2, sapphire: 1, emerald: 1, ruby: 0, onyx: 0, gold: 1 },
        [],
        [
          {
            id: "reserved-1",
            tier: 2,
            prestige: 2,
            gemBonus: "diamond",
            cost: { diamond: 3, sapphire: 2 },
          },
          {
            id: "reserved-2",
            tier: 2,
            prestige: 1,
            gemBonus: "emerald",
            cost: { emerald: 3, ruby: 1 },
          },
          {
            id: "reserved-3",
            tier: 3,
            prestige: 3,
            gemBonus: "ruby",
            cost: { ruby: 5, onyx: 3 },
          },
        ], // 3 reserved cards (max)
        [
          {
            id: "card-1",
            tier: 1,
            prestige: 0,
            gemBonus: "diamond",
            cost: { diamond: 2 },
          },
          {
            id: "card-2",
            tier: 2,
            prestige: 1,
            gemBonus: "sapphire",
            cost: { sapphire: 3 },
          },
        ],
        { diamond: 5, sapphire: 5, emerald: 5, ruby: 5, onyx: 5, gold: 5 }
      );

      mockGameService = {
        getGame: async () => game,
      } as any;
      aiService = new AIService(mockGameService);

      const result = await aiService.getGameRecommendation(
        "property-test-game",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      // Player already has 3 reserved cards, should NOT recommend reserving another
      expect(recommendation.action).not.toBe("reserve_card");
    }, 30000);

    it("should be able to recommend reserving when player has less than 3 reserved cards", async () => {
      const game = createGameState(
        { diamond: 1, sapphire: 1, emerald: 0, ruby: 0, onyx: 0, gold: 0 },
        [],
        [
          {
            id: "reserved-1",
            tier: 2,
            prestige: 2,
            gemBonus: "diamond",
            cost: { diamond: 3, sapphire: 2 },
          },
        ], // Only 1 reserved card
        [
          {
            id: "card-1",
            tier: 1,
            prestige: 0,
            gemBonus: "diamond",
            cost: { diamond: 2 },
          },
          {
            id: "valuable-card",
            tier: 3,
            prestige: 4,
            gemBonus: "ruby",
            cost: { ruby: 6, onyx: 3 },
          },
        ],
        { diamond: 5, sapphire: 5, emerald: 5, ruby: 5, onyx: 5, gold: 5 }
      );

      mockGameService = {
        getGame: async () => game,
      } as any;
      aiService = new AIService(mockGameService);

      const result = await aiService.getGameRecommendation(
        "property-test-game",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      // Any action should be valid since player has room to reserve
      const validActions = [
        "take_tokens",
        "purchase_card",
        "reserve_card",
        "purchase_reserved_card",
      ];
      expect(validActions).toContain(recommendation.action);
    }, 30000);
  });

  describe("Property 4: Confidence score should increase when close to winning", () => {
    it("should have higher confidence when player is 1 move away from winning vs early game", async () => {
      // Early game state
      const earlyGame = createGameState(
        { diamond: 1, sapphire: 1, emerald: 1, ruby: 0, onyx: 0, gold: 0 },
        [
          {
            id: "starter-card",
            tier: 1,
            prestige: 0,
            gemBonus: "diamond",
            cost: { diamond: 2 },
          },
        ],
        [],
        [
          {
            id: "card-1",
            tier: 1,
            prestige: 0,
            gemBonus: "sapphire",
            cost: { sapphire: 2 },
          },
          {
            id: "card-2",
            tier: 1,
            prestige: 1,
            gemBonus: "emerald",
            cost: { emerald: 3 },
          },
        ],
        { diamond: 5, sapphire: 5, emerald: 5, ruby: 5, onyx: 5, gold: 5 },
        0 // 0 prestige
      );

      mockGameService = {
        getGame: async () => earlyGame,
      } as any;
      aiService = new AIService(mockGameService);

      const earlyResult = await aiService.getGameRecommendation(
        "property-test-game",
        "player-1"
      );
      const earlyRecommendation = JSON.parse(earlyResult);
      const earlyConfidence = earlyRecommendation.confidenceScore;

      // Late game state - player 1 move away from winning (14 prestige, needs 15 to win)
      const winningCard = {
        id: "winning-card",
        tier: 2,
        prestige: 2,
        gemBonus: "diamond",
        cost: { diamond: 2, sapphire: 1, emerald: 0, ruby: 0, onyx: 0 },
      };

      const lateGame = createGameState(
        { diamond: 3, sapphire: 2, emerald: 1, ruby: 1, onyx: 0, gold: 0 },
        [
          {
            id: "card-1",
            tier: 2,
            prestige: 2,
            gemBonus: "diamond",
            cost: { diamond: 3 },
          },
          {
            id: "card-2",
            tier: 2,
            prestige: 2,
            gemBonus: "sapphire",
            cost: { sapphire: 3 },
          },
          {
            id: "card-3",
            tier: 2,
            prestige: 2,
            gemBonus: "emerald",
            cost: { emerald: 3 },
          },
          {
            id: "card-4",
            tier: 3,
            prestige: 3,
            gemBonus: "ruby",
            cost: { ruby: 4 },
          },
          {
            id: "card-5",
            tier: 3,
            prestige: 3,
            gemBonus: "onyx",
            cost: { onyx: 4 },
          },
        ],
        [],
        [winningCard], // Can buy this card to win
        { diamond: 5, sapphire: 5, emerald: 5, ruby: 5, onyx: 5, gold: 5 },
        14 // 14 prestige, 1 move from winning
      );

      mockGameService = {
        getGame: async () => lateGame,
      } as any;
      aiService = new AIService(mockGameService);

      const lateResult = await aiService.getGameRecommendation(
        "property-test-game",
        "player-1"
      );
      const lateRecommendation = JSON.parse(lateResult);
      const lateConfidence = lateRecommendation.confidenceScore;

      console.log("Early game confidence:", earlyConfidence);
      console.log("Late game (near win) confidence:", lateConfidence);
      console.log("Early game action:", earlyRecommendation.action);
      console.log("Late game action:", lateRecommendation.action);

      // Confidence should be higher when close to winning
      // The AI should be more confident about a winning move than an early game move
      expect(lateConfidence).toBeGreaterThanOrEqual(earlyConfidence);

      // Additionally, when 1 move from winning, confidence should be quite high (>= 7)
      if (
        lateRecommendation.action === "purchase_card" &&
        lateRecommendation.details.cardId === "winning-card"
      ) {
        expect(lateConfidence).toBeGreaterThanOrEqual(7);
      }
    }, 60000); // Longer timeout as this makes 2 API calls
  });
});
