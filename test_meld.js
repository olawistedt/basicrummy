
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }
}

const game = {
    isValidMeld(cards) {
        if (cards.length < 3) return false;
        return this.isSequence(cards) || this.isGroup(cards);
    },

    isSequence(cards) {
        if (cards.length < 3) return false;
        
        const suit = cards[0].suit;
        if (!cards.every(card => card.suit === suit)) return false;

        const sortedCards = [...cards].sort((a, b) => {
            let aVal = parseInt(a.rank);
            let bVal = parseInt(b.rank);
            // Convert Ace (14) to 1 for low sequences
            if (aVal === 14) aVal = 1;
            if (bVal === 14) bVal = 1;
            return aVal - bVal;
        });

        // Check if it's a valid low sequence (A,2,3...)
        let isValidLow = true;
        for (let i = 1; i < sortedCards.length; i++) {
            let prevVal = parseInt(sortedCards[i-1].rank);
            let currVal = parseInt(sortedCards[i].rank);
            if (prevVal === 14) prevVal = 1;
            if (currVal === 14) currVal = 1;
            
            if (currVal !== prevVal + 1) {
                isValidLow = false;
                break;
            }
        }
        
        if (isValidLow) return true;
        
        // Check if it's a valid high sequence (...Q,K,A)
        const sortedHigh = [...cards].sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
        for (let i = 1; i < sortedHigh.length; i++) {
            const prevVal = parseInt(sortedHigh[i-1].rank);
            const currVal = parseInt(sortedHigh[i].rank);
            
            if (currVal !== prevVal + 1) return false;
        }

        return true;
    },

    isGroup(cards) {
        if (cards.length < 3 || cards.length > 4) return false;
        
        const rank = cards[0].rank;
        return cards.every(card => card.rank === rank);
    }
};

const c5s = new Card('s', '05');
const c6s = new Card('s', '06');
const c7s = new Card('s', '07');

const meld = [c5s, c6s, c7s];
console.log('Meld 5s, 6s, 7s:', game.isValidMeld(meld));

const cQs = new Card('s', '12');
const cKs = new Card('s', '13');
const cAs = new Card('s', '14');
const meldHigh = [cQs, cKs, cAs];
console.log('Meld Qs, Ks, As:', game.isValidMeld(meldHigh));

const cAs_low = new Card('s', '14');
const c2s = new Card('s', '02');
const c3s = new Card('s', '03');
const meldLow = [cAs_low, c2s, c3s];
console.log('Meld As, 2s, 3s:', game.isValidMeld(meldLow));
