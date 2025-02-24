// Configuration du canvas et des constantes
const BLOCK_SIZE = 20;
const BOARD_WIDTH = 12;
const BOARD_HEIGHT = 20;

// Pièces de Tetris
const PIECES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 1, 1], [1, 0, 0]], // L
    [[1, 1, 1], [0, 0, 1]], // J
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]], // Z
];

// Couleurs des pièces
const COLORS = [
    '#FF0D72', // rouge
    '#0DC2FF', // bleu clair
    '#0DFF72', // vert
    '#F538FF', // rose
    '#FF8E0D', // orange
    '#FFE138', // jaune
    '#3877FF'  // bleu
];

// Intervalles de jeu séparés
let playerInterval;
let aiInterval;

// Initialisation des canvas et contextes
const playerCanvas = document.getElementById('playerCanvas');
const aiCanvas = document.getElementById('aiCanvas');
const playerContext = playerCanvas.getContext('2d');
const aiContext = aiCanvas.getContext('2d');

const playerNextCanvas = document.getElementById('playerNextPiece');
const aiNextCanvas = document.getElementById('aiNextPiece');
const playerNextContext = playerNextCanvas.getContext('2d');
const aiNextContext = aiNextCanvas.getContext('2d');

const playerScoreElement = document.getElementById('playerScore');
const aiScoreElement = document.getElementById('aiScore');

// Classe principale du jeu
class TetrisGame {
    constructor(context, nextContext, scoreElement, isAI = false) {
        this.context = context;
        this.nextContext = nextContext;
        this.scoreElement = scoreElement;
        this.isAI = isAI;
        
        this.board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
        this.score = 0;
        this.currentPiece = null;
        this.nextPiece = null;
        this.currentPieceX = 0;
        this.currentPieceY = 0;
        this.currentPieceIndex = 0;
        this.nextPieceIndex = 0;
        this.gameOver = false;
        this.isSlowdown = false;
        
        // Nouvelles propriétés pour les fonctionnalités
        this.opponent = null;
        this.dropSpeed = 300;
        this.originalSpeed = 300;
        this.lastSpeedChange = Date.now();
    }

    generatePiece() {
        if (this.nextPiece === null) {
            this.nextPieceIndex = Math.floor(Math.random() * PIECES.length);
            this.nextPiece = PIECES[this.nextPieceIndex];
        }
        
        this.currentPiece = this.nextPiece;
        this.currentPieceIndex = this.nextPieceIndex;
        
        this.nextPieceIndex = Math.floor(Math.random() * PIECES.length);
        this.nextPiece = PIECES[this.nextPieceIndex];
        
        this.currentPieceX = Math.floor(BOARD_WIDTH / 2) - Math.floor(this.currentPiece[0].length / 2);
        this.currentPieceY = 0;
        
        this.drawNextPiece();
    }

    drawNextPiece() {
        this.nextContext.fillStyle = '#16213e';
        this.nextContext.fillRect(0, 0, this.nextContext.canvas.width, this.nextContext.canvas.height);
        
        const blockSize = 20;
        const offsetX = (this.nextContext.canvas.width - this.nextPiece[0].length * blockSize) / 2;
        const offsetY = (this.nextContext.canvas.height - this.nextPiece.length * blockSize) / 2;
        
        this.nextContext.fillStyle = COLORS[this.nextPieceIndex];
        for (let y = 0; y < this.nextPiece.length; y++) {
            for (let x = 0; x < this.nextPiece[y].length; x++) {
                if (this.nextPiece[y][x]) {
                    this.nextContext.fillRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                }
            }
        }
    }

