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

        // Sort player 1 hand initially
        this.players[0].hand.sort((a, b) => {
            const suitOrder = { '♣': 0, '♦': 1, '♠': 2, '♥': 3 };
            const rankOrder = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
            
            if (suitOrder[a.suit] !== suitOrder[b.suit]) {
                return suitOrder[a.suit] - suitOrder[b.suit];
            }
            return rankOrder[b.rank] - rankOrder[a.rank];
        });

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

        // Display player 1 hand (bottom) - use actual hand order for drag/drop
        const player1Hand = this.players[0].hand;
        const startX = 417 - (player1Hand.length * 45) / 2;
        
        player1Hand.forEach((card, index) => {
            const cardSprite = this.createCardSprite(startX + index * 45, 1100, card, true);
            
            // Add a smaller click area for selection (top half of card)
            const clickArea = this.add.rectangle(startX + index * 45, 1070, 48, 36, 0x000000, 0)
                .setInteractive()
                .on('pointerdown', (pointer) => {
                    console.log('Click area pressed on card', index);
                    
                    // Manual double-click detection
                    if (this.lastClickTime && pointer.time - this.lastClickTime < 300 && this.lastClickedCard === index) {
                        console.log('Manual double click detected on card', index, 'Game phase:', this.gamePhase);
                        if (this.gamePhase === 'discard' && this.currentPlayer === 0) {
                            console.log('Attempting to discard card', index);
                            this.discardCard(index);
                            return;
                        }
                    }
                    
                    this.lastClickTime = pointer.time;
                    this.lastClickedCard = index;
                    
                    // Select card
                    console.log('Selecting card', index);
                    this.selectCard(index, cardSprite);
                });
            
            // Make the card draggable (full card area)
            cardSprite.setInteractive({ draggable: true })
                .on('pointerdown', (pointer) => {
                    // Manual double-click detection on full card
                    if (this.lastClickTime && pointer.time - this.lastClickTime < 300 && this.lastClickedCard === index) {
                        console.log('Manual double click detected on full card', index, 'Game phase:', this.gamePhase);
                        if (this.gamePhase === 'discard' && this.currentPlayer === 0) {
                            console.log('Attempting to discard card', index);
                            this.discardCard(index);
                            return;
                        }
                    }
                    
                    this.lastClickTime = pointer.time;
                    this.lastClickedCard = index;
                })
                .on('dragstart', () => {
                    // Keep original depth - dragged card stays under cards to the right
                    // No depth change needed
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
        
        const suit = suitMap[card.suit];
        let rank;
        
        if (card.rank === 'A') {
            rank = '14';
        } else if (card.rank === 'J') {
            rank = '11';
        } else if (card.rank === 'Q') {
            rank = '12';
        } else if (card.rank === 'K') {
            rank = '13';
        } else {
            rank = card.rank.padStart(2, '0');
        }
        
        return suit + rank;
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
        }
        
        this.displayHands();
    }

    discardCard(cardIndex) {
        if (this.currentPlayer !== 0 || this.gamePhase !== 'discard') return;

        const card = this.players[0].hand[cardIndex];
        const handLength = this.players[0].hand.length;
        const startX = 417 - (handLength * 45) / 2;
        const cardX = startX + cardIndex * 45;
        
        // Create animation card
        const animCard = this.add.image(cardX, 1100, this.getCardKey(card)).setScale(0.6);
        
        // Animate card movement to discard pile
        this.tweens.add({
            targets: animCard,
            x: 500,
            y: 600,
            duration: 1000,
            onComplete: () => {
                animCard.destroy();
                this.players[0].hand.splice(cardIndex, 1);
                this.discardPile.push(card);
                this.updateDiscardPile();
                this.displayHands();
                
                if (this.players[0].hand.length === 0) {
                    this.endGame(0);
                    return;
                }

                this.nextTurn();
            }
        });
    }

    selectCard(index, sprite) {
        console.log('selectCard called with index:', index, 'currentPlayer:', this.currentPlayer, 'gamePhase:', this.gamePhase);
        if (this.currentPlayer !== 0) {
            console.log('Not player 0, returning');
            return;
        }

        const cardIndex = this.selectedCards.indexOf(index);
        if (cardIndex > -1) {
            // Deselect
            console.log('Deselecting card', index);
            this.selectedCards.splice(cardIndex, 1);
            sprite.setTint(0xffffff);
        } else {
            // Select
            console.log('Selecting card', index);
            this.selectedCards.push(index);
            sprite.setTint(0x00ff00);
        }
        console.log('Selected cards:', this.selectedCards);
    }

    drawFromStock() {
        if (this.currentPlayer !== 0 || this.gamePhase !== 'playing') return;
        if (this.deck.cards.length === 0) return;
        if (this.hasDrawnThisTurn) return; // Prevent drawing twice

        const card = this.deck.draw();
        this.hasDrawnThisTurn = true;
        
        // Create animation card
        const animCard = this.add.image(300, 600, 'back').setScale(0.6);
        
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
                this.displayHands();
                this.gamePhase = 'discard';
                this.updateGameInfo();
            }
        });
    }

    drawFromDiscard() {
        if (this.currentPlayer !== 0 || this.gamePhase !== 'playing') return;
        if (this.discardPile.length === 0) return;
        if (this.hasDrawnThisTurn) return; // Prevent drawing twice

        const card = this.discardPile.pop();
        this.hasDrawnThisTurn = true;
        
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
        if (this.currentPlayer !== 0 || this.gamePhase !== 'discard') return;

        const selectedCardObjects = this.selectedCards.map(index => this.players[0].hand[index]);
        
        if (this.isValidMeld(selectedCardObjects)) {
            // Create animation cards
            const animCards = [];
            const handLength = this.players[0].hand.length;
            const startX = 417 - (handLength * 45) / 2;
            
            this.selectedCards.forEach((index, i) => {
                const card = this.players[0].hand[index];
                const cardX = startX + index * 45;
                const animCard = this.add.image(cardX, 1100, this.getCardKey(card)).setScale(0.6);
                animCards.push(animCard);
            });
            
            // Calculate target position for meld
            const meldIndex = this.players[0].melds.length;
            const targetX = 100 + meldIndex * 150;
            
            // Animate cards to meld position
            animCards.forEach((animCard, i) => {
                this.tweens.add({
                    targets: animCard,
                    x: targetX + i * 25,
                    y: 950,
                    duration: 1000,
                    onComplete: () => {
                        animCard.destroy();
                        if (i === animCards.length - 1) {
                            // Remove cards from hand and add to melds
                            this.selectedCards.sort((a, b) => b - a);
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
                });
            });
        }
    }

    layOffCards() {
        if (this.selectedCards.length !== 1) return;
        if (this.currentPlayer !== 0 || this.gamePhase !== 'discard') return;

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
            // Create animation card
            const handLength = this.players[0].hand.length;
            const startX = 417 - (handLength * 45) / 2;
            const cardX = startX + cardIndex * 45;
            const animCard = this.add.image(cardX, 1100, this.getCardKey(card)).setScale(0.6);
            
            // Calculate target position
            const meldIndex = targetPlayer.melds.indexOf(targetMeld);
            const targetX = 100 + meldIndex * 150 + targetMeld.length * 25;
            const targetY = targetPlayer === this.players[0] ? 950 : 280;
            
            // Animate card to meld
            this.tweens.add({
                targets: animCard,
                x: targetX,
                y: targetY,
                duration: 1000,
                onComplete: () => {
                    animCard.destroy();
                    targetMeld.push(card);
                    this.players[0].hand.splice(cardIndex, 1);
                    this.selectedCards = [];
                    this.displayHands();
                    
                    if (this.players[0].hand.length === 0) {
                        this.endGame(0);
                    }
                }
            });
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

        // Player 2 melds (upper half) - positioned closer to hand
        this.players[1].melds.forEach((meld, meldIndex) => {
            const startX = 100 + meldIndex * 150;
            meld.forEach((card, cardIndex) => {
                const cardSprite = this.createCardSprite(startX + cardIndex * 25, 280, card, true);
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

        const card = this.players[0].hand[cardIndex];
        const handLength = this.players[0].hand.length;
        const startX = 417 - (handLength * 45) / 2;
        const cardX = startX + cardIndex * 45;
        
        // Create animation card
        const animCard = this.add.image(cardX, 1100, this.getCardKey(card)).setScale(0.6);
        
        // Animate card movement to discard pile
        this.tweens.add({
            targets: animCard,
            x: 500,
            y: 600,
            duration: 1000,
            onComplete: () => {
                animCard.destroy();
                this.players[0].hand.splice(cardIndex, 1);
                this.discardPile.push(card);
                this.updateDiscardPile();
                this.displayHands();
                
                if (this.players[0].hand.length === 0) {
                    this.endGame(0);
                    return;
                }

                this.nextTurn();
            }
        });
    }

    nextTurn() {
        console.log('Next turn called. Switching from player', this.currentPlayer);
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        this.gamePhase = 'playing';
        this.selectedCards = [];
        this.hasDrawnThisTurn = false; // Reset draw flag for new turn
        this.updateGameInfo();
        console.log('Now it is player', this.currentPlayer, 'turn');

        if (this.currentPlayer === 1) {
            // AI turn
            console.log('Starting AI turn in 1 second');
            this.time.delayedCall(1000, () => this.aiTurn());
        }
    }

    aiTurn() {
        const aiPlayer = this.players[1];
        
        // Draw card with animation
        if (this.deck.cards.length > 0) {
            const card = this.deck.draw();
            
            // Create animation card
            const animCard = this.add.image(300, 600, 'back').setScale(0.6);
            
            // Calculate target position
            const newHandLength = aiPlayer.hand.length + 1;
            const targetX = 417 - (newHandLength * 45) / 2 + (newHandLength - 1) * 45;
            
            // Animate card movement
            this.tweens.add({
                targets: animCard,
                x: targetX,
                y: 150,
                duration: 1000,
                onComplete: () => {
                    animCard.destroy();
                    aiPlayer.hand.push(card);
                    this.displayHands();
                    
                    // Try to meld after drawing
                    const meldFound = this.tryAIMeld(aiPlayer);
                    
                    // Discard after meld completes (or immediately if no meld)
                    const discardDelay = meldFound ? 1500 : 500;
                    this.time.delayedCall(discardDelay, () => {
                        if (aiPlayer.hand.length > 0) {
                            const randomIndex = Math.floor(Math.random() * aiPlayer.hand.length);
                            const discardCard = aiPlayer.hand[randomIndex];
                            
                            // Find and animate the existing hand sprite
                            const handLength = aiPlayer.hand.length;
                            const startX = 417 - (handLength * 45) / 2;
                            const cardX = startX + randomIndex * 45;
                            
                            // Find the existing sprite at this position
                            const existingSprite = this.handSprites.find(sprite => 
                                sprite.x === cardX && sprite.y === 150
                            );
                            
                            if (existingSprite) {
                                this.tweens.add({
                                    targets: existingSprite,
                                    x: 500,
                                    y: 600,
                                    duration: 1000,
                                    onComplete: () => {
                                        aiPlayer.hand.splice(randomIndex, 1);
                                        this.discardPile.push(discardCard);
                                        this.updateDiscardPile();
                                        this.displayHands();
                                        
                                        if (aiPlayer.hand.length === 0) {
                                            this.endGame(1);
                                            return;
                                        }

                                        this.nextTurn();
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    }

    tryAIMeld(player) {
        // Try to find valid melds in hand
        const hand = player.hand;
        let meldFound = false;
        
        for (let i = 0; i < hand.length - 2 && !meldFound; i++) {
            for (let j = i + 1; j < hand.length - 1 && !meldFound; j++) {
                for (let k = j + 1; k < hand.length && !meldFound; k++) {
                    const testMeld = [hand[i], hand[j], hand[k]];
                    if (this.isValidMeld(testMeld)) {
                        // Create meld animation
                        const meldIndex = player.melds.length;
                        const targetX = 100 + meldIndex * 150;
                        const animCards = [];
                        
                        // Find and animate existing hand sprites
                        const existingSprites = [];
                        [i, j, k].forEach((index, cardIndex) => {
                            const handLength = hand.length;
                            const startX = 417 - (handLength * 45) / 2;
                            const cardX = startX + index * 45;
                            
                            const existingSprite = this.handSprites.find(sprite => 
                                sprite.x === cardX && sprite.y === 150
                            );
                            
                            if (existingSprite) {
                                // Change to face up if it's face down
                                const card = hand[index];
                                existingSprite.setTexture(this.getCardKey(card));
                                existingSprites.push({ sprite: existingSprite, index, cardIndex });
                            }
                        });
                        
                        // Animate existing sprites to meld position
                        let completedAnimations = 0;
                        existingSprites.forEach(({ sprite, index, cardIndex }) => {
                            this.tweens.add({
                                targets: sprite,
                                x: targetX + cardIndex * 25,
                                y: 280,
                                duration: 1000,
                                onComplete: () => {
                                    completedAnimations++;
                                    if (completedAnimations === existingSprites.length) {
                                        // Remove cards and add to melds
                                        const meldCards = [k, j, i].map(idx => hand.splice(idx, 1)[0]).reverse();
                                        player.melds.push(meldCards);
                                        this.displayHands();
                                    }
                                }
                            });
                        });
                        
                        meldFound = true;
                        return true;
                    }
                }
            }
        }
        return false;
    }

    startGame() {
        this.gamePhase = 'playing';
        this.updateGameInfo();
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