const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]]  // Z
];

const canvas = document.getElementById('game-canvas');
const nextCanvas = document.getElementById('next-canvas');
const ctx = canvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
nextCanvas.width = 4 * BLOCK_SIZE;
nextCanvas.height = 4 * BLOCK_SIZE;

ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);

let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let dropCounter = 0;
let lastTime = 0;
let piece = null;
let nextPiece = null;

class Piece {
    constructor(shape = null) {
        this.shape = shape || SHAPES[Math.floor(Math.random() * SHAPES.length)];
        this.pos = {
            x: Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2),
            y: 0
        };
        this.color = COLORS[this.shape[0].find(value => value > 0) - 1];
    }

    rotate() {
        const rotated = this.shape[0].map((_, i) =>
            this.shape.map(row => row[i]).reverse()
        );
        
        if (!this.collision(0, 0, rotated)) {
            this.shape = rotated;
        }
    }

    collision(offsetX, offsetY, newShape = this.shape) {
        for (let y = 0; y < newShape.length; y++) {
            for (let x = 0; x < newShape[y].length; x++) {
                if (newShape[y][x] !== 0) {
                    const newX = x + this.pos.x + offsetX;
                    const newY = y + this.pos.y + offsetY;
                    
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && board[newY][newX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    move(dir) {
        if (!this.collision(dir, 0)) {
            this.pos.x += dir;
        }
    }

    drop() {
        if (!this.collision(0, 1)) {
            this.pos.y++;
            return false;
        }
        
        this.merge();
        this.reset();
        return true;
    }

    hardDrop() {
        while (!this.collision(0, 1)) {
            this.pos.y++;
            score += 2; // Bonus points for hard drop
        }
        this.merge();
        this.reset();
        document.getElementById('score').textContent = score;
    }

    merge() {
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + this.pos.y][x + this.pos.x] = value;
                }
            });
        });
    }

    reset() {
        piece = nextPiece;
        nextPiece = new Piece();
        if (piece.collision(0, 0)) {
            gameOver = true;
        }
    }

    getShadowPosition() {
        let shadowY = this.pos.y;
        while (!this.collision(0, shadowY - this.pos.y + 1)) {
            shadowY++;
        }
        return shadowY;
    }

    draw(context, offsetX = 0, offsetY = 0, isShadow = false) {
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    if (isShadow) {
                        context.fillStyle = 'rgba(255, 255, 255, 0.1)';
                        context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                    } else {
                        context.fillStyle = this.color;
                        // Add gradient effect
                        const gradient = context.createLinearGradient(
                            x + offsetX, y + offsetY,
                            x + offsetX + 1, y + offsetY + 1
                        );
                        gradient.addColorStop(0, this.color);
                        gradient.addColorStop(1, shadeColor(this.color, -30));
                        context.fillStyle = gradient;
                        context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    }
                    context.fillRect(x + offsetX, y + offsetY, 1, 1);
                    context.strokeRect(x + offsetX, y + offsetY, 1, 1);
                }
            });
        });
    }
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.02;

    // Draw vertical lines
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ROWS);
        ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(COLS, y);
        ctx.stroke();
    }
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function drawBoard() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();
    
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const color = COLORS[value - 1];
                const gradient = ctx.createLinearGradient(x, y, x + 1, y + 1);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, shadeColor(color, -30));
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, 1, 1);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.strokeRect(x, y, 1, 1);
            }
        });
    });

    // Draw shadow
    if (piece) {
        const shadowY = piece.getShadowPosition();
        piece.draw(ctx, piece.pos.x, shadowY, true);
    }
}

function drawNextPiece() {
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const offsetX = (4 - nextPiece.shape[0].length) / 2;
    const offsetY = (4 - nextPiece.shape.length) / 2;
    nextPiece.draw(nextCtx, offsetX, offsetY);
}

function clearLines() {
    let linesCleared = 0;
    
    outer: for (let y = board.length - 1; y >= 0; y--) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        linesCleared++;
        y++;
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        score += [40, 100, 300, 1200][linesCleared - 1] * level;
        level = Math.floor(lines / 10) + 1;
        
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
    }
}

function update(time = 0) {
    if (gameOver) {
        document.getElementById('game-over').style.display = 'block';
        document.getElementById('final-score').textContent = score;
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    
    if (dropCounter > 1000 - (level * 50)) {
        piece.drop();
        dropCounter = 0;
    }
    
    drawBoard();
    piece.draw(ctx);
    drawNextPiece();
    requestAnimationFrame(update);
}

function resetGame() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('score').textContent = '0';
    document.getElementById('level').textContent = '1';
    document.getElementById('lines').textContent = '0';
    piece = new Piece();
    nextPiece = new Piece();
    update();
}

document.addEventListener('keydown', event => {
    if (gameOver) return;
    
    switch (event.keyCode) {
        case 37: // Left
            piece.move(-1);
            break;
        case 39: // Right
            piece.move(1);
            break;
        case 40: // Down
            piece.drop();
            dropCounter = 0;
            break;
        case 38: // Up
            piece.rotate();
            break;
        case 32: // Space
            piece.hardDrop();
            break;
        case 80: // P
            // Implement pause functionality
            break;
    }
});

// Start game
piece = new Piece();
nextPiece = new Piece();
update();