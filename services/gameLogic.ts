
import { Card, Color, Value } from '../types';

const COLORS = [Color.RED, Color.YELLOW, Color.GREEN, Color.BLUE];
const SPECIAL_VALUES = [Value.SKIP, Value.REVERSE, Value.DRAW_TWO];

export const createDeck = (): Card[] => {
    const deck: Card[] = [];
    let id = 0;

    for (const color of COLORS) {
        deck.push({ id: id++, color, value: Value.ZERO });
        for (let i = 1; i <= 9; i++) {
            const value = Value[Object.keys(Value)[i] as keyof typeof Value];
            deck.push({ id: id++, color, value });
            deck.push({ id: id++, color, value });
        }
        for (const value of SPECIAL_VALUES) {
            deck.push({ id: id++, color, value });
            deck.push({ id: id++, color, value });
        }
    }

    for (let i = 0; i < 4; i++) {
        deck.push({ id: id++, color: Color.WILD, value: Value.WILD });
        deck.push({ id: id++, color: Color.WILD, value: Value.WILD_DRAW_FOUR });
    }

    return deck;
};

export const shuffleDeck = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


export const canPlayCard = (card: Card, topCard: Card, currentColor: Color): boolean => {
    if (card.color === Color.WILD) return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
};

export const aiChooseCard = (hand: Card[], topCard: Card, currentColor: Color): Card | null => {
    for (const card of hand) {
        if (card.color !== Color.WILD && canPlayCard(card, topCard, currentColor)) {
            return card;
        }
    }
    for (const card of hand) {
        if (card.color === Color.WILD) {
            return card;
        }
    }
    return null;
};

export const aiChooseColor = (hand: Card[]): Color => {
    const colorCounts: { [key in Color]?: number } = {};
    hand.forEach(card => {
        if(card.color !== Color.WILD) {
            colorCounts[card.color] = (colorCounts[card.color] || 0) + 1;
        }
    });

    let maxCount = 0;
    let bestColor: Color | null = null;
    for (const color of COLORS) {
        if ((colorCounts[color] || 0) > maxCount) {
            maxCount = colorCounts[color]!;
            bestColor = color;
        }
    }
    return bestColor || COLORS[Math.floor(Math.random() * COLORS.length)];
};
