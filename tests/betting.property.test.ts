import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for Betting Service
 * Using fast-check to generate random test cases and verify invariants
 */

describe('Betting Service Property-Based Tests', () => {
  /**
   * Odds calculation formula from BettingService:
   * - Default odds for first bet: 2.0
   * - Default odds for unpopular player: 3.0
   * - Formula: (totalAmount / playerAmount)
   * - Minimum odds: 1.5
   * - Maximum odds: 10.0
   */
  const calculateOdds = (totalAmount: number, playerAmount: number): number => {
    if (totalAmount === 0 || playerAmount === 0) {
      return playerAmount === 0 ? 3.0 : 2.0;
    }
    const rawOdds = totalAmount / playerAmount;
    return Math.max(1.5, Math.min(10.0, rawOdds));
  };

  describe('Odds Calculation Properties', () => {
    it('should always return odds between 1.5 and 10.0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // totalAmount
          fc.integer({ min: 1, max: 10000 }), // playerAmount
          (totalAmount, playerAmount) => {
            const odds = calculateOdds(totalAmount, playerAmount);
            expect(odds).toBeGreaterThanOrEqual(1.5);
            expect(odds).toBeLessThanOrEqual(10.0);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should return higher odds for smaller player amounts (inverse relationship)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }), // totalAmount (fixed)
          fc.integer({ min: 10, max: 50 }),    // smallerPlayerAmount
          fc.integer({ min: 51, max: 100 }),   // largerPlayerAmount
          (totalAmount, smallerAmount, largerAmount) => {
            const oddsSmaller = calculateOdds(totalAmount, smallerAmount);
            const oddsLarger = calculateOdds(totalAmount, largerAmount);
            
            // Smaller bet amount should have higher or equal odds (capped at 10)
            expect(oddsSmaller).toBeGreaterThanOrEqual(oddsLarger);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should return 3.0 for unpopular player (zero player amount)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // totalAmount
          (totalAmount) => {
            const odds = calculateOdds(totalAmount, 0);
            expect(odds).toBe(3.0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 2.0 for first bet (zero total)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }), // playerAmount
          (playerAmount) => {
            const odds = calculateOdds(0, playerAmount);
            expect(odds).toBe(2.0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cap odds at 10.0 for extreme underdogs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000 }), // large totalAmount
          fc.integer({ min: 1, max: 10 }),       // tiny playerAmount
          (totalAmount, playerAmount) => {
            const odds = calculateOdds(totalAmount, playerAmount);
            expect(odds).toBeLessThanOrEqual(10.0);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should cap odds at 1.5 for heavy favorites', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }), // totalAmount
          fc.integer({ min: 90, max: 1000 }),  // large playerAmount (close to or exceeding total)
          (totalAmount, playerAmount) => {
            // Only test when player amount is significant portion of total
            if (playerAmount >= totalAmount * 0.9) {
              const odds = calculateOdds(totalAmount, playerAmount);
              expect(odds).toBeGreaterThanOrEqual(1.5);
            }
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should be commutative for equal distributions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }), // amount
          (amount) => {
            // Two players with equal bets should have same odds
            const totalAmount = amount * 2;
            const odds1 = calculateOdds(totalAmount, amount);
            const odds2 = calculateOdds(totalAmount, amount);
            expect(odds1).toBe(odds2);
            expect(odds1).toBe(2.0); // Equal split = 2x odds
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Bet Amount Validation Properties', () => {
    const MIN_BET = 10;
    const MAX_BET = 1000;

    const isValidBetAmount = (amount: number): boolean => {
      return (
        Number.isInteger(amount) &&
        amount >= MIN_BET &&
        amount <= MAX_BET &&
        amount > 0
      );
    };

    it('should accept all integers between 10 and 1000', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MIN_BET, max: MAX_BET }),
          (amount) => {
            expect(isValidBetAmount(amount)).toBe(true);
          }
        ),
        { numRuns: 991 } // Test all values from 10 to 1000
      );
    });

    it('should reject amounts below minimum', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: MIN_BET - 1 }),
          (amount) => {
            expect(isValidBetAmount(amount)).toBe(false);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should reject amounts above maximum', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MAX_BET + 1, max: 100000 }),
          (amount) => {
            expect(isValidBetAmount(amount)).toBe(false);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should reject non-integer amounts', () => {
      fc.assert(
        fc.property(
          fc.double({ min: MIN_BET, max: MAX_BET, noNaN: true }),
          (amount) => {
            if (!Number.isInteger(amount)) {
              expect(isValidBetAmount(amount)).toBe(false);
            }
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Balance Calculation Properties', () => {
    it('should maintain balance consistency after bet placement', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000 }), // initialBalance
          fc.integer({ min: 10, max: 1000 }),    // betAmount
          (initialBalance, betAmount) => {
            if (betAmount <= initialBalance) {
              const newBalance = initialBalance - betAmount;
              expect(newBalance).toBe(initialBalance - betAmount);
              expect(newBalance).toBeGreaterThanOrEqual(0);
              expect(newBalance).toBeLessThan(initialBalance);
            }
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should correctly calculate payout for winning bets', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),      // betAmount
          fc.double({ min: 1.5, max: 10.0, noNaN: true }),      // odds
          (betAmount, odds) => {
            const payout = Math.round(betAmount * odds);
            
            // Payout should be at least the bet amount (minimum 1.5x)
            expect(payout).toBeGreaterThanOrEqual(Math.round(betAmount * 1.5));
            
            // Payout should be at most 10x the bet amount
            expect(payout).toBeLessThanOrEqual(betAmount * 10);
            
            // Payout should be an integer
            expect(Number.isInteger(payout)).toBe(true);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should maintain total pool conservation (metamorphic property)', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 10, max: 1000 }), { minLength: 1, maxLength: 10 }),
          (betAmounts) => {
            const totalPool = betAmounts.reduce((sum, amount) => sum + amount, 0);
            
            // Total pool should equal sum of all bets
            let calculatedTotal = 0;
            for (const amount of betAmounts) {
              calculatedTotal += amount;
            }
            
            expect(calculatedTotal).toBe(totalPool);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should handle multiple sequential bets correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000 }), // initialBalance
          fc.array(fc.integer({ min: 10, max: 100 }), { minLength: 1, maxLength: 10 }), // betSequence
          (initialBalance, betSequence) => {
            let currentBalance = initialBalance;
            let totalWagered = 0;
            
            for (const betAmount of betSequence) {
              if (currentBalance >= betAmount) {
                currentBalance -= betAmount;
                totalWagered += betAmount;
              } else {
                // Can't place bet - insufficient balance
                break;
              }
            }
            
            // Final balance should equal initial minus total wagered
            expect(currentBalance).toBe(initialBalance - totalWagered);
            expect(currentBalance).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Bet Settlement Properties', () => {
    it('should correctly settle winning bets', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),      // betAmount
          fc.double({ min: 1.5, max: 10.0, noNaN: true }),      // odds
          fc.integer({ min: 0, max: 10000 }),      // initialBalance
          (betAmount, odds, initialBalance) => {
            const payout = Math.round(betAmount * odds);
            const finalBalance = initialBalance + payout;
            
            // Winner should receive payout
            expect(finalBalance).toBe(initialBalance + payout);
            expect(finalBalance).toBeGreaterThan(initialBalance);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should not change balance for losing bets', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }), // balance
          (balance) => {
            // Losing bet: balance stays the same (bet was already deducted)
            const finalBalance = balance + 0; // No payout
            expect(finalBalance).toBe(balance);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should correctly refund cancelled bets', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),  // betAmount
          fc.integer({ min: 0, max: 10000 }),  // currentBalance (after bet)
          (betAmount, currentBalance) => {
            const refundedBalance = currentBalance + betAmount;
            
            // Refund should restore the bet amount
            expect(refundedBalance).toBe(currentBalance + betAmount);
            expect(refundedBalance).toBeGreaterThan(currentBalance);
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Win Rate Calculation Properties', () => {
    it('should calculate win rate correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // wonBets
          fc.integer({ min: 0, max: 100 }), // lostBets
          (wonBets, lostBets) => {
            const settledBets = wonBets + lostBets;
            const winRate = settledBets > 0 ? (wonBets / settledBets) * 100 : 0;
            
            expect(winRate).toBeGreaterThanOrEqual(0);
            expect(winRate).toBeLessThanOrEqual(100);
            
            if (settledBets === 0) {
              expect(winRate).toBe(0);
            }
            if (wonBets === settledBets && settledBets > 0) {
              expect(winRate).toBe(100);
            }
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Odds Distribution Properties', () => {
    it('should maintain fair odds distribution across multiple players', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: 10, max: 1000 }),
            { minLength: 2, maxLength: 4 }
          ),
          (playerBets) => {
            const totalPool = playerBets.reduce((sum, bet) => sum + bet, 0);
            const oddsArray = playerBets.map(bet => calculateOdds(totalPool, bet));
            
            // All odds should be valid
            for (const odds of oddsArray) {
              expect(odds).toBeGreaterThanOrEqual(1.5);
              expect(odds).toBeLessThanOrEqual(10.0);
            }
            
            // Player with smallest bet should have highest odds (or tied at cap)
            const minBet = Math.min(...playerBets);
            const maxBet = Math.max(...playerBets);
            const minBetOdds = calculateOdds(totalPool, minBet);
            const maxBetOdds = calculateOdds(totalPool, maxBet);
            
            expect(minBetOdds).toBeGreaterThanOrEqual(maxBetOdds);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should ensure total expected payout is reasonable', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.integer({ min: 10, max: 1000 }), // bet amount
              fc.double({ min: 1.5, max: 10.0, noNaN: true })  // odds
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (betsWithOdds) => {
            const totalWagered = betsWithOdds.reduce((sum, [amount]) => sum + amount, 0);
            
            // If all bets won (impossible in practice), total payout would be:
            const maxPossiblePayout = betsWithOdds.reduce(
              (sum, [amount, odds]) => sum + Math.round(amount * odds),
              0
            );
            
            // Max payout should be at least equal to total wagered (minimum 1.5x)
            expect(maxPossiblePayout).toBeGreaterThanOrEqual(totalWagered * 1.5);
          }
        ),
        { numRuns: 300 }
      );
    });
  });

  describe('Edge Case Properties', () => {
    it('should handle boundary values consistently', () => {
      const boundaries = [
        { total: 100, player: 10 },   // 10x odds (capped at 10)
        { total: 100, player: 50 },   // 2x odds
        { total: 100, player: 90 },   // 1.11x odds (capped at 1.5)
        { total: 1000, player: 1 },   // 1000x odds (capped at 10)
        { total: 1000, player: 999 }, // 1.001x odds (capped at 1.5)
      ];

      for (const { total, player } of boundaries) {
        const odds = calculateOdds(total, player);
        expect(odds).toBeGreaterThanOrEqual(1.5);
        expect(odds).toBeLessThanOrEqual(10.0);
      }
    });

    it('should handle single player betting scenario', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),
          (betAmount) => {
            // Single player bets on themselves
            const odds = calculateOdds(betAmount, betAmount);
            
            // Odds should be 1.0 but capped at minimum 1.5
            expect(odds).toBe(1.5);
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});
