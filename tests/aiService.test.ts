import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIService } from "../server/src/services/aiService";
import { GameService } from "../server/src/services/gameService";
import { GameState } from "../shared/types/game";

// Mock the OpenAI provider
vi.mock("../server/src/infrastructure/openAIProvider", () => {
  return {
    OpenAIProvider: vi.fn().mockImplementation(() => {
      return {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Taking tokens to build resources.",
            details: {
              tokens: { diamond: 1, sapphire: 1, emerald: 1 },
            },
            confidenceScore: 8,
          })
        ),
      };
    }),
  };
});

describe("AIService", () => {
  let aiService: AIService;
  let mockGameService: GameService;

  const mockGame = {
    id: "game-123",
    state: GameState.IN_PROGRESS,
    currentPlayerIndex: 0,
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
            cost: { diamond: 2, sapphire: 1 },
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
        ],
        tier3: [
          {
            id: "tier3-card-1",
            tier: 3,
            prestige: 2,
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
          requirements: { diamond: 3, sapphire: 3 },
        },
      ],
    },
  };

  beforeEach(() => {
    mockGameService = {
      getGame: vi.fn().mockResolvedValue(mockGame),
    } as any;

    aiService = new AIService(mockGameService);
  });

  describe("getGameRecommendation", () => {
    it("should return AI recommendation for current player", async () => {
      const result = await aiService.getGameRecommendation(
        "game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation).toHaveProperty("action");
      expect(recommendation).toHaveProperty("reasoning");
      expect(recommendation).toHaveProperty("details");
      expect(recommendation).toHaveProperty("confidenceScore");
    });

    it("should return wait action when not player's turn", async () => {
      const result = await aiService.getGameRecommendation(
        "game-123",
        "player-2"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("wait");
      expect(recommendation.reasoning).toContain("not your turn");
      expect(recommendation.confidenceScore).toBe(10);
    });

    it("should throw error when player not found", async () => {
      const result = await aiService.getGameRecommendation(
        "game-123",
        "non-existent-player"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.reasoning).toContain(
        "Unable to get AI recommendation"
      );
      expect(recommendation.confidenceScore).toBe(0);
    });

    it("should handle errors gracefully", async () => {
      mockGameService.getGame = vi
        .fn()
        .mockRejectedValue(new Error("Database error"));

      const result = await aiService.getGameRecommendation(
        "game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.reasoning).toContain(
        "Unable to get AI recommendation"
      );
      expect(recommendation.confidenceScore).toBe(0);
    });
  });

  describe("AI recommendation structure validation", () => {
    it("should validate take_tokens action has tokens details", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Taking tokens",
            details: {
              tokens: { diamond: 1, sapphire: 1, emerald: 1 },
            },
            confidenceScore: 7,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;
      const result = await aiService.getGameRecommendation(
        "game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("take_tokens");
      expect(recommendation.details.tokens).toBeDefined();
      expect(recommendation.details.tokens.diamond).toBeGreaterThanOrEqual(0);
    });

    it("should validate purchase_card action has cardId", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "purchase_card",
            reasoning: "Purchasing valuable card",
            details: {
              cardId: "tier1-card-1",
              payment: { diamond: 2, sapphire: 1 },
            },
            confidenceScore: 9,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;
      const result = await aiService.getGameRecommendation(
        "game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("purchase_card");
      expect(recommendation.details.cardId).toBeDefined();
      expect(recommendation.details.payment).toBeDefined();
    });

    it("should validate reserve_card action has cardId", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "reserve_card",
            reasoning: "Reserving high-value card",
            details: {
              cardId: "tier3-card-1",
            },
            confidenceScore: 6,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;
      const result = await aiService.getGameRecommendation(
        "game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("reserve_card");
      expect(recommendation.details.cardId).toBeDefined();
    });

    it("should validate confidenceScore is between 0 and 10", async () => {
      const result = await aiService.getGameRecommendation(
        "game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidenceScore).toBeLessThanOrEqual(10);
    });
  });

  describe("Validation overrides", () => {
    it("should override when player already has 10 tokens and AI suggests take_tokens", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Take more tokens",
            details: { tokens: { diamond: 1, sapphire: 1, emerald: 1 } },
            confidenceScore: 9,
          })
        ),
      };

      const gameWithMaxTokens = {
        ...mockGame,
        players: [
          {
            ...mockGame.players[0],
            tokens: { diamond: 3, sapphire: 3, emerald: 2, ruby: 2, onyx: 0, gold: 0 }, // 10 tokens
          },
          mockGame.players[1],
        ],
      };

      mockGameService.getGame = vi.fn().mockResolvedValue(gameWithMaxTokens);
      (aiService as any).openAIProvider = mockOpenAI;

      const result = await aiService.getGameRecommendation("game-123", "player-1");
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.reasoning).toContain("10 tokens");
    });

    it("should override when AI suggests taking more than 3 tokens in one turn", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Grab everything",
            details: { tokens: { diamond: 2, sapphire: 2, emerald: 0 } }, // 4 total
            confidenceScore: 6,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;

      const result = await aiService.getGameRecommendation("game-123", "player-1");
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.confidenceScore).toBe(0);
    });

    it("should override when AI suggests taking two different colors", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Two colors",
            details: { tokens: { diamond: 1, sapphire: 1 } }, // invalid pattern for 2 tokens
            confidenceScore: 5,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;

      const result = await aiService.getGameRecommendation("game-123", "player-1");
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.confidenceScore).toBe(0);
    });

    it("should override when AI suggests taking only one token", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Just one",
            details: { tokens: { ruby: 1 } },
            confidenceScore: 4,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;

      const result = await aiService.getGameRecommendation("game-123", "player-1");
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.confidenceScore).toBe(0);
    });

    it("should override when AI suggests tokens that push total above 10", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Go over the limit",
            details: { tokens: { diamond: 2 } },
            confidenceScore: 5,
          })
        ),
      };

      const gameWithNineTokens = {
        ...mockGame,
        players: [
          {
            ...mockGame.players[0],
            tokens: { diamond: 4, sapphire: 3, emerald: 2, ruby: 0, onyx: 0, gold: 0 }, // 9 tokens
          },
          mockGame.players[1],
        ],
      };

      mockGameService.getGame = vi.fn().mockResolvedValue(gameWithNineTokens);
      (aiService as any).openAIProvider = mockOpenAI;

      const result = await aiService.getGameRecommendation("game-123", "player-1");
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.confidenceScore).toBe(0);
    });

    it("should override when reserving with 3 reserved cards already", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "reserve_card",
            reasoning: "Reserve again",
            details: { cardId: "another-card" },
            confidenceScore: 6,
          })
        ),
      };

      const gameWithThreeReserved = {
        ...mockGame,
        players: [
          {
            ...mockGame.players[0],
            reservedCards: [
              { id: "r1" },
              { id: "r2" },
              { id: "r3" },
            ],
          },
          mockGame.players[1],
        ],
      };

      mockGameService.getGame = vi.fn().mockResolvedValue(gameWithThreeReserved);
      (aiService as any).openAIProvider = mockOpenAI;

      const result = await aiService.getGameRecommendation("game-123", "player-1");
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.confidenceScore).toBe(0);
    });

    it("should return error response when OpenAI returns invalid JSON", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue("not-json"),
      };

      (aiService as any).openAIProvider = mockOpenAI;

      const result = await aiService.getGameRecommendation("game-123", "player-1");
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.reasoning).toContain("Unable to get AI recommendation");
      expect(recommendation.confidenceScore).toBe(0);
    });

    it("should return error response when OpenAI throws", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockRejectedValue(new Error("API failure")),
      };

      (aiService as any).openAIProvider = mockOpenAI;

      const result = await aiService.getGameRecommendation("game-123", "player-1");
      const recommendation = JSON.parse(result);

      expect(recommendation.action).toBe("any");
      expect(recommendation.reasoning).toContain("Unable to get AI recommendation");
      expect(recommendation.confidenceScore).toBe(0);
    });
  });

  describe("Game state analysis", () => {
    it("should include current player state in prompt", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Building resources",
            details: { tokens: { diamond: 1 } },
            confidenceScore: 5,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;
      await aiService.getGameRecommendation("game-123", "player-1");

      expect(mockOpenAI.sendMessage).toHaveBeenCalled();
      const prompt = mockOpenAI.sendMessage.mock.calls[0][0];

      expect(prompt).toContain("CURRENT PLAYER STATE");
      expect(prompt).toContain("Prestige Points: 5");
      expect(prompt).toContain("Total Tokens: 4/10");
      expect(prompt).toContain("Purchased Cards: 1");
    });

    it("should include opponent information in prompt", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Strategic move",
            details: { tokens: { ruby: 1 } },
            confidenceScore: 6,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;
      await aiService.getGameRecommendation("game-123", "player-1");

      const prompt = mockOpenAI.sendMessage.mock.calls[0][0];

      expect(prompt).toContain("OPPONENTS");
      expect(prompt).toContain("Bob");
      expect(prompt).toContain("3 pts");
    });

    it("should include available cards in prompt", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "purchase_card",
            reasoning: "Good card available",
            details: { cardId: "tier1-card-1", payment: {} },
            confidenceScore: 8,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;
      await aiService.getGameRecommendation("game-123", "player-1");

      const prompt = mockOpenAI.sendMessage.mock.calls[0][0];

      expect(prompt).toContain("AVAILABLE CARDS ON BOARD");
      expect(prompt).toContain("Tier 1");
      expect(prompt).toContain("Tier 2");
      expect(prompt).toContain("Tier 3");
    });

    it("should include nobles in prompt", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Building toward noble",
            details: { tokens: { diamond: 1, sapphire: 1 } },
            confidenceScore: 7,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;
      await aiService.getGameRecommendation("game-123", "player-1");

      const prompt = mockOpenAI.sendMessage.mock.calls[0][0];

      expect(prompt).toContain("NOBLES AVAILABLE");
      expect(prompt).toContain("Noble One");
    });

    it("should include token bank state in prompt", async () => {
      const mockOpenAI = {
        sendMessage: vi.fn().mockResolvedValue(
          JSON.stringify({
            action: "take_tokens",
            reasoning: "Tokens available",
            details: { tokens: { emerald: 1 } },
            confidenceScore: 5,
          })
        ),
      };

      (aiService as any).openAIProvider = mockOpenAI;
      await aiService.getGameRecommendation("game-123", "player-1");

      const prompt = mockOpenAI.sendMessage.mock.calls[0][0];

      expect(prompt).toContain("TOKEN BANK");
    });
  });

  describe("Recommendation reasoning quality", () => {
    it("should provide non-empty reasoning", async () => {
      const result = await aiService.getGameRecommendation(
        "game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      expect(recommendation.reasoning).toBeTruthy();
      expect(recommendation.reasoning.length).toBeGreaterThan(0);
    });

    it("should have valid action type", async () => {
      const result = await aiService.getGameRecommendation(
        "game-123",
        "player-1"
      );
      const recommendation = JSON.parse(result);

      const validActions = [
        "take_tokens",
        "purchase_card",
        "reserve_card",
        "purchase_reserved_card",
        "wait",
      ];
      expect(validActions).toContain(recommendation.action);
    });
  });
});
