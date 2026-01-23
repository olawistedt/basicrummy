const DISCARD_PILE_X = 340;
const DISCARD_PILE_Y = 600;

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
        this.input.mouse.disableContextMenu();
        this.add.text(442, 10, 'Basic Rummy', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
        this.setupGame();
        this.createUI();
        this.dealCards();
    }

    setupGame() {
        this.deck = new Deck();
        this.players = [
            { hand: [], melds: [], name: 'Player 1', isHuman: true },
            { hand: [], melds: [], name: 'Player 2', isHuman: false }
        ];
        this.discardPile = [];
        this.discardPileSprites = [];
        this.currentPlayer = Math.floor(Math.random() * 2);
        this.gamePhase = 'playing';
        this.selectedCards = [];
    }

    createUI() {
        // Create deck stack
        this.deckStack = [];
        for (let i = 0; i < 52; i++) {
            const card = this.add.image(200 - i * 0.33, 600 - i * 0.33, 'back').setScale(1);
            this.deckStack.push(card);
        }
        
        // Top card is interactive
        this.stockPile = this.deckStack[this.deckStack.length - 1]
            .setInteractive()
            .on('pointerdown', () => this.drawFromStock());

        this.discardPileSprite = this.add.rectangle(DISCARD_PILE_X, DISCARD_PILE_Y, 80, 120, 0x666666)
            .setStrokeStyle(2, 0x000000)
            .setInteractive()
            .on('pointerdown', () => this.drawFromDiscard());

        this.meldButton = this.add.rectangle(800, 550, 100, 40, 0x4CAF50)
            .setStrokeStyle(2, 0x000000)
            .setInteractive()
            .on('pointerdown', () => this.meldCards());

        this.add.text(800, 550, 'MELD', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);

        this.layOffButton = this.add.rectangle(800, 610, 100, 40, 0xFF9800)
            .setStrokeStyle(2, 0x000000)
            .setInteractive()
            .on('pointerdown', () => this.layOffCards());

        this.add.text(800, 610, 'LAY OFF', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);

        this.gameInfo = this.add.text(442, 30, '', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);
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
            
            // Calculate target X to match the final hand layout
            const handIndex = Math.floor(dealIndex / 2);
            const startX = 500 - (10 * 75) / 2;
            let targetX = startX + handIndex * 75;

            // Remove top card from deck stack and animate it
            const topCard = this.deckStack.pop();
            if (topCard) {
                topCard.setDepth(100 + dealIndex); // Ensure latest dealt card is on top
                this.tweens.add({
                    targets: topCard,
                    x: targetX,
                    y: targetY,
                    duration: 50,
                    onComplete: () => {
                        if (playerIndex === 0) {
                            topCard.setTexture(this.getCardKey(card));
                        }
                        
                        if (!this.handSprites) this.handSprites = [];
                        this.handSprites.push(topCard);

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
                x: DISCARD_PILE_X,
                y: DISCARD_PILE_Y,
                duration: 300,
                onComplete: () => {
                    topCard.destroy();
                    this.discardPile.push(card);
                    this.updateDiscardPile();
                    // Update stockPile reference
                    if (this.deckStack.length > 0) {
                        this.stockPile = this.deckStack[this.deckStack.length - 1]
                            .setInteractive()
                            .on('pointerdown', () => this.drawFromStock());
                    }

                    this.startGame();
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
        
        // Calculate spacing to fit in width
        let spacing = 75;
        const maxHandWidth = 800; // Canvas 884 - margin
        const cardWidth = 120; // Approx visible width or base
        const totalRequiredWidth = (player1Hand.length - 1) * spacing + cardWidth;
        
        if (totalRequiredWidth > maxHandWidth && player1Hand.length > 1) {
            spacing = (maxHandWidth - cardWidth) / (player1Hand.length - 1);
        }

        const startX = 442 - (player1Hand.length * spacing) / 2;
        
        player1Hand.forEach((card, index) => {
            const cardSprite = this.createCardSprite(startX + index * spacing, 1100, card, true);
            
            const clickArea = this.add.rectangle(startX + index * spacing, 1070, 80, 60, 0x000000, 0)
                .setInteractive()
                .on('pointerdown', (pointer) => {
                    if (pointer.rightButtonDown()) {
                        this.selectCard(index, cardSprite);
                        return;
                    }

                    if (this.lastClickTime && pointer.time - this.lastClickTime < 300 && this.lastClickedCard === index) {
                        if (this.gamePhase === 'discard' && this.currentPlayer === 0) {
                            this.discardCard(index);
                            return;
                        }
                    }
                    
                    this.lastClickTime = pointer.time;
                    this.lastClickedCard = index;
                });
            
            cardSprite.setInteractive({ draggable: true })
                .on('pointerdown', (pointer) => {
                    if (pointer.rightButtonDown()) {
                        this.selectCard(index, cardSprite);
                        return;
                    }

                    if (this.lastClickTime && pointer.time - this.lastClickTime < 300 && this.lastClickedCard === index) {
                        if (this.gamePhase === 'discard' && this.currentPlayer === 0) {
                            this.discardCard(index);
                            return;
                        }
                    }
                    
                    this.lastClickTime = pointer.time;
                    this.lastClickedCard = index;
                })
                .on('drag', (pointer, dragX, dragY) => {
                    cardSprite.x = dragX;
                    cardSprite.y = dragY;
                    clickArea.x = dragX;
                    clickArea.y = dragY - 30;
                })
                .on('dragend', (pointer) => {
                    if (!this.handleCardDrop(cardSprite, index)) {
                        clickArea.x = startX + index * spacing;
                        clickArea.y = 1070;
                    }
                });
                
            this.handSprites.push(cardSprite);
            this.handSprites.push(clickArea);
        });

        const player2Hand = this.players[1].hand;
        // Calculate spacing for player 2 as well
        let spacing2 = 75;
        const totalRequiredWidth2 = (player2Hand.length - 1) * spacing2 + cardWidth;
        if (totalRequiredWidth2 > maxHandWidth && player2Hand.length > 1) {
            spacing2 = (maxHandWidth - cardWidth) / (player2Hand.length - 1);
        }
        const startX2 = 442 - (player2Hand.length * spacing2) / 2;
        
        player2Hand.forEach((card, index) => {
            const cardSprite = this.createCardSprite(startX2 + index * spacing2, 150, card, false);
            this.handSprites.push(cardSprite);
        });

        this.displayMelds();
    }

    createCardSprite(x, y, card, faceUp) {
        if (faceUp) {
            const cardKey = this.getCardKey(card);
            return this.add.image(x, y, cardKey).setScale(1);
        } else {
            return this.add.image(x, y, 'back').setScale(1);
        }
    }

    getCardKey(card) {
        return `${card.suit}${card.rank}`;
    }

    updateDiscardPile() {
        // Destroy existing top sprite if it's not part of our managed array (e.g. the initial placeholder)
        if (this.discardPileSprite && (!this.discardPileSprites || !this.discardPileSprites.includes(this.discardPileSprite))) {
            this.discardPileSprite.destroy();
        }

        // Clear existing card sprites
        if (this.discardPileSprites) {
            this.discardPileSprites.forEach(sprite => sprite.destroy());
        }
        this.discardPileSprites = [];
        this.discardPileSprite = null;

        if (this.discardPile.length === 0) {
            // Show placeholder if empty
            this.discardPileSprite = this.add.rectangle(DISCARD_PILE_X, DISCARD_PILE_Y, 80, 120, 0x666666)
                .setStrokeStyle(2, 0x000000)
                .setInteractive()
                .on('pointerdown', () => this.drawFromDiscard());
            return;
        }

        const startX = DISCARD_PILE_X;
        const startY = DISCARD_PILE_Y;
        const spacing = 30;

        this.discardPile.forEach((card, index) => {
            const x = startX + index * spacing;
            const sprite = this.add.image(x, startY, this.getCardKey(card)).setScale(1);
            sprite.setDepth(index);
            
            this.discardPileSprites.push(sprite);

            if (index === this.discardPile.length - 1) {
                this.discardPileSprite = sprite;
                sprite.setInteractive()
                    .on('pointerdown', () => this.drawFromDiscard());
            }
        });
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
                x: 442,
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
                x: 442,
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
            
            if (this.checkWinCondition(0)) return;

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
        const aiHand = this.players[1].hand;
        const discardTop = this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null;
        
        // Decide where to draw
        let drawSource = 'deck';
        if (discardTop) {
            const usefulness = this.evaluateCardUsefulness(aiHand, discardTop);
            if (usefulness >= 10) { // Threshold: helps form pair/seq or better
                drawSource = 'discard';
            }
        }
        
        if (drawSource === 'deck' && this.deck.cards.length === 0) drawSource = 'discard';
        if (drawSource === 'discard' && this.discardPile.length === 0) drawSource = 'deck';

        if (drawSource === 'discard') {
            const card = this.discardPile.pop();
            const sprite = this.discardPileSprite;
             
             this.tweens.add({
                 targets: sprite,
                 x: 442,
                 y: 150,
                 duration: 1000,
                 onComplete: () => {
                     this.players[1].hand.push(card);
                     this.updateDiscardPile();
                     this.displayHands();
                     this.time.delayedCall(500, () => this.aiPlayPhase());
                 }
             });
        } else {
            const card = this.deck.draw();
            const topCard = this.deckStack.pop();

            if (topCard) {
                this.tweens.add({
                    targets: topCard,
                    x: 442,
                    y: 150,
                    duration: 1000,
                    onComplete: () => {
                        topCard.destroy();
                        this.players[1].hand.push(card);
                        // Update stockPile reference
                        if (this.deckStack.length > 0) {
                            this.stockPile = this.deckStack[this.deckStack.length - 1]
                                .setInteractive()
                                .on('pointerdown', () => this.drawFromStock());
                        }
                        this.time.delayedCall(500, () => this.aiPlayPhase());
                    }
                });
            } else {
                this.players[1].hand.push(card);
                this.time.delayedCall(500, () => this.aiPlayPhase());
            }
        }
    }

    aiPlayPhase() {
        // Try to meld and layoff repeatedly
        let madeMove = true;
        while (madeMove) {
            madeMove = this.aiPerformMeld() || this.aiPerformLayOff();
            if (this.checkWinCondition(1)) return;
        }

        // Discard
        const discardIndex = this.getBestDiscardIndex();
        const card = this.players[1].hand.splice(discardIndex, 1)[0];
        
        // Create sprite for animation (face up to show what they discarded)
        const cardSprite = this.add.image(442, 150, this.getCardKey(card)).setDepth(1000);
        
        this.displayHands(); // Update UI immediately
        
        this.tweens.add({
            targets: cardSprite,
            x: DISCARD_PILE_X,
            y: DISCARD_PILE_Y,
            duration: 1000,
            onComplete: () => {
                cardSprite.destroy();
                this.discardPile.push(card);
                this.updateDiscardPile();
                
                if (this.checkWinCondition(1)) return;

                this.nextTurn();
            }
        });
    }

    aiPerformMeld() {
        const hand = this.players[1].hand;
        // Brute force 3-card melds
        for (let i = 0; i < hand.length - 2; i++) {
            for (let j = i + 1; j < hand.length - 1; j++) {
                for (let k = j + 1; k < hand.length; k++) {
                    const cards = [hand[i], hand[j], hand[k]];
                    if (this.isValidMeld(cards)) {
                        // Extract cards
                        const meld = [];
                        // Sort indices desc to splice correctly
                        [k, j, i].sort((a, b) => b - a).forEach(idx => {
                            meld.push(hand.splice(idx, 1)[0]);
                        });
                        
                        // Sort meld for display
                        if (this.isSequence(meld)) {
                            meld.sort((a, b) => this.getRankValue(a) - this.getRankValue(b));
                        }
                        
                        this.players[1].melds.push(meld);
                        this.displayHands();
                        return true;
                    }
                }
            }
        }
        return false;
    }

    aiPerformLayOff() {
        const hand = this.players[1].hand;
        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];
            // Check all melds on board (both players)
            for (const player of this.players) {
                for (const meld of player.melds) {
                    if (this.canLayOff(card, meld)) {
                        meld.push(card);
                        if (this.isSequence(meld)) {
                            meld.sort((a, b) => this.getRankValue(a) - this.getRankValue(b));
                        }
                        hand.splice(i, 1);
                        this.displayHands();
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getBestDiscardIndex() {
        const hand = this.players[1].hand;
        let bestDiscardIndex = 0;
        let minUsefulness = 9999;

        for (let i = 0; i < hand.length; i++) {
            let score = 0;
            const card = hand[i];
            const val = this.getRankValue(card);
            
            for (let j = 0; j < hand.length; j++) {
                if (i === j) continue;
                const other = hand[j];
                const otherVal = this.getRankValue(other);
                
                if (card.rank === other.rank) score += 5; // Pair
                if (card.suit === other.suit) {
                    const diff = Math.abs(val - otherVal);
                    if (diff === 1) score += 5; // Sequence
                    if (diff === 2) score += 2; // Gap
                }
            }
            
            // Prefer keeping center cards (5-9) for sequencing? Or just random noise.
            // Tie break with value (discard high points) if scores equal?
            // Let's subtract a tiny fraction of value so higher value cards have lower score (more likely to be discarded if usefulness is same)
            // Wait, minUsefulness is what we discard. So we want lowest score.
            // So if I subtract value, higher value = lower score = more likely to discard.
            score -= val * 0.01;

            if (score < minUsefulness) {
                minUsefulness = score;
                bestDiscardIndex = i;
            }
        }
        
        return bestDiscardIndex;
    }

    evaluateCardUsefulness(hand, card) {
        let score = 0;
        
        // Check if it completes a meld
        for (let i = 0; i < hand.length - 1; i++) {
            for (let j = i + 1; j < hand.length; j++) {
                if (this.isValidMeld([hand[i], hand[j], card])) return 100;
            }
        }
        
        // Check if it lays off
        for (const player of this.players) {
            for (const meld of player.melds) {
                if (this.canLayOff(card, meld)) return 50;
            }
        }

        const val = this.getRankValue(card);
        // Check pairs/seqs
        for (const other of hand) {
            const otherVal = this.getRankValue(other);
            if (card.rank === other.rank) score += 10;
            if (card.suit === other.suit && Math.abs(val - otherVal) === 1) score += 10;
        }
        
        return score;
    }
    
    getRankValue(card) {
        if (card.rank === '14') return 14; 
        return parseInt(card.rank); 
    }

    checkWinCondition(playerIndex) {
        if (this.players[playerIndex].hand.length === 0) {
            this.handleWin(playerIndex);
            return true;
        }
        return false;
    }

    handleWin(playerIndex) {
        this.gamePhase = 'gameOver';
        let winnerName = this.players[playerIndex].name;
        if (playerIndex === 1) {
            winnerName = 'Computer player';
        }
        
        // create a dark overlay
        this.add.rectangle(442, 600, 884, 1200, 0x000000, 0.7).setDepth(99);

        this.add.text(442, 600, `${winnerName} Wins!`, {
            fontSize: '64px',
            fill: '#4CAF50',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(100);
        
        this.gameInfo.setText(`Game Over - ${winnerName} Wins!`);
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
        if (this.gamePhase === 'gameOver') return;
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
            
            const finalMeld = meldCards.reverse(); // Default order
            
            if (this.isSequence(finalMeld)) {
                // Check if it's an Ace-Low sequence (has Ace and Two)
                const hasAce = finalMeld.some(c => c.rank === '14');
                const hasTwo = finalMeld.some(c => c.rank === '02');
                
                if (hasAce && hasTwo) {
                    finalMeld.sort((a, b) => {
                        const vA = parseInt(a.rank) === 14 ? 1 : parseInt(a.rank);
                        const vB = parseInt(b.rank) === 14 ? 1 : parseInt(b.rank);
                        return vA - vB;
                    });
                } else {
                    finalMeld.sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
                }
            }
            
            this.players[0].melds.push(finalMeld);
            this.selectedCards = [];
            this.displayHands();
            
            this.checkWinCondition(0);
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

        // 1. Check Ace High Sequence (e.g. Q, K, A)
        const sortedHigh = [...cards].sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
        let isHighSeq = true;
        for (let i = 0; i < sortedHigh.length - 1; i++) {
            if (parseInt(sortedHigh[i+1].rank) !== parseInt(sortedHigh[i].rank) + 1) {
                isHighSeq = false;
                break;
            }
        }
        if (isHighSeq) return true;

        // 2. Check Ace Low Sequence (e.g. A, 2, 3)
        const sortedLow = [...cards].sort((a, b) => {
            const vA = parseInt(a.rank) === 14 ? 1 : parseInt(a.rank);
            const vB = parseInt(b.rank) === 14 ? 1 : parseInt(b.rank);
            return vA - vB;
        });
        
        let isLowSeq = true;
        for (let i = 0; i < sortedLow.length - 1; i++) {
            const v1 = parseInt(sortedLow[i].rank) === 14 ? 1 : parseInt(sortedLow[i].rank);
            const v2 = parseInt(sortedLow[i+1].rank) === 14 ? 1 : parseInt(sortedLow[i+1].rank);
            if (v2 !== v1 + 1) {
                isLowSeq = false;
                break;
            }
        }
        return isLowSeq;
    }

    isGroup(cards) {
        if (cards.length < 3 || cards.length > 4) return false;
        
        const rank = cards[0].rank;
        return cards.every(card => card.rank === rank);
    }

    layOffCards() {
        if (this.gamePhase === 'gameOver') return;
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

            this.checkWinCondition(0);
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
        // Check if dropped on discard pile
        const distToDiscard = Phaser.Math.Distance.Between(cardSprite.x, cardSprite.y, DISCARD_PILE_X, DISCARD_PILE_Y);
        if (distToDiscard < 100 && this.gamePhase === 'discard' && this.currentPlayer === 0) {
            this.discardCard(cardIndex);
            return true;
        }

        const handLength = this.players[0].hand.length;
        
        // Calculate spacing to fit in width
        let spacing = 75;
        const maxHandWidth = 800; // Canvas 884 - margin
        const cardWidth = 120; // Approx visible width or base
        const totalRequiredWidth = (handLength - 1) * spacing + cardWidth;
        
        if (totalRequiredWidth > maxHandWidth && handLength > 1) {
            spacing = (maxHandWidth - cardWidth) / (handLength - 1);
        }

        const startX = 442 - (handLength * spacing) / 2;
        const dropX = cardSprite.x;
        
        let newIndex = Math.round((dropX - startX) / spacing);
        newIndex = Math.max(0, Math.min(handLength - 1, newIndex));
        
        if (newIndex !== cardIndex) {
            const card = this.players[0].hand.splice(cardIndex, 1)[0];
            this.players[0].hand.splice(newIndex, 0, card);
            this.displayHands();
            return true; // Hand was re-rendered
        } else {
            cardSprite.x = startX + cardIndex * spacing;
            cardSprite.y = 1100;
        }
        return false;
    }

    displayMelds() {
        if (this.meldSprites) {
            this.meldSprites.forEach(sprite => sprite.destroy());
        }
        this.meldSprites = [];

        // Player 1 melds (bottom)
        this.players[0].melds.forEach((meld, meldIndex) => {
            const meldWidth = meld.length * 40;
            const startX = 100 + meldIndex * (meldWidth + 150);
            meld.forEach((card, cardIndex) => {
                const cardSprite = this.createCardSprite(startX + cardIndex * 40, 850, card, true);
                this.meldSprites.push(cardSprite);
            });
        });

        // Player 2 melds (top)
        this.players[1].melds.forEach((meld, meldIndex) => {
            const meldWidth = meld.length * 40;
            const startX = 100 + meldIndex * (meldWidth + 150);
            meld.forEach((card, cardIndex) => {
                const cardSprite = this.createCardSprite(startX + cardIndex * 40, 360, card, true);
                this.meldSprites.push(cardSprite);
            });
        });
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 884,
    height: 1200,
    parent: 'game-container',
    backgroundColor: '#2d5016',
    scene: RummyGame
};

// Start the game
const game = new Phaser.Game(config);