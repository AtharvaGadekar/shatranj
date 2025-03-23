let moveHistory = [];
let currentMoveNumber = 1;
const gameContainer = document.querySelector('.game-container');

// Pawn movement logic
function getPawnMoves(fileIndex, rankIndex, color) {
const moves = [];
const direction = color === 'white' ? 1 : -1;
const startRank = color === 'white' ? 1 : 6;

// Forward movement
let newRank = rankIndex + direction;
if (newRank >= 0 && newRank < 8) {
const newPos = 'abcdefgh'[fileIndex] + (newRank + 1);
// Check if square is empty
if (!pieces[newPos]) {
    moves.push(newPos);
    
    // Double move from starting position
    if (rankIndex === startRank) {
        newRank = rankIndex + 2 * direction;
        if (newRank >= 0 && newRank < 8) {
            const doublePos = 'abcdefgh'[fileIndex] + (newRank + 1);
            if (!pieces[doublePos]) {
                moves.push(doublePos);
            }
        }
    }
}
}

// Capture moves (diagonally)
for (let offset of [-1, 1]) {
const newFile = fileIndex + offset;
newRank = rankIndex + direction;

if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
    const capturePos = 'abcdefgh'[newFile] + (newRank + 1);
    const pieceAtPos = pieces[capturePos];
    
    if (pieceAtPos && !pieceAtPos.startsWith(color)) {
        moves.push(capturePos);
    }
}
}

return moves;
}

// Knight movement logic
function getKnightMoves(fileIndex, rankIndex, color) {
const moves = [];
const knightOffsets = [
[-2, -1], [-2, 1], [-1, -2], [-1, 2],
[1, -2], [1, 2], [2, -1], [2, 1]
];

for (let [fileOffset, rankOffset] of knightOffsets) {
const newFile = fileIndex + fileOffset;
const newRank = rankIndex + rankOffset;

if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
    const newPos = 'abcdefgh'[newFile] + (newRank + 1);
    const pieceAtPos = pieces[newPos];
    
    // Can move if square is empty or has opponent piece
    if (!pieceAtPos || !pieceAtPos.startsWith(color)) {
        moves.push(newPos);
    }
}
}

return moves;
}

// Bishop movement logic
function getBishopMoves(fileIndex, rankIndex, color) {
const moves = [];
const directions = [
[-1, -1], // down-left
[-1, 1],  // up-left
[1, -1],  // down-right
[1, 1]    // up-right
];

// Check all four diagonal directions
for (let [fileDir, rankDir] of directions) {
// Continue moving in this direction until hitting a piece or edge
for (let i = 1; i < 8; i++) {
    const newFile = fileIndex + (fileDir * i);
    const newRank = rankIndex + (rankDir * i);
    
    // If we've moved off the board, stop checking this direction
    if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) {
        break;
    }
    
    const newPos = 'abcdefgh'[newFile] + (newRank + 1);
    const pieceAtPos = pieces[newPos];
    
    // If square is empty, we can move there
    if (!pieceAtPos) {
        moves.push(newPos);
    } 
    // If square has an opponent's piece, we can capture it but can't move further
    else if (!pieceAtPos.startsWith(color)) {
        moves.push(newPos);
        break;
    } 
    // If square has our own piece, we can't move there or beyond
    else {
        break;
    }
}
}

return moves;
}

// Rook movement logic
function getRookMoves(fileIndex, rankIndex, color) {
const moves = [];
const directions = [
[0, -1],  // down
[0, 1],   // up
[-1, 0],  // left
[1, 0]    // right
];

// Check all four directions (up, down, left, right)
for (let [fileDir, rankDir] of directions) {
// Continue moving in this direction until hitting a piece or edge
for (let i = 1; i < 8; i++) {
    const newFile = fileIndex + (fileDir * i);
    const newRank = rankIndex + (rankDir * i);
    
    // If we've moved off the board, stop checking this direction
    if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) {
        break;
    }
    
    const newPos = 'abcdefgh'[newFile] + (newRank + 1);
    const pieceAtPos = pieces[newPos];
    
    // If square is empty, we can move there
    if (!pieceAtPos) {
        moves.push(newPos);
    } 
    // If square has an opponent's piece, we can capture it but can't move further
    else if (!pieceAtPos.startsWith(color)) {
        moves.push(newPos);
        break;
    } 
    // If square has our own piece, we can't move there or beyond
    else {
        break;
    }
}
}

return moves;
}

// Queen movement logic
function getQueenMoves(fileIndex, rankIndex, color) {
// A queen can move like a rook AND a bishop
const rookMoves = getRookMoves(fileIndex, rankIndex, color);
const bishopMoves = getBishopMoves(fileIndex, rankIndex, color);

// Combine both move sets
return [...rookMoves, ...bishopMoves];
}

// King movement logic
function getKingMoves(fileIndex, rankIndex, color) {
const moves = [];
const directions = [
[-1, -1], [-1, 0], [-1, 1],  // top row
[0, -1],           [0, 1],   // middle row
[1, -1],  [1, 0],  [1, 1]    // bottom row
];

for (let [fileDir, rankDir] of directions) {
const newFile = fileIndex + fileDir;
const newRank = rankIndex + rankDir;

// Check if the new position is on the board
if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
    const newPos = 'abcdefgh'[newFile] + (newRank + 1);
    const pieceAtPos = pieces[newPos];
    
    // Can move if square is empty or has opponent piece
    if (!pieceAtPos || !pieceAtPos.startsWith(color)) {
        moves.push(newPos);
    }
}
}

return moves;
}