    draw() {
        this.context.fillStyle = '#16213e';
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        
        // Dessiner les blocs fixes
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (this.board[y][x]) {
                    this.context.fillStyle = COLORS[this.board[y][x] - 1];
                    this.context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }
        
        // Dessiner la pièce courante
        if (this.currentPiece) {
            this.context.fillStyle = COLORS[this.currentPieceIndex];
            for (let y = 0; y < this.currentPiece.length; y++) {
                for (let x = 0; x < this.currentPiece[y].length; x++) {
                    if (this.currentPiece[y][x]) {
                        this.context.fillRect(
                            (this.currentPieceX + x) * BLOCK_SIZE,
                            (this.currentPieceY + y) * BLOCK_SIZE,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );
                    }
                }
            }
        }
    }

    checkCollision(pieceX, pieceY, piece = this.currentPiece) {
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    const newX = pieceX + x;
                    const newY = pieceY + y;
                    
                    if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
                        return true;
                    }
                    
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    mergePiece() {
        for (let y = 0; y < this.currentPiece.length; y++) {
            for (let x = 0; x < this.currentPiece[y].length; x++) {
                if (this.currentPiece[y][x]) {
                    this.board[this.currentPieceY + y][this.currentPieceX + x] = this.currentPieceIndex + 1;
                }
            }
        }
    }

