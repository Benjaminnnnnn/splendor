import { GameService } from "./gameService";
import { OpenAIProvider } from "../infrastructure/openAIProvider";

export interface AIRecommendation {
  action:
    | "take_tokens"
    | "purchase_card"
    | "reserve_card"
    | "purchase_reserved_card";
  reasoning: string;
  details: {
    // For take_tokens action
    tokens?: {
      diamond?: number;
      sapphire?: number;
      emerald?: number;
      ruby?: number;
      onyx?: number;
      gold?: number;
    };
    // For card actions - MUST have exact cardId
    cardId?: string;
    // Optional: payment tokens for purchase actions
    payment?: {
      diamond?: number;
      sapphire?: number;
      emerald?: number;
      ruby?: number;
      onyx?: number;
      gold?: number;
    };
  };
  confidence: "low" | "medium" | "high";
}

export class AIService {
  private openAIProvider: OpenAIProvider | null = null;
  private gameService: GameService;

  constructor(gameService: GameService) {
    this.gameService = gameService;
  }

  private getOpenAIProvider(): OpenAIProvider {
    if (!this.openAIProvider) {
      this.openAIProvider = new OpenAIProvider();
    }
    return this.openAIProvider;
  }

  async getGameRecommendation(
    gameId: string,
    playerId: string
  ): Promise<string> {
    try {
      // Get the current game state
      const game = await this.gameService.getGame(gameId);

      // Find the current player
      const currentPlayer = game.players.find((p) => p.id === playerId);
      if (!currentPlayer) {
        throw new Error("Player not found in game");
      }

      // Check if it's the player's turn
      const isPlayerTurn =
        game.players[game.currentPlayerIndex]?.id === playerId;
      if (!isPlayerTurn) {
        return JSON.stringify({
          action: "wait",
          reasoning:
            "It's not your turn yet. Wait for your opponents to complete their moves.",
          details: {},
          confidence: "high",
        });
      }

      // Build a concise game state summary for the AI
      const prompt = this.buildGameStatePrompt(game, currentPlayer, playerId);

      // Get recommendation from OpenAI
      const openAI = this.getOpenAIProvider();
      const recommendation = await openAI.sendMessage(prompt);

      return recommendation;
    } catch (error) {
      console.error("Error getting AI recommendation:", error);
      return JSON.stringify({
        action: "wait",
        reasoning: "Unable to get AI recommendation at this time.",
        details: {},
        confidence: "low",
      });
    }
  }

  private buildGameStatePrompt(
    game: any,
    currentPlayer: any,
    playerId: string
  ): string {
    // Calculate bonuses from purchased cards
    const bonuses = this.calculateBonuses(currentPlayer.cards);

    // Get other players' prestige for context
    const opponents = game.players
      .filter((p: any) => p.id !== playerId)
      .map((p: any) => `${p.name}: ${p.prestige} pts`)
      .join(", ");

    return `You are an expert Splendor board game strategist. Analyze the current game state and provide a recommendation in VALID JSON format.

CURRENT PLAYER STATE:
- Prestige Points: ${currentPlayer.prestige}
- Tokens: Diamond=${currentPlayer.tokens.diamond}, Sapphire=${
      currentPlayer.tokens.sapphire
    }, Emerald=${currentPlayer.tokens.emerald}, Ruby=${
      currentPlayer.tokens.ruby
    }, Onyx=${currentPlayer.tokens.onyx}, Gold=${currentPlayer.tokens.gold}
- Card Bonuses: Diamond=${bonuses.diamond}, Sapphire=${
      bonuses.sapphire
    }, Emerald=${bonuses.emerald}, Ruby=${bonuses.ruby}, Onyx=${bonuses.onyx}
- Reserved Cards: ${currentPlayer.reservedCards.length}
- Nobles Acquired: ${currentPlayer.nobles.length}

OPPONENTS:
${opponents}

AVAILABLE CARDS ON BOARD:
Tier 1: ${game.board.availableCards.tier1.length} cards (${this.summarizeCards(
      game.board.availableCards.tier1
    )})
Tier 2: ${game.board.availableCards.tier2.length} cards (${this.summarizeCards(
      game.board.availableCards.tier2
    )})
Tier 3: ${game.board.availableCards.tier3.length} cards (${this.summarizeCards(
      game.board.availableCards.tier3
    )})

NOBLES AVAILABLE:
${
  game.board.nobles
    .map((n: any) => `${n.name} (${n.prestige}pts)`)
    .join(", ") || "None"
}

TOKEN BANK:
Diamond=${game.board.tokens.diamond}, Sapphire=${
      game.board.tokens.sapphire
    }, Emerald=${game.board.tokens.emerald}, Ruby=${
      game.board.tokens.ruby
    }, Onyx=${game.board.tokens.onyx}, Gold=${game.board.tokens.gold}

Respond with ONLY a valid JSON object matching this EXACT structure:
{
  "action": "take_tokens" | "purchase_card" | "reserve_card" | "purchase_reserved_card",
  "reasoning": string,
  "details": {
    "tokens": {
      "diamond": number,
      "sapphire": number,
      "emerald": number,
      "ruby": number,
      "onyx": number,
      "gold": number
    } | undefined,  // ONLY if action is take_tokens
    "cardId": string | undefined,  // REQUIRED for purchase_card, reserve_card, or purchase_reserved_card
    "payment": {
      "diamond": number,
      "sapphire": number,
      "emerald": number,
      "ruby": number,
      "onyx": number,
      "gold": number
    } | undefined  // ONLY if action is purchase_card or purchase_reserved_card
  },
  "confidence": "low" | "medium" | "high"
}

Focus on the best strategic move to win. Return ONLY the JSON, no other text.`;
  }

  private calculateBonuses(cards: any[]): any {
    const bonuses = {
      diamond: 0,
      sapphire: 0,
      emerald: 0,
      ruby: 0,
      onyx: 0,
    };

    cards.forEach((card) => {
      if (card.gemBonus && bonuses.hasOwnProperty(card.gemBonus)) {
        bonuses[card.gemBonus as keyof typeof bonuses]++;
      }
    });

    return bonuses;
  }

  private summarizeCards(cards: any[]): string {
    if (!cards || cards.length === 0) return "none";

    const summary = cards
      .map((c) => `ID:${c.id} ${c.prestige}pts ${c.gemBonus} bonus`)
      .slice(0, 3); // Show first 3 cards with IDs

    return summary.join(", ") + (cards.length > 3 ? "..." : "");
  }
}
