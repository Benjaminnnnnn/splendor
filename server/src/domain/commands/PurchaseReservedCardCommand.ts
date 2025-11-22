import { GameCommand } from './GameCommand';
import { Game } from '../Game';
import { GemType } from '../types';
import { PaymentSelection } from './PurchaseCardCommand';

/**
 * Command for purchasing a card from the player's reserved cards.
 */
export class PurchaseReservedCardCommand extends GameCommand {
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

    if (!player.hasReservedCard(this.cardId)) {
      throw new Error('Card not found in reserved cards');
    }

    const card = player.getReservedCards().find(c => c.id === this.cardId)!;

    // Calculate required payment after applying permanent bonuses
    const bonuses = player.getGemBonuses();
    const effectiveCost = card.calculateEffectiveCost(bonuses);
    
    // If payment not provided, compute minimal payment automatically
    const paymentSelection = this.payment ? this.payment : this.calculatePayment(player, effectiveCost);

    // Validate payment
    this.validatePayment(player, effectiveCost, paymentSelection);

    // Process payment: transfer tokens from player to bank
    const bank = game.getBank();
    for (const [gem, amount] of Object.entries(paymentSelection)) {
      const gemType = gem as GemType;
      const count = amount || 0;
      
      if (count > 0) {
        player.removeTokens(gemType, count);
        bank.add(gemType, count);
      }
    }

    // Remove card from reserved cards and add to purchased cards
    player.removeReservedCard(this.cardId);
    player.addPurchasedCard(card);

    // Check if a noble visits
    const noble = game.checkNobleVisits(player);
    if (noble) {
      player.addNoble(noble);
    }

    game.advanceTurn();
    game.updateTimestamp();
  }

  private calculatePayment(player: any, effectiveCost: Map<GemType, number>): PaymentSelection {
    const payment: PaymentSelection = {};
    let goldNeeded = 0;

    for (const [gem, required] of effectiveCost) {
      const available = player.getTokenCount(gem);
      const useFromColor = Math.min(required, available);
      const remaining = required - useFromColor;

      if (useFromColor > 0) {
        payment[gem] = useFromColor;
      }

      goldNeeded += remaining;
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