    checkLines() {
        let linesCleared = 0;
        
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(BOARD_WIDTH).fill(0));
                linesCleared++;
                y++;
            }
        }
        
        if (linesCleared > 0) {
            this.updateScore(linesCleared);
        }
    }

    // Nouvelles fonctionnalités
    handleDoubleLineClear() {
        if (this.opponent) {
            // Effet visuel pour le cadeau surprise
            this.opponent.context.fillStyle = '#FFD700';
            this.opponent.context.fillRect(0, 0, this.opponent.context.canvas.width, 10);
            
            const easyPieces = [PIECES[0], PIECES[1]]; // I et O
            const randomPiece = Math.floor(Math.random() * 2);
            this.opponent.nextPiece = [...easyPieces[randomPiece]];
            this.opponent.nextPieceIndex = randomPiece;
            this.opponent.drawNextPiece();
            
            // Message visuel
            const message = document.createElement('div');
            message.textContent = "Cadeau surprise !";
            message.style.cssText = `
                position: fixed;
                top: 20px;
                left: ${this.isAI ? '75%' : '25%'};
                transform: translateX(-50%);
                background: #FFD700;
                padding: 10px;
                border-radius: 5px;
                color: black;
                font-weight: bold;
                z-index: 1000;
            `;
            document.body.appendChild(message);
            setTimeout(() => message.remove(), 2000);
        }
    }

    handleSlowdown() {
        // Message visuel avec animation
        const message = document.createElement('div');
        message.textContent = "🐢 RALENTISSEMENT 🐢";
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: ${this.isAI ? '75%' : '25%'};  // Position selon joueur/IA
            transform: translate(-50%, -50%);
            background: #4a4e69;
            padding: 20px;
            border-radius: 15px;
            color: white;
            font-weight: bold;
            font-size: 24px;
            z-index: 1000;
            animation: pulse 1s infinite;
        `;
    
        // Style pour l'animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.1); }
                100% { transform: translate(-50%, -50%) scale(1); }
            }
        `;
    
        document.head.appendChild(style);
        document.body.appendChild(message);
    
        setTimeout(() => {
            message.remove();
            style.remove();
        }, 2000);
    
        // Ralentissement pendant 10 secondes
        this.isSlowdown = true;
        this.dropSpeed = Math.floor(this.dropSpeed * 1.2);
        
        clearInterval(playerInterval);
        clearInterval(aiInterval);
        
        playerInterval = setInterval(() => updateGame(playerGame), playerGame.dropSpeed);
        aiInterval = setInterval(() => {
            updateGame(aiGame);
            aiGame.makeAIMove();
        }, aiGame.dropSpeed);
    
        setTimeout(() => {
            this.isSlowdown = false;
            this.dropSpeed = 300;  // Retour à la vitesse normale de 300
            
            clearInterval(playerInterval);
            clearInterval(aiInterval);
            
            playerInterval = setInterval(() => updateGame(playerGame), 300);
            aiInterval = setInterval(() => {
                updateGame(aiGame);
                aiGame.makeAIMove();
            }, 300);
        }, 10000);
    }
    

    // Amélioration de handleTetrisExchange
    handleTetrisExchange() {
        if (!this.opponent) return;
        
        let exchanged = false;
        for (let y = BOARD_HEIGHT - 1; y >= 0 && !exchanged; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                for (let y2 = BOARD_HEIGHT - 1; y2 >= 0 && !exchanged; y2--) {
                    if (this.opponent.board[y2].every(cell => cell === 0)) {
                        // Effet visuel amélioré
                        const flashEffect = (canvas, color) => {
                            const ctx = canvas.getContext('2d');
                            const originalFillStyle = ctx.fillStyle;
                            ctx.fillStyle = color;
                            ctx.fillRect(0, y * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
                            setTimeout(() => {
                                ctx.fillStyle = originalFillStyle;
                                this.draw();
                                this.opponent.draw();
                            }, 300);
                        };

                        // Flash sur les deux plateaux
                        flashEffect(this.context.canvas, '#FFD700');
                        flashEffect(this.opponent.context.canvas, '#FF4444');

                        // Message d'échange
                        const message = document.createElement('div');
                        message.innerHTML = `
                            <div style="text-align: center;">
                                🔄 ÉCHANGE DE LIGNES! 🔄<br>
                                <small>Ligne échangée avec l'adversaire</small>
                            </div>
                        `;
                        message.style.cssText = `
                            position: fixed;
                            top: 40%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background: linear-gradient(45deg, #FF4444, #FFD700);
                            padding: 20px;
                            border-radius: 15px;
                            color: white;
                            font-weight: bold;
                            font-size: 20px;
                            z-index: 1000;
                            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
                        `;
                        
                        document.body.appendChild(message);
                        setTimeout(() => message.remove(), 2000);

                        // Échange effectif des lignes
                        const temp = [...this.board[y]];
                        this.board[y] = [...this.opponent.board[y2]];
                        this.opponent.board[y2] = temp;
                        
                        exchanged = true;
                    }
                }
            }
        }
    }

    updateScore(linesCleared) {
        let points = 0;
        
        switch(linesCleared) {
            case 1: 
                points = 50;
                break;
            case 2:
                points = 100;            // Modifié de 150 à 100
                console.log("Double ligne détectée !");
                this.handleDoubleLineClear();
                break;
            case 3:
                points = 200;            // Modifié de 350 à 200
                break;
            case 4:
                points = 300;            // Modifié de 500 à 300
                this.handleTetrisExchange();
                break;
        }
        
        const oldScore = this.score;
        this.score += points;
        
        // Modification : ralentissement tous les 1000 points pour les deux joueurs
        if (Math.floor(oldScore/1000) !== Math.floor(this.score/1000)) {
            playerGame.handleSlowdown();
            aiGame.handleSlowdown();
        }
    
    this.scoreElement.textContent = this.score;
        
        this.scoreElement.textContent = this.score;
    }

    rotatePiece(piece) {
        // Cas spécial pour la pièce I
        if (piece.length === 1 || piece[0].length === 1) {
            return piece[0].length === 1 
                ? [[1, 1, 1, 1]]
                : [[1], [1], [1], [1]];
        }
    
        // Pour les autres pièces - code existant...
        const rows = piece.length;
        const cols = piece[0].length;
        let rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                rotated[col][rows - 1 - row] = piece[row][col];
            }
        }
        
        return rotated;
    }

    canRotate(piece, offsetX = 0) {
        return !this.checkCollision(this.currentPieceX + offsetX, this.currentPieceY, piece);
    }

    makeAIMove() {
        if (!this.isAI || !this.currentPiece) return;
        
        let bestScore = -Infinity;
        let bestX = this.currentPieceX;
        let bestRotation = this.currentPiece;
        
        // Test de toutes les rotations possibles
        let testPiece = [...this.currentPiece];
        for (let rotation = 0; rotation < 4; rotation++) {
            // Test de toutes les positions horizontales
            for (let testX = -2; testX < BOARD_WIDTH + 2; testX++) {
                let testY = this.currentPieceY;
                
                // Descendre la pièce jusqu'au bas
                while (!this.checkCollision(testX, testY + 1, testPiece)) {
                    testY++;
                }
                
                // Évaluer cette position
                if (!this.checkCollision(testX, testY, testPiece)) {
                    let score = this.evaluatePosition(testX, testY, testPiece);
                    if (score > bestScore) {
                        bestScore = score;
                        bestX = testX;
                        bestRotation = [...testPiece];
                    }
                }
            }
            testPiece = this.rotatePiece(testPiece);
        }
        
        // Appliquer le meilleur mouvement trouvé
        if (this.currentPieceX < bestX) {
            this.currentPieceX++;
        } else if (this.currentPieceX > bestX) {
            this.currentPieceX--;
        }
        
        if (JSON.stringify(this.currentPiece) !== JSON.stringify(bestRotation)) {
            const rotated = this.rotatePiece(this.currentPiece);
            if (!this.checkCollision(this.currentPieceX, this.currentPieceY, rotated)) {
                this.currentPiece = rotated;
            }
        }
    }
    
    evaluatePosition(testX, testY, piece) {
        let score = 0;
        
        // Simuler le placement de la pièce
        let tempBoard = this.board.map(row => [...row]);
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    if (testY + y >= BOARD_HEIGHT || testX + x >= BOARD_WIDTH) return -99999;
                    tempBoard[testY + y][testX + x] = 1;
                }
            }
        }
    
        // 1. Priorité absolue : lignes complètes
        let completeLines = 0;
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (tempBoard[y].every(cell => cell !== 0)) {
                completeLines++;
                score += 10000; // Bonus ÉNORME pour chaque ligne complète
            }
        }
    
        // 2. Vérifier les trous créés
        let holes = 0;
        for (let x = 0; x < BOARD_WIDTH; x++) {
            let foundBlock = false;
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                if (tempBoard[y][x] !== 0) foundBlock = true;
                else if (foundBlock) holes++;
            }
        }
        score -= holes * 3000; // Pénalité très forte pour les trous
    
        // 3. Mesurer la hauteur et la compacité
        let heights = new Array(BOARD_WIDTH).fill(0);
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                if (tempBoard[y][x] !== 0) {
                    heights[x] = BOARD_HEIGHT - y;
                    break;
                }
            }
        }
    
        // 4. Évaluer la position
        let maxHeight = Math.max(...heights);
        let heightDiff = maxHeight - Math.min(...heights);
    
        score -= maxHeight * 50;        // Légère pénalité pour la hauteur
        score -= heightDiff * 100;      // Pénalité pour les différences de hauteur
    
        // 5. Bonus pour positions favorables
        if (completeLines === 0) {
            // Si pas de ligne complète, favoriser les positions qui préparent des lignes
            let almostComplete = 0;
            for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
                let blockCount = tempBoard[y].filter(x => x !== 0).length;
                if (blockCount >= BOARD_WIDTH - 2) {
                    almostComplete++;
                    score += 500; // Bonus pour lignes presque complètes
                }
            }
        }
    
        return score;
    }
}


