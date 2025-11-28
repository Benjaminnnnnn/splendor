import { describe, it, expect, beforeEach } from "vitest";
import { AIService } from "../server/src/services/aiService";
import { GameService } from "../server/src/services/gameService";
import { GameState } from "../shared/types/game";

describe("AIService Integration Tests", () => {
  let aiService: AIService;
  let mockGameService: GameService;

  const createMockGame = (currentPlayerIndex: number = 0) => ({
    id: "integration-game-123",
    state: GameState.IN_PROGRESS,
    currentPlayerIndex,
    players: [
      {
        id: "player-1",
        name: "Alice",
        prestige: 5,
        tokens: {
          diamond: 2,
          sapphire: 1,
          emerald: 1,
          ruby: 0,
          onyx: 0,
          gold: 0,
        },
        cards: [
          {
            id: "card-1",
            tier: 1,
            prestige: 1,
            gemBonus: "diamond",
            cost: { diamond: 2 },
          },
        ],
        reservedCards: [],
        nobles: [],
      },
      {
        id: "player-2",
        name: "Bob",
        prestige: 3,
        tokens: {
          diamond: 1,
          sapphire: 2,
          emerald: 0,
          ruby: 1,
          onyx: 1,
          gold: 0,
        },
        cards: [
          {
            id: "card-2",
            tier: 1,
            prestige: 1,
            gemBonus: "sapphire",
            cost: { sapphire: 3 },
          },
        ],
        reservedCards: [],
        nobles: [],
      },
    ],
    board: {
      tokens: {
        diamond: 5,
        sapphire: 5,
        emerald: 5,
        ruby: 5,
        onyx: 5,
        gold: 5,
      },
      availableCards: {
        tier1: [
          {
            id: "tier1-card-1",
            tier: 1,
            prestige: 0,
            gemBonus: "diamond",
            cost: { diamond: 3 },
          },
          {
            id: "tier1-card-2",
            tier: 1,
            prestige: 0,
            gemBonus: "sapphire",
            cost: { sapphire: 2, emerald: 1 },
          },
          {
            id: "tier1-card-3",
            tier: 1,
            prestige: 0,
            gemBonus: "emerald",
            cost: { emerald: 2, ruby: 1 },
          },
          {
            id: "tier1-card-4",
            tier: 1,
            prestige: 1,
            gemBonus: "ruby",
            cost: { ruby: 3, onyx: 1 },
          },
        ],
        tier2: [
          {
            id: "tier2-card-1",
            tier: 2,
            prestige: 1,
            gemBonus: "emerald",
            cost: { emerald: 3, ruby: 2 },
          },
          {
            id: "tier2-card-2",
            tier: 2,
            prestige: 2,
            gemBonus: "diamond",
            cost: { diamond: 3, sapphire: 2, emerald: 2 },
          },
        ],
        tier3: [
          {
            id: "tier3-card-1",
            tier: 3,
            prestige: 3,
            gemBonus: "ruby",
            cost: { ruby: 5, onyx: 3 },
          },
        ],
      },
      cardDecks: {
        tier1: 20,
        tier2: 15,
        tier3: 10,
      },
      nobles: [
        {
          id: "noble-1",
          name: "Noble One",
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

  beforeEach(() => {
    mockGameService = {
      getGame: async (gameId: string) => createMockGame(),
    } as any;

    aiService = new AIService(mockGameService);
  });

  describe("Real OpenAI Integration", () => {
    it("should return a valid AI recommendation from OpenAI", async () => {
      // This test requires OPENAI_API_KEY to be set
      if (!process.env.OPENAI_API_KEY) {
        throw new Error(
          "OPENAI_API_KEY environment variable must be set to run integration tests"
        );
      }

      const result = await aiService.getGameRecommendation(
        "integration-game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      // Verify the structure
      expect(recommendation).toHaveProperty("action");
      expect(recommendation).toHaveProperty("reasoning");
      expect(recommendation).toHaveProperty("details");
      expect(recommendation).toHaveProperty("confidenceScore");

      // Verify action is valid
      const validActions = [
        "take_tokens",
        "purchase_card",
        "reserve_card",
        "purchase_reserved_card",
      ];
      expect(validActions).toContain(recommendation.action);

      // Verify reasoning is meaningful (not empty)
      expect(recommendation.reasoning).toBeTruthy();
      expect(recommendation.reasoning.length).toBeGreaterThan(10);

      // Verify confidence score is in valid range
      expect(recommendation.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidenceScore).toBeLessThanOrEqual(10);

      // Action-specific validations
      if (recommendation.action === "take_tokens") {
        expect(recommendation.details.tokens).toBeDefined();
        const totalTokens = Object.values(recommendation.details.tokens).reduce(
          (sum: number, count: any) => sum + count,
          0
        );
        expect(totalTokens).toBeGreaterThan(0);
        expect(totalTokens).toBeLessThanOrEqual(3);
      }

      if (
        recommendation.action === "purchase_card" ||
        recommendation.action === "purchase_reserved_card"
      ) {
        expect(recommendation.details.cardId).toBeDefined();
        expect(typeof recommendation.details.cardId).toBe("string");
      }

      if (recommendation.action === "reserve_card") {
        expect(recommendation.details.cardId).toBeDefined();
      }

      console.log(
        "AI Recommendation:",
        JSON.stringify(recommendation, null, 2)
      );
    }, 30000); // 30 second timeout for API call

    it("should provide strategic reasoning based on game state", async () => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error(
          "OPENAI_API_KEY environment variable must be set to run integration tests"
        );
      }

      // Game state where player has tokens to buy a card
      const gameWithAffordableCard = createMockGame();
      gameWithAffordableCard.players[0].tokens = {
        diamond: 3,
        sapphire: 1,
        emerald: 1,
        ruby: 0,
        onyx: 0,
        gold: 0,
      };

      mockGameService.getGame = async () => gameWithAffordableCard;

      const result = await aiService.getGameRecommendation(
        "integration-game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      // AI should recognize the opportunity to purchase a card
      expect(["purchase_card", "take_tokens", "reserve_card"]).toContain(
        recommendation.action
      );
      expect(recommendation.reasoning).toBeTruthy();

      console.log("Strategic Recommendation:", {
        action: recommendation.action,
        reasoning: recommendation.reasoning,
        confidence: recommendation.confidenceScore,
      });
    }, 30000);

    it("should handle player with many reserved cards", async () => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error(
          "OPENAI_API_KEY environment variable must be set to run integration tests"
        );
      }

      const gameWithReservedCards = createMockGame();
      gameWithReservedCards.players[0].reservedCards = [
        {
          id: "reserved-1",
          tier: 2,
          prestige: 2,
          gemBonus: "diamond",
          cost: { diamond: 3, sapphire: 2 },
        },
        {
          id: "reserved-2",
          tier: 3,
          prestige: 3,
          gemBonus: "ruby",
          cost: { ruby: 5, onyx: 3 },
        },
      ];

      mockGameService.getGame = async () => gameWithReservedCards;

      const result = await aiService.getGameRecommendation(
        "integration-game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation).toBeDefined();
      expect(recommendation.action).toBeTruthy();

      console.log("Reserved Cards Recommendation:", {
        action: recommendation.action,
        hasCardId: !!recommendation.details.cardId,
        confidence: recommendation.confidenceScore,
      });
    }, 30000);

    it("should consider opponent positions", async () => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error(
          "OPENAI_API_KEY environment variable must be set to run integration tests"
        );
      }

      const gameWithStrongOpponent = createMockGame();
      gameWithStrongOpponent.players[1].prestige = 12; // Opponent close to winning
      gameWithStrongOpponent.players[1].cards = [
        {
          id: "opp-card-1",
          tier: 2,
          prestige: 2,
          gemBonus: "diamond",
          cost: {},
        },
        {
          id: "opp-card-2",
          tier: 2,
          prestige: 2,
          gemBonus: "sapphire",
          cost: {},
        },
        {
          id: "opp-card-3",
          tier: 3,
          prestige: 3,
          gemBonus: "emerald",
          cost: {},
        },
        { id: "opp-card-4", tier: 3, prestige: 3, gemBonus: "ruby", cost: {} },
        { id: "opp-card-5", tier: 3, prestige: 2, gemBonus: "onyx", cost: {} },
      ];

      mockGameService.getGame = async () => gameWithStrongOpponent;

      const result = await aiService.getGameRecommendation(
        "integration-game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation).toBeDefined();
      expect(recommendation.reasoning).toBeTruthy();

      console.log("Competitive Scenario:", {
        action: recommendation.action,
        reasoning: recommendation.reasoning.substring(0, 100) + "...",
        confidence: recommendation.confidenceScore,
      });
    }, 30000);

    it("should recommend valid token combinations", async () => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error(
          "OPENAI_API_KEY environment variable must be set to run integration tests"
        );
      }

      const gameWithNoAffordableCards = createMockGame();
      gameWithNoAffordableCards.players[0].tokens = {
        diamond: 0,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
        gold: 0,
      };

      mockGameService.getGame = async () => gameWithNoAffordableCards;

      const result = await aiService.getGameRecommendation(
        "integration-game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      if (recommendation.action === "take_tokens") {
        const tokens = recommendation.details.tokens;
        const totalTokens = Object.values(tokens).reduce(
          (sum: number, count: any) => sum + count,
          0
        );

        // Validate Splendor token rules
        expect(totalTokens).toBeGreaterThan(0);
        expect(totalTokens).toBeLessThanOrEqual(3);

        const nonZeroGems = Object.entries(tokens).filter(
          ([_, count]) => (count as number) > 0
        );

        // If taking 3 tokens, they should be different colors (1 of each)
        if (totalTokens === 3) {
          expect(nonZeroGems).toHaveLength(3);
          expect(nonZeroGems.every(([_, count]) => count === 1)).toBe(true);
        }

        // If taking 2 tokens, they should be the same color (2 of one type)
        // OR it could be 2 different colors (1 of each) which is also valid
        if (totalTokens === 2) {
          // Either 2 of the same color OR 2 different colors with 1 each
          const isTwoSame = nonZeroGems.length === 1 && nonZeroGems[0][1] === 2;
          const isTwoDifferent =
            nonZeroGems.length === 2 &&
            nonZeroGems.every(([_, count]) => count === 1);

          expect(isTwoSame || isTwoDifferent).toBe(true);
        }
      }
    }, 30000);

    it("should return valid JSON even under unusual game states", async () => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error(
          "OPENAI_API_KEY environment variable must be set to run integration tests"
        );
      }

      const edgeCaseGame = createMockGame();
      edgeCaseGame.players[0].tokens = {
        diamond: 10,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
        gold: 0,
      };
      edgeCaseGame.board.tokens = {
        diamond: 0,
        sapphire: 0,
        emerald: 1,
        ruby: 0,
        onyx: 0,
        gold: 0,
      };

      mockGameService.getGame = async () => edgeCaseGame;

      const result = await aiService.getGameRecommendation(
        "integration-game-123",
        "player-1"
      );

      // Should not throw, should return valid JSON
      expect(() => JSON.parse(result)).not.toThrow();

      const recommendation = JSON.parse(result);
      expect(recommendation).toHaveProperty("action");
      expect(recommendation).toHaveProperty("reasoning");
    }, 30000);
  });

  describe("Error Handling with Real Provider", () => {
    it("should handle missing API key gracefully", async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        const result = await aiService.getGameRecommendation(
          "integration-game-123",
          "player-1"
        );
        const recommendation = JSON.parse(result);

        // Should return error recommendation
        expect(recommendation.action).toBe("any");
        expect(recommendation.reasoning).toContain(
          "Unable to get AI recommendation"
        );
      } finally {
        if (originalKey) {
          process.env.OPENAI_API_KEY = originalKey;
        }
      }
    });
  });
});
