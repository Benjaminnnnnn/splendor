import { Game } from '../domain/Game';
import { Player } from '../domain/Player';
import { Card } from '../domain/Card';
import { Noble } from '../domain/Noble';
import { TokenBank } from '../domain/TokenBank';
import { GemType } from '../domain/types';
import {
  GameStateDTO,
  PlayerDTO,
  CardDTO,
  NobleDTO,
  TokenBankDTO
} from './dtos';

/**
 * Mappers to convert between domain models and DTOs
 */

export class DomainToDTOMapper {
  static mapGame(game: Game): GameStateDTO {
    const players = game.getPlayers().map(p => this.mapPlayer(p));
    const status = game.getStatus();
    // Only access game board if decks have been initialized (game has started)
    const hasDecksInitialized = game.isInProgress() || game.isFinished();
    
    return {
      id: game.id,
      name: game.name,
      players,
      currentPlayerIndex: game.getCurrentPlayerIndex(),
      state: status,
      board: {
        availableCards: {
          tier1: hasDecksInitialized ? game.getCardDeck(1).getVisibleCards().map(c => this.mapCard(c)) : [],
          tier2: hasDecksInitialized ? game.getCardDeck(2).getVisibleCards().map(c => this.mapCard(c)) : [],
          tier3: hasDecksInitialized ? game.getCardDeck(3).getVisibleCards().map(c => this.mapCard(c)) : [],
        },
        cardDecks: {
          tier1: hasDecksInitialized ? game.getCardDeck(1).getRemainingCount() : 0,
          tier2: hasDecksInitialized ? game.getCardDeck(2).getRemainingCount() : 0,
          tier3: hasDecksInitialized ? game.getCardDeck(3).getRemainingCount() : 0,
        },
        nobles: hasDecksInitialized ? game.getNobles().map(n => this.mapNoble(n)) : [],
        tokens: hasDecksInitialized ? this.mapTokenBank(game.getBank()) : {
          diamond: 0,
          sapphire: 0,
          emerald: 0,
          ruby: 0,
          onyx: 0,
          gold: 0,
        },
      },
      isPrivate: game.isPrivate,
      inviteCode: game.inviteCode,
      createdBy: game.createdBy,
      winner: game.getWinner() ? this.mapPlayer(game.getWinner()!) : undefined,
      createdAt: game.getCreatedAt().toISOString(),
      updatedAt: game.getUpdatedAt().toISOString(),
    };
  }

  static mapPlayer(player: Player): PlayerDTO {
    return {
      id: player.id,
      name: player.name,
      userId: player.getUserId(),
      tokens: this.mapTokenBank(player.getTokenBank()),
      cards: player.getPurchasedCards().map(c => this.mapCard(c)),
      reservedCards: player.getReservedCards().map(c => this.mapCard(c)),
      nobles: player.getNobles().map(n => this.mapNoble(n)),
      prestige: player.getPrestige(),
    };
  }

  static mapCard(card: Card): CardDTO {
    return {
      id: card.id,
      tier: card.tier,
      prestige: card.prestigePoints,
      gemBonus: card.gemBonus,
      cost: card.cost,
    };
  }

  static mapNoble(noble: Noble): NobleDTO {
    return {
      id: noble.id,
      name: noble.name,
      prestige: noble.prestigePoints,
      requirements: noble.requirements,
    };
  }

  static mapTokenBank(bank: TokenBank): TokenBankDTO {
    return {
      diamond: bank.get(GemType.DIAMOND),
      sapphire: bank.get(GemType.SAPPHIRE),
      emerald: bank.get(GemType.EMERALD),
      ruby: bank.get(GemType.RUBY),
      onyx: bank.get(GemType.ONYX),
      gold: bank.get(GemType.GOLD),
    };
  }
}
