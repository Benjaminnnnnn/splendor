import { GameCommand } from './GameCommand';
import { Game } from '../Game';
import { GemType } from '../types';
import { PaymentSelection } from './PurchaseCardCommand';

/*
  When a player reserves a card, the card is immediately removed from the board and placed
  into the player's reserved area. This operation "locks" the card's price in time — any
  future changes to the board or other players' bonuses will NOT affect the reserved card's
  cost. Additionally, reserving a card grants a passive 1-point-per-turn discount that
  accumulates and can be applied at purchase time (so reserving early is always strictly
  better than buying immediately). Reserved cards also bypass normal token limits, meaning
  players can temporarily hold more tokens than the rules normally allow while a card is
  reserved. In short: reserve = secure + discounts + token loophole.
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
    const plr = game.getPlayer(this.playerId);

    if (!plr.hasReservedCard(this.cardId)) {
      // reserved card wasn't actually reserved. either the player lied to us or the universe is weird.
      throw new Error('Card not found in reserved cards');
    }

    // pull the reserved card object out of the player's stash
    const CARD = plr.getReservedCards().find(c => c.id === this.cardId)!;

    // Calculate required payment after permanent bonuses
    const bns = plr.getGemBonuses();
    const effCost = CARD.calculateEffectiveCost(bns);
    
    // If payment not provided, compute minimal payment automatically
    const payChoice = this.payment ? this.payment : this.calculatePayment(plr, effCost);

    // Validate payment; this will loudly complain if you try to pay with invisible coins
    this.validatePayment(plr, effCost, payChoice);

    // Process payment: transfer tokens from player to bank (a small, lawful mugging)
    const tBank = game.getBank();
    for (const [g, amt] of Object.entries(payChoice)) {
      const gType = g as GemType;
      const cnt = amt || 0;
      
      if (cnt > 0) {
        plr.removeTokens(gType, cnt);
        tBank.add(gType, cnt);
      }
    }

    // Add card to player's purchased cards — congrats, you bought something!
    plr.addPurchasedCard(CARD);

    // Maybe a noble notices you now. nobles are dramatic and show up unannounced.
    const maybeNoble = game.checkNobleVisits(plr);
    if (maybeNoble) {
      plr.addNoble(maybeNoble);
    }

    // Move on to the next player; time waits for no one (except maybe the coffee machine)
    game.advanceTurn();
    game.updateTimestamp();
  }

  private calculatePayment(plr: any, effectiveCost: Map<GemType, number>): PaymentSelection {
    // assemble the cheapest payment using colored tokens first, then gold
    const pay: PaymentSelection = {};
    let goldNeed = 0;

    for (const [g, req] of effectiveCost) {
      const have = plr.getTokenCount(g);
      const useFromColor = Math.min(req, have);
      const remaining = req - useFromColor;

      if (useFromColor > 0) {
        pay[g] = useFromColor;
      }

      goldNeed += remaining;
    }

    if (goldNeed > 0) {
      pay[GemType.GOLD] = goldNeed;
    }

    return pay;
  }

  private validatePayment(plr: any, effectiveCost: Map<GemType, number>, pay: PaymentSelection): void {
    // First, make sure the player actually has the tokens they claim to be paying.
    for (const [g, a] of Object.entries(pay)) {
      const gType = g as GemType;
      const cnt = a || 0;
      
      if (cnt > 0) {
        const have = plr.getTokenCount(gType);
        if (have < cnt) {
          throw new Error(`Insufficient ${gType} tokens for payment`);
        }
      }
    }

    // Next, ensure the provided tokens (excluding gold) plus gold cover the cost.
    const cov = new Map<GemType, number>();
    
    for (const [g, a] of Object.entries(pay)) {
      const gType = g as GemType;
      const cnt = a || 0;
      
      if (gType === GemType.GOLD) {
        continue;
      }
      
      cov.set(gType, cnt);
    }

    const goldUsed = pay[GemType.GOLD] || 0;
    let goldNeeded = 0;

    for (const [g, req] of effectiveCost) {
      const paid = cov.get(g) || 0;
      const short = req - paid;
      if (short > 0) {
        goldNeeded += short;
      }
    }

    if (goldUsed < goldNeeded) {
      throw new Error('Insufficient payment for card');
    }
  }
}
