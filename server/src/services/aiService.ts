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
  confidenceScore: number; // 0-10, where 10 is highest confidence
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
          confidenceScore: 10,
        });
      }

      // Build a concise game state summary for the AI
      const prompt = this.buildGameStatePrompt(game, currentPlayer, playerId);

      // Get recommendation from OpenAI
      const openAI = this.getOpenAIProvider();
      const recommendation = await openAI.sendMessage(prompt);

      // Validate and potentially fix the recommendation
      const validatedRecommendation = this.validateRecommendation(
        JSON.parse(recommendation),
        game,
        currentPlayer
      );

      return JSON.stringify(validatedRecommendation);
    } catch (error) {
      console.error("Error getting AI recommendation:", error);
      return JSON.stringify({
        action: "wait",
        reasoning: "Unable to get AI recommendation at this time.",
        details: {},
        confidenceScore: 0,
      });
    }
  }

  private validateRecommendation(
    recommendation: any,
    game: any,
    currentPlayer: any
  ): any {
    const totalTokens = Object.values(currentPlayer.tokens).reduce(
      (sum: number, count: any) => sum + count,
      0
    );

    // Rule 1: Cannot take tokens if already at 10 tokens
    if (recommendation.action === "take_tokens" && totalTokens >= 10) {
      console.warn(
        "AI recommended taking tokens but player already has 10 tokens. Overriding to purchase/reserve."
      );
      return {
        action: "wait",
        reasoning:
          "You already have the maximum 10 tokens. Consider purchasing a card or reserving one instead.",
        details: {},
        confidenceScore: 5,
      };
    }

    // Rule 2: Cannot take tokens that would exceed 10 token limit
    if (
      recommendation.action === "take_tokens" &&
      recommendation.details.tokens
    ) {
      const newTokens = Object.values(recommendation.details.tokens).reduce(
        (sum: number, count: any) => sum + count,
        0
      );

      // Rule 2a: Cannot take more than 3 tokens per turn
      if (newTokens > 3) {
        console.warn(
          `AI recommended taking ${newTokens} tokens but can only take max 3 per turn. Overriding.`
        );
        return {
          action: "wait",
          reasoning: `Cannot take ${newTokens} tokens in one turn. You can take up to 3 tokens: either 3 different colors or 2 of the same color.`,
          details: {},
          confidenceScore: 5,
        };
      }

      // Rule 2b: Cannot take tokens that would exceed 10 total
      if (totalTokens + newTokens > 10) {
        console.warn(
          `AI recommended taking ${newTokens} tokens but would exceed 10 token limit (current: ${totalTokens}). Adjusting.`
        );
        return {
          action: "wait",
          reasoning: `Taking ${newTokens} tokens would exceed the 10 token limit. Consider purchasing a card instead.`,
          details: {},
          confidenceScore: 5,
        };
      }
    }

    // Rule 3: Cannot reserve if already have 3 reserved cards
    if (
      recommendation.action === "reserve_card" &&
      currentPlayer.reservedCards.length >= 3
    ) {
      console.warn(
        "AI recommended reserving but player already has 3 reserved cards. Overriding."
      );
      return {
        action: "wait",
        reasoning:
          "You already have the maximum 3 reserved cards. Purchase one of your reserved cards or take tokens.",
        details: {},
        confidenceScore: 5,
      };
    }

    // If all validations pass, return original recommendation
    return recommendation;
  }

  private buildGameStatePrompt(
    game: any,
    currentPlayer: any,
    playerId: string
  ): string {
    // Calculate total tokens
    const totalTokens = Object.values(currentPlayer.tokens).reduce(
      (sum: number, count: any) => sum + count,
      0
    );

    // Format reserved cards with full details
    const reservedCardsDetails = currentPlayer.reservedCards
      .map((card: any) => this.formatCardDetails(card))
      .join("\n  ");

    return `You are an expert Splendor board game strategist. Analyze the current game state and provide a recommendation in VALID JSON format.

CURRENT PLAYER STATE:
- Prestige Points: ${currentPlayer.prestige}
- Total Tokens: ${totalTokens}/10 (MAX 10 TOKENS ALLOWED)
- Tokens: ${JSON.stringify(currentPlayer.tokens)}
- Card Bonuses: ${JSON.stringify(this.calculateBonuses(currentPlayer.cards))}
- Purchased Cards: ${currentPlayer.cards.length}
- Reserved Cards (${
      currentPlayer.reservedCards.length
    }/3 - MAX 3 RESERVED CARDS):
  ${reservedCardsDetails || "None"}
- Nobles: ${currentPlayer.nobles.length}

GAME RULES - CRITICAL CONSTRAINTS:
1. TOKEN TAKING: Players can take UP TO 3 TOKENS PER TURN in these valid patterns:
   - Take 3 tokens of DIFFERENT colors (1 of each)
   - Take 2 tokens of the SAME color
   - DO NOT take more than 3 tokens total
   - The bank has enough remaining token reserve for the requested tokens
2. TOKEN LIMIT: Players can hold a MAXIMUM of 10 tokens. DO NOT recommend taking tokens if player already has 10 tokens.
3. When taking tokens, ensure the total (current + new tokens) does NOT exceed 10.
4. RESERVE LIMIT: Players can reserve a MAXIMUM of 3 cards. DO NOT recommend reserving if player already has 3 reserved cards.
5. WINNING: To win, a player needs 15 prestige points.

OPPONENTS:
${game.players
  .filter((p: any) => p.id !== playerId)
  .map(
    (p: any) =>
      `- ${p.name}: ${p.prestige} pts, ${
        p.cards.length
      } cards, Bonuses: ${JSON.stringify(this.calculateBonuses(p.cards))}`
  )
  .join("\n")}

AVAILABLE CARDS ON BOARD:
Tier 3:
${this.formatCardsDetailed(game.board.availableCards.tier3)}

Tier 2:
${this.formatCardsDetailed(game.board.availableCards.tier2)}

Tier 1:
${this.formatCardsDetailed(game.board.availableCards.tier1)}

NOBLES AVAILABLE:
${this.formatNobles(game.board.nobles)}

TOKEN BANK:
${JSON.stringify(game.board.tokens)}

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
    },  // ONLY include if action is take_tokens, otherwise OMIT this field
    "cardId": string,  // ONLY include for purchase_card, reserve_card, or purchase_reserved_card, otherwise OMIT
    "payment": {
      "diamond": number,
      "sapphire": number,
      "emerald": number,
      "ruby": number,
      "onyx": number,
      "gold": number
    }  // ONLY include for purchase_card or purchase_reserved_card, otherwise OMIT
  },
  "confidenceScore": number  // 0-10, where 10 is highest confidence in this recommendation
}

IMPORTANT: Do NOT include fields set to "undefined" or "null". Simply OMIT fields that don't apply to the action.
For example, if action is "take_tokens", ONLY include the "tokens" field in details.

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

  private formatCardDetails(card: any): string {
    const cost = Object.entries(card.cost || {})
      .filter(([_, count]) => (count as number) > 0)
      .map(([gem, count]) => `${count}${gem}`)
      .join(" ");
    return `[${card.id}] ${card.prestige}pts, ${card.gemBonus} bonus, Cost: ${
      cost || "free"
    }`;
  }

  private formatCardsDetailed(cards: any[]): string {
    if (!cards || cards.length === 0) return "  None";
    return cards.map((c) => `  ${this.formatCardDetails(c)}`).join("\n");
  }

  private formatNobles(nobles: any[]): string {
    if (!nobles || nobles.length === 0) return "None";
    return nobles
      .map((n: any) => {
        const req = Object.entries(n.requirements || {})
          .filter(([_, count]) => (count as number) > 0)
          .map(([gem, count]) => `${count}${gem}`)
          .join(" ");
        return `- ${n.name}: ${n.prestige}pts, Requires: ${req}`;
      })
      .join("\n");
  }
}
