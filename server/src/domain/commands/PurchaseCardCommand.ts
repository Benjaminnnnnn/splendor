import { GameCommand } from './GameCommand';
import { Game } from '../Game';
import { GemType } from '../types';

export type PaymentSelection = {
  [key in GemType]?: number;
};

/**
 * Command for purchasing a card from the board.
 */
export class PurchaseCardCommand extends GameCommand {
  constructor(
    private readonly playerId: string,
    private readonly cardId: string,
    private readonly payment?: PaymentSelection
  ) {
    super();
  }

  run(game: Game): void {
    this.validateGameInProgress(game);
    this.validatePlayerTurn(game, this.playerId);

    const player = game.getPlayer(this.playerId);
    const card = game.removeCard(this.cardId);
    const bank = game.getBank();

    if (!card) {
      throw new Error('Card not found on board');
    }

    // Calculate effective cost after applying permanent bonuses
    const bonuses = player.getGemBonuses();
    const effectiveCost = card.calculateEffectiveCost(bonuses);
    
    // If payment not provided, compute minimal payment automatically
    const paymentSelection = this.payment ? this.payment : this.calculatePayment(player, effectiveCost);

    // Validate payment
    this.validatePayment(player, effectiveCost, paymentSelection);

    // Process payment: transfer tokens from player to bank
    for (const [gem, amount] of Object.entries(paymentSelection)) {
      const gemType = gem as GemType;
      const count = amount || 0;
      
      if (count > 0) {
        player.removeTokens(gemType, count);
        bank.add(gemType, count);
      }
    }

    // Add card to player's purchased cards
    player.addPurchasedCard(card);

    // Check if a noble visits
    const noble = game.checkNobleVisits(player);
    if (noble) {
      player.addNoble(noble);
    }

    // Check win condition
    game.checkWinCondition(player);
    
    game.advanceTurn();
    game.updateTimestamp();
  }

  private calculatePayment(player: any, effectiveCost: Map<GemType, number>): PaymentSelection {
    const payment: PaymentSelection = {};
    let goldNeeded = 0;

    for (const [gem, required] of effectiveCost) {
      const available = player.getTokenCount(gem);
      const useFromColor = Math.min(required, available);
      const shortfall = required - useFromColor;

      if (useFromColor > 0) {
        payment[gem] = useFromColor;
      }

      goldNeeded += shortfall;
    }

    if (goldNeeded > 0) {
      payment[GemType.GOLD] = goldNeeded;
    }

    return payment;
  }

  private validatePayment(player: any, effectiveCost: Map<GemType, number>, payment: PaymentSelection): void {
    // Verify the player has the tokens they're paying with
    for (const [gem, amount] of Object.entries(payment)) {
      const gemType = gem as GemType;
      const count = amount || 0;
      
      if (count > 0) {
        const available = player.getTokenCount(gemType);
        if (available < count) {
          throw new Error(`Insufficient ${gemType} tokens for payment`);
        }
      }
    }

    // Verify the payment covers the effective cost
    const coverage = new Map<GemType, number>();
    
    for (const [gem, amount] of Object.entries(payment)) {
      const gemType = gem as GemType;
      const count = amount || 0;
      
      if (gemType === GemType.GOLD) {
        continue;
      }
      
      coverage.set(gemType, count);
    }

    const goldUsed = payment[GemType.GOLD] || 0;
    let goldNeeded = 0;

    for (const [gem, required] of effectiveCost) {
      const paid = coverage.get(gem) || 0;
      const shortfall = required - paid;
      if (shortfall > 0) {
        goldNeeded += shortfall;
      }
    }

    if (goldUsed < goldNeeded) {
      throw new Error('Insufficient payment for card');
    }
  }
}
