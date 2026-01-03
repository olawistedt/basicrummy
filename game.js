class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = this.getValue();
    }

    getValue() {
        if (this.rank === 'A') return 1;
        if (['J', 'Q', 'K'].includes(this.rank)) return 10;
        return parseInt(this.rank);
    }

    toString() {
        return `${this.rank}${this.suit}`;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.createDeck();
        this.shuffle();
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }
}

class RummyGame extends Phaser.Scene {
    constructor() {
        super({ key: 'RummyGame' });
        this.deck = null;
        this.players = [];
        this.currentPlayer = 0;
        this.discardPile = [];
        this.gamePhase = 'setup'; // setup, playing, ended
        this.selectedCards = [];
        this.melds = [];
    }

    preload() {
        preloadAssets(this);
    }

    create() {
        this.add.text(400, 30, 'Basic Rummy', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
        // Setup game
        this.setupGame();
        this.createUI();
        this.dealCards();
        this.startGame();
    }

    setupGame() {
        this.deck = new Deck();
        this.players = [
            { hand: [], melds: [], name: 'Player 1', isHuman: true },
            { hand: [], melds: [], name: 'Player 2', isHuman: false }
        ];
        this.discardPile = [];
        this.currentPlayer = 0;
        this.gamePhase = 'playing';
        this.selectedCards = [];
    }

    createUI() {
        // Stock pile
        this.stockPile = this.add.image(300, 600, 'back').setScale(0.6)
            .setInteractive()
            .on('pointerdown', () => this.drawFromStock());

        this.add.text(300, 680, 'STOCK', { fontSize: '12px', fill: '#fff' }).setOrigin(0.5);

        // Discard pile placeholder
        this.discardPileSprite = this.add.rectangle(500, 600, 80, 120, 0x666666)
            .setStrokeStyle(2, 0x000000)
            .setInteractive()
            .on('pointerdown', () => this.drawFromDiscard());

        this.add.text(500, 680, 'DISCARD', { fontSize: '12px', fill: '#fff' }).setOrigin(0.5);

        // Buttons
        this.meldButton = this.add.rectangle(350, 750, 100, 40, 0x4CAF50)
            .setStrokeStyle(2, 0x000000)
            .setInteractive()
            .on('pointerdown', () => this.meldCards());

        this.add.text(350, 750, 'MELD', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);

        this.layOffButton = this.add.rectangle(470, 750, 100, 40, 0xFF9800)
            .setStrokeStyle(2, 0x000000)
            .setInteractive()
            .on('pointerdown', () => this.layOffCards());

        this.add.text(470, 750, 'LAY OFF', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);

        // Game info
        this.gameInfo = this.add.text(417, 80, '', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);
        this.updateGameInfo();
    }

    dealCards() {
        const cardsPerPlayer = 10; // 2 players get 10 cards each
        
        for (let i = 0; i < cardsPerPlayer; i++) {
            for (let player of this.players) {
                player.hand.push(this.deck.draw());
            }
        }

        // Start discard pile
        this.discardPile.push(this.deck.draw());
        this.updateDiscardPile();
        this.displayHands();
    }

    displayHands() {
        // Clear existing hand displays
        if (this.handSprites) {
            this.handSprites.forEach(sprite => sprite.destroy());
        }
        this.handSprites = [];

        // Display player 1 hand (bottom) - sorted by suit then value
        const player1Hand = [...this.players[0].hand].sort((a, b) => {
            const suitOrder = { '♣': 0, '♦': 1, '♠': 2, '♥': 3 }; // clubs, diamonds, spades, hearts
            const rankOrder = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
            
            if (suitOrder[a.suit] !== suitOrder[b.suit]) {
                return suitOrder[a.suit] - suitOrder[b.suit];
            }
            return rankOrder[b.rank] - rankOrder[a.rank];
        });
        
        const startX = 417 - (player1Hand.length * 45) / 2;
        
        player1Hand.forEach((card, index) => {
            const originalIndex = this.players[0].hand.indexOf(card);
            const cardSprite = this.createCardSprite(startX + index * 45, 1100, card, true);
            cardSprite.setInteractive()
                .on('pointerdown', () => this.selectCard(originalIndex, cardSprite));
            this.handSprites.push(cardSprite);
        });

        // Display player 2 hand (top) - face down
        const player2Hand = this.players[1].hand;
        const startX2 = 417 - (player2Hand.length * 45) / 2;
        
        player2Hand.forEach((card, index) => {
            const cardSprite = this.createCardSprite(startX2 + index * 45, 150, card, false);
            this.handSprites.push(cardSprite);
        });

        this.displayMelds();
    }

    createCardSprite(x, y, card, faceUp) {
        if (faceUp) {
            const cardKey = this.getCardKey(card);
            return this.add.image(x, y, cardKey).setScale(0.6);
        } else {
            return this.add.image(x, y, 'back').setScale(0.6);
        }
    }

    getCardKey(card) {
        const suitMap = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' };
        const rankMap = { 'A': '14', 'J': '11', 'Q': '12', 'K': '13' };
        
        const suit = suitMap[card.suit];
        const rank = rankMap[card.rank] || card.rank.padStart(2, '0');
        
        return suit + rank;
    }

    selectCard(index, sprite) {
        if (this.currentPlayer !== 0 || this.gamePhase !== 'playing') return;

        const cardIndex = this.selectedCards.indexOf(index);
        if (cardIndex > -1) {
            // Deselect
            this.selectedCards.splice(cardIndex, 1);
            sprite.setTint(0xffffff);
        } else {
            // Select
            this.selectedCards.push(index);
            sprite.setTint(0x00ff00);
        }
    }

    drawFromStock() {
        if (this.currentPlayer !== 0 || this.gamePhase !== 'playing') return;
        if (this.deck.cards.length === 0) return;

        const card = this.deck.draw();
        this.players[0].hand.push(card);
        this.displayHands();
        this.gamePhase = 'discard';
        this.updateGameInfo();
    }

    drawFromDiscard() {
        if (this.currentPlayer !== 0 || this.gamePhase !== 'playing') return;
        if (this.discardPile.length === 0) return;

        const card = this.discardPile.pop();
        
        // Create animation card
        const animCard = this.add.image(500, 600, this.getCardKey(card)).setScale(0.6);
        
        // Calculate target position
        const newHandLength = this.players[0].hand.length + 1;
        const targetX = 417 - (newHandLength * 45) / 2 + (newHandLength - 1) * 45;
        
        // Animate card movement
        this.tweens.add({
            targets: animCard,
            x: targetX,
            y: 1100,
            duration: 1000,
            onComplete: () => {
                animCard.destroy();
                this.players[0].hand.push(card);
                this.updateDiscardPile();
                this.displayHands();
                this.gamePhase = 'discard';
                this.updateGameInfo();
            }
        });
        
        this.updateDiscardPile();
    }

    meldCards() {
        if (this.selectedCards.length < 3) return;

        const selectedCardObjects = this.selectedCards.map(index => this.players[0].hand[index]);
        
        if (this.isValidMeld(selectedCardObjects)) {
            // Remove cards from hand
            this.selectedCards.sort((a, b) => b - a); // Sort descending to remove from end first
            const meldCards = [];
            this.selectedCards.forEach(index => {
                meldCards.push(this.players[0].hand.splice(index, 1)[0]);
            });
            
            this.players[0].melds.push(meldCards.reverse());
            this.selectedCards = [];
            this.displayHands();
            
            if (this.players[0].hand.length === 0) {
                this.endGame(0);
            }
        }
    }

    layOffCards() {
        // Simplified lay off - just add to existing melds
        if (this.selectedCards.length !== 1) return;

        const card = this.players[0].hand[this.selectedCards[0]];
        
        // Try to add to any existing meld
        for (let player of this.players) {
            for (let meld of player.melds) {
                if (this.canLayOff(card, meld)) {
                    meld.push(card);
                    this.players[0].hand.splice(this.selectedCards[0], 1);
                    this.selectedCards = [];
                    this.displayHands();
                    
                    if (this.players[0].hand.length === 0) {
                        this.endGame(0);
                    }
                    return;
                }
            }
        }
    }

    isValidMeld(cards) {
        if (cards.length < 3) return false;

        // Check for sequence
        if (this.isSequence(cards)) return true;
        
        // Check for group
        if (this.isGroup(cards)) return true;

        return false;
    }

    isSequence(cards) {
        if (cards.length < 3) return false;
        
        // All same suit
        const suit = cards[0].suit;
        if (!cards.every(card => card.suit === suit)) return false;

        // Sort by rank value
        const sortedCards = [...cards].sort((a, b) => {
            const aVal = a.rank === 'A' ? 1 : a.rank === 'J' ? 11 : a.rank === 'Q' ? 12 : a.rank === 'K' ? 13 : parseInt(a.rank);
            const bVal = b.rank === 'A' ? 1 : b.rank === 'J' ? 11 : b.rank === 'Q' ? 12 : b.rank === 'K' ? 13 : parseInt(b.rank);
            return aVal - bVal;
        });

        // Check consecutive
        for (let i = 1; i < sortedCards.length; i++) {
            const prevVal = sortedCards[i-1].rank === 'A' ? 1 : sortedCards[i-1].rank === 'J' ? 11 : sortedCards[i-1].rank === 'Q' ? 12 : sortedCards[i-1].rank === 'K' ? 13 : parseInt(sortedCards[i-1].rank);
            const currVal = sortedCards[i].rank === 'A' ? 1 : sortedCards[i].rank === 'J' ? 11 : sortedCards[i].rank === 'Q' ? 12 : sortedCards[i].rank === 'K' ? 13 : parseInt(sortedCards[i].rank);
            
            if (currVal !== prevVal + 1) return false;
        }

        return true;
    }

    isGroup(cards) {
        if (cards.length < 3 || cards.length > 4) return false;
        
        const rank = cards[0].rank;
        return cards.every(card => card.rank === rank);
    }

    canLayOff(card, meld) {
        // Try adding to sequence
        if (meld.length >= 3 && meld[0].suit === meld[1].suit) {
            const testMeld = [...meld, card];
            return this.isSequence(testMeld);
        }
        
        // Try adding to group
        if (meld.length >= 3 && meld[0].rank === meld[1].rank) {
            return card.rank === meld[0].rank && meld.length < 4;
        }

        return false;
    }

    displayMelds() {
        // Clear existing meld displays
        if (this.meldSprites) {
            this.meldSprites.forEach(sprite => sprite.destroy());
        }
        this.meldSprites = [];

        // Player 2 melds (upper half)
        this.players[1].melds.forEach((meld, meldIndex) => {
            const startX = 100 + meldIndex * 150;
            meld.forEach((card, cardIndex) => {
                const cardSprite = this.createCardSprite(startX + cardIndex * 25, 250, card, true);
                this.meldSprites.push(cardSprite);
            });
        });

        // Player 1 melds (lower half)
        this.players[0].melds.forEach((meld, meldIndex) => {
            const startX = 100 + meldIndex * 150;
            meld.forEach((card, cardIndex) => {
                const cardSprite = this.createCardSprite(startX + cardIndex * 25, 950, card, true);
                this.meldSprites.push(cardSprite);
            });
        });
    }

    updateDiscardPile() {
        if (this.discardCardSprite) {
            this.discardCardSprite.destroy();
        }

        if (this.discardPile.length > 0) {
            const topCard = this.discardPile[this.discardPile.length - 1];
            this.discardCardSprite = this.add.image(500, 600, this.getCardKey(topCard)).setScale(0.6)
                .setInteractive()
                .on('pointerdown', () => this.drawFromDiscard());
        } else {
            // Show empty discard pile
            this.discardCardSprite = this.add.rectangle(500, 600, 80, 120, 0x666666)
                .setStrokeStyle(2, 0x000000);
        }
    }

    discardCard(cardIndex) {
        if (this.currentPlayer !== 0 || this.gamePhase !== 'discard') return;

        const card = this.players[0].hand.splice(cardIndex, 1)[0];
        this.discardPile.push(card);
        this.updateDiscardPile();
        this.displayHands();
        
        if (this.players[0].hand.length === 0) {
            this.endGame(0);
            return;
        }

        this.nextTurn();
    }

    nextTurn() {
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        this.gamePhase = 'playing';
        this.selectedCards = [];
        this.updateGameInfo();

        if (this.currentPlayer === 1) {
            // AI turn
            this.time.delayedCall(1000, () => this.aiTurn());
        }
    }

    aiTurn() {
        // Simple AI: draw from stock, try to meld, discard random card
        const aiPlayer = this.players[1];
        
        // Draw card
        if (this.deck.cards.length > 0) {
            aiPlayer.hand.push(this.deck.draw());
        }

        // Try to meld
        this.tryAIMeld(aiPlayer);

        // Discard random card
        if (aiPlayer.hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * aiPlayer.hand.length);
            const card = aiPlayer.hand.splice(randomIndex, 1)[0];
            this.discardPile.push(card);
            this.updateDiscardPile();
        }

        this.displayHands();

        if (aiPlayer.hand.length === 0) {
            this.endGame(1);
            return;
        }

        this.nextTurn();
    }