// Création des instances de jeu
const playerGame = new TetrisGame(playerContext, playerNextContext, playerScoreElement);
const aiGame = new TetrisGame(aiContext, aiNextContext, aiScoreElement, true);

// Gestion des contrôles du joueur
document.addEventListener('keydown', event => {
    if (!playerGame.currentPiece || playerGame.gameOver) return;
    
    switch (event.key) {
        case 'ArrowLeft':
            if (!playerGame.checkCollision(playerGame.currentPieceX - 1, playerGame.currentPieceY)) {
                playerGame.currentPieceX--;
                playerGame.draw();
            }
            break;
        case 'ArrowRight':
            if (!playerGame.checkCollision(playerGame.currentPieceX + 1, playerGame.currentPieceY)) {
                playerGame.currentPieceX++;
                playerGame.draw();
            }
            break;
        case 'ArrowDown':
            if (!playerGame.isSlowdown && !playerGame.checkCollision(playerGame.currentPieceX, playerGame.currentPieceY + 1)) {
                playerGame.currentPieceY++;
                playerGame.draw();
            }
            break;
        case 'ArrowUp':
            const rotated = playerGame.rotatePiece(playerGame.currentPiece);
            const offsets = [0, -1, 1, -2, 2];
            
            for (const offset of offsets) {
                if (playerGame.canRotate(rotated, offset)) {
                    playerGame.currentPiece = rotated;
                    playerGame.currentPieceX += offset;
                    playerGame.draw();
                    break;
                }
            }
            break;
    }
});

