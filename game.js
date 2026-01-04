class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = this.getValue();
    }

    getValue() {
        if (this.rank === '14') return 1;
        if (['11', '12', '13'].includes(this.rank)) return 10;
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
        const suits = ['s', 'h', 'd', 'c'];
        const ranks = ['14', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'];
        
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
        this.gamePhase = 'setup';
        this.selectedCards = [];
        this.melds = [];
    }

    preload() {
        preloadAssets(this);
    }

    create() {
        this.add.text(400, 30, 'Basic Rummy', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
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
        this.currentPlayer = Math.floor(Math.random() * 2);
        this.gamePhase = 'playing';
        this.selectedCards = [];
    }

    createUI() {
        // Create deck stack
        this.deckStack = [];
        for (let i = 0; i < 52; i++) {
            const card = this.add.image(300 - i * 1, 600 - i * 1, 'back').setScale(0.6);
            this.deckStack.push(card);
        }
        
        // Top card is interactive
        this.stockPile = this.deckStack[this.deckStack.length - 1]
            .setInteractive()
            .on('pointerdown', () => this.drawFromStock());

        this.add.text(300, 680, 'STOCK', { fontSize: '12px', fill: '#fff' }).setOrigin(0.5);

        this.discardPileSprite = this.add.rectangle(500, 600, 80, 120, 0x666666)
            .setStrokeStyle(2, 0x000000)
            .setInteractive()
            .on('pointerdown', () => this.drawFromDiscard());

        this.add.text(500, 680, 'DISCARD', { fontSize: '12px', fill: '#fff' }).setOrigin(0.5);

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

        this.gameInfo = this.add.text(417, 80, '', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);
        this.updateGameInfo();
    }

    dealCards() {
        const cardsPerPlayer = 10;
        let dealIndex = 0;
        const totalCards = cardsPerPlayer * 2;
        
        // Deal cards one by one with animation
        const dealNextCard = () => {
            if (dealIndex >= totalCards) {
                // All cards dealt, sort player hand and start discard pile
                this.players[0].hand.sort((a, b) => {
                    const suitOrder = { 'c': 0, 'd': 1, 's': 2, 'h': 3 };
                    const rankOrder = { '14': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6, '07': 7, '08': 8, '09': 9, '10': 10, '11': 11, '12': 12, '13': 13 };
                    
                    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
                        return suitOrder[a.suit] - suitOrder[b.suit];
                    }
                    return rankOrder[b.rank] - rankOrder[a.rank];
                });

                // Deal discard card
                this.dealDiscardCard();
                return;
            }
            
            const playerIndex = dealIndex % 2;
            const card = this.deck.draw();
            const targetY = playerIndex === 0 ? 1100 : 150;
            
            // Remove top card from deck stack and animate it
            const topCard = this.deckStack.pop();
            if (topCard) {
                this.tweens.add({
                    targets: topCard,
                    x: 417,
                    y: targetY,
                    duration: 300,
                    onComplete: () => {
                        topCard.destroy();
                        this.players[playerIndex].hand.push(card);
                        dealIndex++;
                        
                        // Update interactive stockPile reference
                        if (this.deckStack.length > 0) {
                            this.stockPile = this.deckStack[this.deckStack.length - 1]
                                .setInteractive()
                                .on('pointerdown', () => this.drawFromStock());
                        }
                        
                        this.time.delayedCall(100, dealNextCard);
                    }
                });
            }
        };
        
        dealNextCard();
    }
    
    dealDiscardCard() {
        const card = this.deck.draw();
        const topCard = this.deckStack.pop();
        
        if (topCard) {
            this.tweens.add({
                targets: topCard,
                x: 500,
                y: 600,
                duration: 300,
                onComplete: () => {
                    topCard.destroy();
                    this.discardPile.push(card);
                    this.updateDiscardPile();
                    this.displayHands();
                    
                    // Update stockPile reference
                    if (this.deckStack.length > 0) {
                        this.stockPile = this.deckStack[this.deckStack.length - 1]
                            .setInteractive()
                            .on('pointerdown', () => this.drawFromStock());
                    }
                }
            });
        }
    }

    displayHands() {
        if (this.handSprites) {
            this.handSprites.forEach(sprite => sprite.destroy());
        }
        this.handSprites = [];

        const player1Hand = this.players[0].hand;
        const startX = 417 - (player1Hand.length * 45) / 2;
        
        player1Hand.forEach((card, index) => {
            const cardSprite = this.createCardSprite(startX + index * 45, 1100, card, true);
            
            const clickArea = this.add.rectangle(startX + index * 45, 1070, 48, 36, 0x000000, 0)
                .setInteractive()
                .on('pointerdown', (pointer) => {
                    if (this.lastClickTime && pointer.time - this.lastClickTime < 300 && this.lastClickedCard === index) {
                        if (this.gamePhase === 'discard' && this.currentPlayer === 0) {
                            this.discardCard(index);
                            return;
                        }
                    }
                    
                    this.lastClickTime = pointer.time;
                    this.lastClickedCard = index;
                    this.selectCard(index, cardSprite);
                });
            
            cardSprite.setInteractive({ draggable: true })
                .on('pointerdown', (pointer) => {
                    if (this.lastClickTime && pointer.time - this.lastClickTime < 300 && this.lastClickedCard === index) {
                        if (this.gamePhase === 'discard' && this.currentPlayer === 0) {
                            this.discardCard(index);
                            return;
                        }
                    }
                    
                    this.lastClickTime = pointer.time;
                    this.lastClickedCard = index;
                    
                    if (pointer.y > 1070) {
                        this.selectCard(index, cardSprite);
                    }
                })
                .on('drag', (pointer, dragX, dragY) => {
                    cardSprite.x = dragX;
                    cardSprite.y = dragY;
                    clickArea.x = dragX;
                    clickArea.y = dragY - 30;
                })
                .on('dragend', (pointer) => {
                    this.handleCardDrop(cardSprite, index);
                    clickArea.x = startX + index * 45;
                    clickArea.y = 1070;
                });
                
            this.handSprites.push(cardSprite);
            this.handSprites.push(clickArea);
        });

        const player2Hand = this.players[1].hand;
        const startX2 = 417 - (player2Hand.length * 45) / 2;
        
        player2Hand.forEach((card, index) => {
            const cardSprite = this.createCardSprite(startX2 + index * 45, 150, card, true);
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
        return `${card.suit}${card.rank}`;
    }

    updateDiscardPile() {
        if (this.discardPile.length > 0) {
            const topCard = this.discardPile[this.discardPile.length - 1];
            if (this.discardPileSprite.texture) {
                this.discardPileSprite.destroy();
            }
            this.discardPileSprite = this.add.image(500, 600, this.getCardKey(topCard)).setScale(0.6)
                .setInteractive()
                .on('pointerdown', () => this.drawFromDiscard());
        }
    }

    selectCard(index, cardSprite) {
        if (this.selectedCards.includes(index)) {
            this.selectedCards = this.selectedCards.filter(i => i !== index);
            cardSprite.y = 1100;
        } else {
            this.selectedCards.push(index);
            cardSprite.y = 1080;
        }
    }

    drawFromStock() {
        if (this.gamePhase === 'draw' && this.currentPlayer === 0 && this.deck.cards.length > 0 && this.deckStack.length > 0) {
            const card = this.deck.draw();
            const topCard = this.deckStack.pop();
            
            this.tweens.add({
                targets: topCard,
                x: 417,
                y: 1100,
                duration: 300,
                onComplete: () => {
                    topCard.destroy();
                    this.players[0].hand.push(card);
                    this.gamePhase = 'discard';
                    this.displayHands();
                    this.updateGameInfo();
                    
                    // Update stockPile reference
                    if (this.deckStack.length > 0) {
                        this.stockPile = this.deckStack[this.deckStack.length - 1]
                            .setInteractive()
                            .on('pointerdown', () => this.drawFromStock());
                    }
                }
            });
        }
    }

    drawFromDiscard() {
        if (this.gamePhase === 'draw' && this.currentPlayer === 0 && this.discardPile.length > 0) {
            const card = this.discardPile.pop();
            
            // Animate the discard pile sprite to player hand
            this.tweens.add({
                targets: this.discardPileSprite,
                x: 417,
                y: 1100,
                duration: 300,
                onComplete: () => {
                    this.players[0].hand.push(card);
                    this.gamePhase = 'discard';
                    this.updateDiscardPile();
                    this.displayHands();
                    this.updateGameInfo();
                }
            });
        }
    }

    discardCard(index) {
        if (this.gamePhase === 'discard' && this.currentPlayer === 0) {
            const card = this.players[0].hand.splice(index, 1)[0];
            this.discardPile.push(card);
            this.updateDiscardPile();
            this.selectedCards = [];
            this.nextTurn();
        }
    }

    nextTurn() {
        this.currentPlayer = (this.currentPlayer + 1) % 2;
        this.gamePhase = 'draw';
        this.displayHands();
        this.updateGameInfo();
        
        if (this.currentPlayer === 1) {
            this.time.delayedCall(1000, () => this.aiTurn());
        }
    }

    aiTurn() {
        const card = this.deck.cards.length > 0 ? this.deck.draw() : this.discardPile.pop();
        this.players[1].hand.push(card);
        
        // Try to meld after drawing
        this.tryAIMeld();
        
        const discardIndex = Math.floor(Math.random() * this.players[1].hand.length);
        const discardedCard = this.players[1].hand.splice(discardIndex, 1)[0];
        this.discardPile.push(discardedCard);
        
        this.updateDiscardPile();
        this.nextTurn();
    }
    
    tryAIMeld() {
        const hand = this.players[1].hand;
        
        // Try to find valid melds in hand
        for (let i = 0; i < hand.length - 2; i++) {
            for (let j = i + 1; j < hand.length - 1; j++) {
                for (let k = j + 1; k < hand.length; k++) {
                    const testMeld = [hand[i], hand[j], hand[k]];
                    if (this.isValidMeld(testMeld)) {
                        // Create meld
                        const meldCards = [k, j, i].map(idx => hand.splice(idx, 1)[0]).reverse();
                        
                        // Sort meld if it's a sequence
                        if (this.isSequence(meldCards)) {
                            meldCards.sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
                        }
                        
                        this.players[1].melds.push(meldCards);
                        this.displayHands();
                        return true;
                    }
                }
            }
        }
        return false;
    }

    startGame() {
        this.gamePhase = 'draw';
        this.updateGameInfo();
        
        // If AI starts, begin AI turn
        if (this.currentPlayer === 1) {
            this.time.delayedCall(1000, () => this.aiTurn());
        }
    }

    updateGameInfo() {
        const phase = this.gamePhase === 'draw' ? 'Draw a card' : 'Discard a card';
        const player = this.currentPlayer === 0 ? 'Your turn' : 'AI turn';
        this.gameInfo.setText(`${player}: ${phase}`);
    }

    meldCards() {
        if (this.selectedCards.length < 3) return;
        if (this.currentPlayer !== 0) return;

        const selectedCardObjects = this.selectedCards.map(index => this.players[0].hand[index]);
        
        if (this.isValidMeld(selectedCardObjects)) {
            // Remove cards from hand and add to melds
            this.selectedCards.sort((a, b) => b - a);
            const meldCards = [];
            this.selectedCards.forEach(index => {
                meldCards.push(this.players[0].hand.splice(index, 1)[0]);
            });
            
            // Sort meld if it's a sequence
            const finalMeld = meldCards.reverse();
            if (this.isSequence(finalMeld)) {
                finalMeld.sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
            }
            
            this.players[0].melds.push(finalMeld);
            this.selectedCards = [];
            this.displayHands();
        }
    }

    isValidMeld(cards) {
        if (cards.length < 3) return false;
        return this.isSequence(cards) || this.isGroup(cards);
    }

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
    }

    isGroup(cards) {
        if (cards.length < 3 || cards.length > 4) return false;
        
        const rank = cards[0].rank;
        return cards.every(card => card.rank === rank);
    }

    layOffCards() {
        if (this.selectedCards.length !== 1) return;
        if (this.currentPlayer !== 0) return;

        const cardIndex = this.selectedCards[0];
        const card = this.players[0].hand[cardIndex];
        
        // Find valid meld to lay off to
        let targetMeld = null;
        let targetPlayer = null;
        
        for (let player of this.players) {
            for (let meld of player.melds) {
                if (this.canLayOff(card, meld)) {
                    targetMeld = meld;
                    targetPlayer = player;
                    break;
                }
            }
            if (targetMeld) break;
        }
        
        if (targetMeld) {
            targetMeld.push(card);
            
            // Sort meld if it's a sequence
            if (this.isSequence(targetMeld)) {
                targetMeld.sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
            }
            
            this.players[0].hand.splice(cardIndex, 1);
            this.selectedCards = [];
            this.displayHands();
        }
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

    handleCardDrop(cardSprite, cardIndex) {
        const handLength = this.players[0].hand.length;
        const startX = 417 - (handLength * 45) / 2;
        const dropX = cardSprite.x;
        
        let newIndex = Math.round((dropX - startX) / 45);
        newIndex = Math.max(0, Math.min(handLength - 1, newIndex));
        
        if (newIndex !== cardIndex) {
            const card = this.players[0].hand.splice(cardIndex, 1)[0];
            this.players[0].hand.splice(newIndex, 0, card);
            this.displayHands();
        } else {
            cardSprite.x = startX + cardIndex * 45;
            cardSprite.y = 1100;
        }
    }

    displayMelds() {
        if (this.meldSprites) {
            this.meldSprites.forEach(sprite => sprite.destroy());
        }
        this.meldSprites = [];

        // Player 1 melds (bottom)
        this.players[0].melds.forEach((meld, meldIndex) => {
            const meldWidth = meld.length * 25;
            const startX = 100 + meldIndex * (meldWidth + 100);
            meld.forEach((card, cardIndex) => {
                const cardSprite = this.createCardSprite(startX + cardIndex * 25, 950, card, true);
                this.meldSprites.push(cardSprite);
            });
        });

        // Player 2 melds (top)
        this.players[1].melds.forEach((meld, meldIndex) => {
            const meldWidth = meld.length * 25;
            const startX = 100 + meldIndex * (meldWidth + 100);
            meld.forEach((card, cardIndex) => {
                const cardSprite = this.createCardSprite(startX + cardIndex * 25, 280, card, true);
                this.meldSprites.push(cardSprite);
            });
        });
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 834,
    height: 1200,
    parent: 'game-container',
    backgroundColor: '#2d5016',
    scene: RummyGame
};

// Start the game
const game = new Phaser.Game(config);