    tryAIMeld(player) {
        // Try to find valid melds in hand
        const hand = player.hand;
        
        for (let i = 0; i < hand.length - 2; i++) {
            for (let j = i + 1; j < hand.length - 1; j++) {
                for (let k = j + 1; k < hand.length; k++) {
                    const testMeld = [hand[i], hand[j], hand[k]];
                    if (this.isValidMeld(testMeld)) {
                        // Remove cards and add to melds
                        const meldCards = [k, j, i].map(index => hand.splice(index, 1)[0]).reverse();
                        player.melds.push(meldCards);
                        return;
                    }
                }
            }
        }
    }

    startGame() {
        this.gamePhase = 'playing';
        this.updateGameInfo();
        
        // Add discard functionality to player cards
        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (this.gamePhase === 'discard' && this.currentPlayer === 0) {
                // Check if clicked on a hand card for discarding
                const handSprites = this.handSprites.slice(0, this.players[0].hand.length);
                const clickedIndex = handSprites.indexOf(gameObjects[0]);
                if (clickedIndex !== -1) {
                    this.discardCard(clickedIndex);
                }
            }
        });
    }

    updateGameInfo() {
        const phase = this.gamePhase === 'discard' ? 'Discard a card' : 'Draw a card';
        const player = this.players[this.currentPlayer].name;
        this.gameInfo.setText(`${player}'s turn - ${phase}`);
    }

    endGame(winnerIndex) {
        this.gamePhase = 'ended';
        const winner = this.players[winnerIndex];
        
        // Calculate scores
        let totalScore = 0;
        this.players.forEach((player, index) => {
            if (index !== winnerIndex) {
                const handValue = player.hand.reduce((sum, card) => sum + card.value, 0);
                totalScore += handValue;
            }
        });

        this.add.text(400, 520, `${winner.name} wins!`, { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);
        this.add.text(400, 560, `Score: ${totalScore} points`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
        
        // Restart button
        const restartButton = this.add.rectangle(400, 580, 150, 40, 0x4CAF50)
            .setStrokeStyle(2, 0x000000)
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.restart();
            });

        this.add.text(400, 580, 'Play Again', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);
    }
}

// Phaser game configuration
const config = {
    type: Phaser.AUTO,
    width: 834,
    height: 1194,
    parent: 'game-container',
    backgroundColor: '#2d5016',
    scene: RummyGame
};

const game = new Phaser.Game(config);