function showGameOver(winner, playerScore, aiScore) {
    const playerModal = createGameOverModal('player', winner === 'Player', playerScore, aiScore);
    playerModal.style.left = '25%';
    document.body.appendChild(playerModal);
    
    const aiModal = createGameOverModal('AI', winner === 'AI', aiScore, playerScore);
    aiModal.style.left = '75%';
    document.body.appendChild(aiModal);
}

function createGameOverModal(player, isWinner, ownScore, opponentScore) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        padding: 20px;
        border-radius: 15px;
        text-align: center;
        color: white;
        font-family: 'Poppins', sans-serif;
        z-index: 1000;
    `;
    
    const unicorn = "🦄";
    const crown = "👑";
    const thumbsDown = "👎";
    const cross = "❌";
    
    const icons = isWinner ? `${unicorn} ${crown}` : `${thumbsDown} ${cross}`;
    const result = isWinner ? "WINNER!" : "GAME OVER";
    
    modal.innerHTML = `
        <h1 style="color: ${isWinner ? '#FFD700' : '#FF0000'};">${icons}</h1>
        <h2 style="color: ${isWinner ? '#0DC2FF' : '#FF0D72'};">${result}</h2>
        <div style="margin: 20px 0;">
            <p style="color: #0DFF72;">Your Score: ${ownScore}</p>
            <p style="color: #F538FF;">Opponent Score: ${opponentScore}</p>
        </div>
        <button onclick="location.reload()" style="
            padding: 10px 20px;
            background: #4a4e69;
            border: none;
            border-radius: 5px;
            color: white;
            cursor: pointer;
            font-size: 16px;
        ">Play Again</button>
    `;
    
    return modal;
}

function updateGame(game) {
    if (!game.currentPiece) {
        game.generatePiece();
    }
    
    if (!game.checkCollision(game.currentPieceX, game.currentPieceY + 1)) {
        game.currentPieceY++;
    } else {
        game.mergePiece();
        game.checkLines();
        game.generatePiece();
        
        if (game.checkCollision(game.currentPieceX, game.currentPieceY)) {
            game.gameOver = true;
            endGame();
        }
    }
    game.draw();
}

function endGame() {
    clearInterval(playerInterval);
    clearInterval(aiInterval);
    
    const winner = aiGame.gameOver ? "Player" : "AI";
    showGameOver(winner, playerGame.score, aiGame.score);
}

function startGame() {
    // Liaison des instances pour l'interaction
    playerGame.opponent = aiGame;
    aiGame.opponent = playerGame;
    
    playerInterval = setInterval(() => updateGame(playerGame), 300);
    aiInterval = setInterval(() => {
        updateGame(aiGame);
        aiGame.makeAIMove();
    }, 300);
}

// Initialisation et démarrage
playerGame.generatePiece();
aiGame.generatePiece();
startGame();