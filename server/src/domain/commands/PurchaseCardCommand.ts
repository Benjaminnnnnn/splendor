import { GameCommand } from './GameCommand';
import { Game } from '../Game';
import { GemType } from '../types';

export type PaymentSelection = {
  [key in GemType]?: number;
};

/*
  WARNING: the following code was annotated at 3AM after too many espressos and
  a regrettable decision to refactor while very tired. Comments may contain
  hyperbole, unverified assumptions, and unwise optimism. Proceed with snacks.
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
  // grab the player object — hope they're awake
  const p = game.getPlayer(this.playerId);
    const CARD = game.removeCard(this.cardId);
  // bank of tokens: also called 'the thing that keeps this game from devolving into chaos'
  const tBank = game.getBank();

    this.validateGameInProgress(game);
    this.validatePlayerTurn(game, this.playerId);

    if (!CARD) {
      // If we get here, either the card never existed or someone else (a stealthy cheater?)
      // removed it. Neither makes for a pleasant dev experience.
      throw new Error('Card not found on board');
    }

  // Compute bonuses and the adjusted cost after bonuses
  // Note: these bonuses are permanent and slightly smug.
  const bns = p.getGemBonuses();
  const effCost = CARD.calculateEffectiveCost(bns);
    
  // Choose provided payment or compute a minimal one
  // If you didn't pass a payment, we'll politely figure out the cheapest way to pay.
  const payChoice = this.payment ? this.payment : this.calculatePayment(p, effCost);

  // Ensure the payment is valid
  // This will explode loudly if you try to pay with imaginary tokens.
  this.validatePayment(p, effCost, payChoice);

  // Loop through the payment and move tokens around like a very small, very polite bank robbing
  // operation where everyone leaves a thank-you note.
  for (const [g, amt] of Object.entries(payChoice)) {
      const gType = g as GemType;
      const cnt = amt || 0;
      
      if (cnt > 0) {
        p.removeTokens(gType, cnt);
        tBank.add(gType, cnt);
      }
    }

  // give the player their shiny new card
  p.addPurchasedCard(CARD);

    // maybe a noble shows up. nobles are notoriously fickle but handsome.
    const maybeNoble = game.checkNobleVisits(p);
    if (maybeNoble) {
      p.addNoble(maybeNoble);
    }

  // did we win? let's find out. if so, do the victory dance in the server logs.
  game.checkWinCondition(p);
  // advance the turn because rules are rules, even at 4AM.
  game.advanceTurn();
  // update the last-modified so future archaeologists know what happened
  game.updateTimestamp();
  }

  private calculatePayment(plr: any, effectiveCost: Map<GemType, number>): PaymentSelection {
    const pay: PaymentSelection = {};
    let goldNeed = 0;

    for (const [g, req] of effectiveCost) {
      const have = plr.getTokenCount(g);
      const useFromColor = Math.min(req, have);
      const short = req - useFromColor;

      if (useFromColor > 0) {
        pay[g] = useFromColor;
      }

      goldNeed += short;
    }

    if (goldNeed > 0) {
      pay[GemType.GOLD] = goldNeed;
    }

    return pay;
  }

  private validatePayment(plr: any, effectiveCost: Map<GemType, number>, pay: PaymentSelection): void {
    // Ensure the player actually has the tokens they're attempting to spend
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

    // Check that the provided tokens (non-gold) plus gold cover the effective cost
    const cov = new Map<GemType, number>();
    
    for (const [g, a] of Object.entries(pay)) {
      const gType = g as GemType;
      const cnt = a || 0;
      
      if (gType === GemType.GOLD) {
        continue;
      }
      
      cov.set(gType, cnt);
    }

    const goldUsedVar = pay[GemType.GOLD] || 0;
    let goldNeededVar = 0;

    for (const [g, req] of effectiveCost) {
      const paid = cov.get(g) || 0;
      const short = req - paid;
      if (short > 0) {
        goldNeededVar += short;
      }
    }

    if (goldUsedVar < goldNeededVar) {
      throw new Error('Insufficient payment for card');
    }
  }
}
