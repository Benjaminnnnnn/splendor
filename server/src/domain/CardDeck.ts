import { Card } from './Card';

/**
 * Manages the card decks for each tier.
 * Encapsulates deck management and drawing logic.
 */
export class CardDeck {
  private deck: Card[];
  private visible: Card[];

  constructor(
    public readonly tier: 1 | 2 | 3,
    cards: Card[],
    visibleCount: number = 4
  ) {
    this.deck = [...cards];
    this.visible = [];
    
    // Draw initial visible cards
    for (let i = 0; i < visibleCount && this.deck.length > 0; i++) {
      const card = this.deck.shift();
      if (card) {
        this.visible.push(card);
      }
    }
  }

  public getVisibleCards(): readonly Card[] {
    return [...this.visible];
  }

  public getRemainingCount(): number {
    return this.deck.length;
  }

  public drawCard(): Card | null {
    return this.deck.shift() || null;
  }

  public removeVisibleCard(cardId: string): Card | null {
    const index = this.visible.findIndex(c => c.id === cardId);
    if (index === -1) {
      return null;
    }

    const card = this.visible.splice(index, 1)[0];
    
    // Replace with a new card from the deck if available
    const newCard = this.deck.shift();
    if (newCard) {
      this.visible.push(newCard);
    }

    return card;
  }

  public findCard(cardId: string): Card | null {
    return this.visible.find(c => c.id === cardId) || null;
  }

  public shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }
}
