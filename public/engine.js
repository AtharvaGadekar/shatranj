// Global variables to track game state
let selectedPiece = null;
let selectedSquare = null;
let currentPlayer = 'white'; // Start with white

// Initialize the Stockfish engine
let stockfish;
let engineReady = false;

function initializeEngine() {
    try {
        // Stockfish.js is already loaded via script tag in the head
        stockfish = new Worker('stockfish.js');
        
        stockfish.onmessage = function(event) {
            const message = event.data;
            
            // Handle different types of messages from the engine
            if (message.includes('uciok')) {
                stockfish.postMessage('isready');
            } else if (message.includes('readyok')) {
                console.log('Stockfish engine is ready');
                engineReady = true;
            } else if (message.includes('bestmove')) {
                handleBestMove(message);
            } else {
                console.log("Stockfish:", message);
            }
        };
        
        // Initialize with UCI mode
        stockfish.postMessage('uci');
    } catch (error) {
        console.error("Error initializing Stockfish:", error);
    }
}

// Call this function when the page loads
initializeEngine();

// Wait for the DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the board with event listeners
    addBoardEventListeners();
    
    // Add event listeners to control buttons
    document.getElementById('get-hint').addEventListener('click', getBestMove);
    document.getElementById('computer-move').addEventListener('click', function() {
        resetGame();
    });
    document.getElementById('restore-board').addEventListener('click', function() {
        verifyBoardState();
    });
});

// Add event listeners to all squares
function addBoardEventListeners() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        square.addEventListener('click', handleSquareClick);
    });
}

// Handle click on a square
function handleSquareClick(event) {
    // Get the square and piece that was clicked
    const square = event.currentTarget;
    const piece = square.querySelector('.piece');
    const squarePosition = square.getAttribute('data-square');
    
    // Only allow player to move white pieces
    if (selectedPiece) {
        // If clicking on a highlighted square (valid move)
        if (square.classList.contains('possible-move')) {
            // Move the piece
            movePiece(selectedSquare, squarePosition);
            // Clear selection and highlights
            clearHighlights();
            selectedPiece = null;
            selectedSquare = null;
        } 
        // If clicking on another white piece
        else if (piece && piece.getAttribute('data-piece').startsWith('white')) {
            // Clear previous selection and highlights
            clearHighlights();
            // Select the new piece
            selectPiece(square, piece);
        }
        // If clicking on an invalid square
        else {
            // Clear selection and highlights
            clearHighlights();
            selectedPiece = null;
            selectedSquare = null;
        }
    } 
    // If no piece is selected yet and clicked on a white piece
    else if (piece && piece.getAttribute('data-piece').startsWith('white') && currentPlayer === 'white') {
        selectPiece(square, piece);
    }
}

// Select a piece and show possible moves
function selectPiece(square, piece) {
    selectedPiece = piece;
    selectedSquare = square.getAttribute('data-square');
    square.classList.add('selected');
    
    // Highlight possible moves
    const pieceName = piece.getAttribute('data-piece');
    const validMoves = getValidMovesConsideringCheck(selectedSquare, pieceName);
    
    validMoves.forEach(move => {
        const moveSquare = document.querySelector(`.square[data-square="${move}"]`);
        if (moveSquare) {
            moveSquare.classList.add('possible-move');
        }
    });
}

// Clear all highlights and selections
function clearHighlights() {
    document.querySelectorAll('.square.selected').forEach(square => {
        square.classList.remove('selected');
    });
    
    document.querySelectorAll('.square.possible-move').forEach(square => {
        square.classList.remove('possible-move');
    });
}

// Move a piece from one square to another
function movePiece(fromSquare, toSquare) {
    const fromElement = document.querySelector(`.square[data-square="${fromSquare}"]`);
    const toElement = document.querySelector(`.square[data-square="${toSquare}"]`);
    const piece = fromElement.querySelector('.piece');
    
    // Remove any existing piece on the destination square
    if (toElement.querySelector('.piece')) {
        toElement.removeChild(toElement.querySelector('.piece'));
    }
    
    // Move the piece to the new square
    fromElement.removeChild(piece);
    toElement.appendChild(piece);
    
    // Update the pieces object to reflect the new position
    const pieceName = piece.getAttribute('data-piece');
    delete pieces[fromSquare];
    pieces[toSquare] = pieceName;
    
    // First check for game end conditions before switching players
    const oldPlayer = currentPlayer;
    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    // Update the current player
    currentPlayer = nextPlayer;
    
    // Check for checkmate or stalemate (use currentPlayer because it's already switched)
    if (isCheckmate(currentPlayer)) {
        const winner = currentPlayer === 'white' ? 'Black' : 'White';
        announceGameEnd(`Checkmate! ${winner} wins!`);
        return; // Important: return early to prevent AI move after game end
    } else if (isStalemate(currentPlayer)) {
        announceGameEnd("Stalemate! The game is a draw.");
        return; // Important: return early to prevent AI move after game end
    } else if (isKingInCheck(currentPlayer)) {
        announceCheck();
    }
    
    // If it's now the computer's turn (black), make an AI move
    console.log("Current player after move:", currentPlayer);
    if (currentPlayer === 'black' && !isCheckmate('black') && !isStalemate('black')) {
        // Store the current player in a closure to prevent race conditions
        const aiPlayer = 'black';
        // Slight delay to make the computer's "thinking" visible
        setTimeout(() => {
            if (currentPlayer === aiPlayer) {
                makeAIMove();
            } else {
                console.error('Player changed before AI could move!');
            }
        }, 500);
    }
}

// Add a function to make the AI move
function makeAIMove() {
    if (!engineReady) {
        console.log('Engine not ready yet');
        return;
    }
    
    console.log('Computer is making a move as', currentPlayer);
    
    // Verify we're actually supposed to be making a move as black
    if (currentPlayer !== 'black') {
        console.error('Attempted to make computer move, but current player is', currentPlayer);
        return;
    }
    
    // Show "thinking" indicator
    const thinkingMsg = document.createElement('div');
    thinkingMsg.className = 'thinking-message';
    thinkingMsg.textContent = 'Computer thinking...';
    document.body.appendChild(thinkingMsg);
    
    const fen = boardToFen();
    console.log("FEN position for computer move:", fen);
    
    // Set position and start analysis
    stockfish.postMessage('position fen ' + fen);
    stockfish.postMessage('go depth 10');
    
    console.log("Computer analyzing position...");
}

// Update the handleBestMove function to actually make the move
function handleBestMove(message) {
    // Remove thinking message if it exists
    const thinkingMsg = document.querySelector('.thinking-message');
    if (thinkingMsg) {
        document.body.removeChild(thinkingMsg);
    }
    
    // Extract the move from the message (e.g., "bestmove e2e4")
    const move = message.split(' ')[1];
    
    console.log(`handleBestMove called with move: ${move}, currentPlayer: ${currentPlayer}`);
    
    if (move && currentPlayer === 'black') {
        console.log('Stockfish plays:', move);
        
        // Convert Stockfish move format (e.g., "e2e4") to your format
        const fromSquare = move.substring(0, 2);
        const toSquare = move.substring(2, 4);
        
        console.log(`Moving piece from ${fromSquare} to ${toSquare}`);
        
        // Execute the move
        const fromElement = document.querySelector(`.square[data-square="${fromSquare}"]`);
        const toElement = document.querySelector(`.square[data-square="${toSquare}"]`);
        
        if (fromElement && toElement) {
            // Make sure we have a piece to move
            const piece = fromElement.querySelector('.piece');
            if (!piece) {
                console.error('No piece found at', fromSquare);
                return;
            }
            
            // Highlight the move briefly
            fromElement.classList.add('suggested-move-from');
            toElement.classList.add('suggested-move-to');
            
            setTimeout(() => {
                // Remove highlights
                fromElement.classList.remove('suggested-move-from');
                toElement.classList.remove('suggested-move-to');
                
                // Make the actual move
                console.log('Executing computer move');
                movePiece(fromSquare, toSquare);
            }, 500);
        } else {
            console.error('Could not find elements for squares:', fromSquare, toSquare);
        }
    } else {
        console.log('Not executing move:', move, 'Current player:', currentPlayer);
    }
}

// Add a function to verify and restore the board state
function verifyBoardState() {
    console.log("Verifying board state...");
    
    // Clear all piece elements from the board
    document.querySelectorAll('.piece').forEach(pieceElement => {
        pieceElement.parentNode.removeChild(pieceElement);
    });
    
    // Rebuild the board based on the pieces object
    for (const [square, pieceName] of Object.entries(pieces)) {
        const squareElement = document.querySelector(`.square[data-square="${square}"]`);
        if (squareElement) {
            const pieceHtml = `<div class="piece" style="background-image: ${getPieceImage(pieceName)}" data-piece="${pieceName}"></div>`;
            squareElement.innerHTML = pieceHtml;
        }
    }
}

// Fix the getValidMovesConsideringCheck function to properly restore state
function getValidMovesConsideringCheck(position, pieceName) {
    const color = pieceName.split('-')[0];
    const standardMoves = getValidMoves(position, pieceName);
    const legalMoves = [];
    
    // For each potential move, test if it would leave the king in check
    for (const move of standardMoves) {
        // Save the current state
        const originalPieces = {...pieces};
        const capturedPiece = pieces[move];
        
        // Simulate the move
        delete pieces[position];
        pieces[move] = pieceName;
        
        // Check if the king is in check after the move
        if (!isKingInCheck(color)) {
            legalMoves.push(move);
        }
        
        // Restore the original state
        pieces[position] = pieceName;
        if (capturedPiece) {
            pieces[move] = capturedPiece;
        } else {
            delete pieces[move];
        }
    }
    
    return legalMoves;
}

function getBestMove() {
    if (!engineReady) {
        console.log('Engine not ready yet');
        return;
    }
    
    // Show "thinking" indicator
    const thinkingMsg = document.createElement('div');
    thinkingMsg.className = 'thinking-message';
    thinkingMsg.textContent = 'Calculating best move...';
    document.body.appendChild(thinkingMsg);
    
    const fen = boardToFen();
    
    // Use a flag to indicate this is a hint request, not a normal computer move
    let isHintMode = true;
    
    // Create a one-time event handler for the hint response
    const originalOnMessage = stockfish.onmessage;
    stockfish.onmessage = function(event) {
        const message = event.data;
        
        if (message.includes('bestmove')) {
            // Remove thinking message
            const thinkingMsg = document.querySelector('.thinking-message');
            if (thinkingMsg) {
                document.body.removeChild(thinkingMsg);
            }
            
            // Extract the move from the message (e.g., "bestmove e2e4")
            const move = message.split(' ')[1];
            
            if (move) {
                console.log('Suggested move:', move);
                
                // Convert Stockfish move format (e.g., "e2e4") to your format
                const fromSquare = move.substring(0, 2);
                const toSquare = move.substring(2, 4);
                
                // For hints, just highlight the move
                const fromElement = document.querySelector(`.square[data-square="${fromSquare}"]`);
                const toElement = document.querySelector(`.square[data-square="${toSquare}"]`);
                
                if (fromElement && toElement) {
                    // Highlight the suggested move
                    fromElement.classList.add('suggested-move-from');
                    toElement.classList.add('suggested-move-to');
                    
                    // Remove the highlights after a few seconds
                    setTimeout(() => {
                        fromElement.classList.remove('suggested-move-from');
                        toElement.classList.remove('suggested-move-to');
                    }, 3000);
                }
            }
            
            // Important: Restore the original message handler when done
            console.log("Restoring original message handler after hint");
            stockfish.onmessage = originalOnMessage;
        } else {
            // For non-bestmove messages during hint mode, just log them
            console.log("Hint calculation:", message);
        }
    };
    
    // Get difficulty settings
    const diffSettings = getDifficultySettings();
    
    // Set position and calculate with appropriate difficulty
    stockfish.postMessage('position fen ' + fen);
    stockfish.postMessage('setoption name Skill Level value ' + diffSettings.skillLevel);
    stockfish.postMessage('go depth ' + diffSettings.depth);
}

// Convert your board to FEN notation for Stockfish
function boardToFen() {
    let fen = '';
    let emptyCount = 0;
    
    for (let rank = 8; rank >= 1; rank--) {
        for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
            const square = 'abcdefgh'[fileIndex] + rank;
            const piece = pieces[square];
            
            if (piece) {
                // If we had empty squares before this piece, add the count
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                
                // Map your piece notation to FEN notation
                const pieceType = piece.split('-')[1];
                const pieceColor = piece.split('-')[0];
                let fenChar;
                
                switch (pieceType) {
                    case 'pawn': fenChar = 'p'; break;
                    case 'rook': fenChar = 'r'; break;
                    case 'knight': fenChar = 'n'; break;
                    case 'bishop': fenChar = 'b'; break;
                    case 'queen': fenChar = 'q'; break;
                    case 'king': fenChar = 'k'; break;
                }
                
                // Uppercase for white pieces
                if (pieceColor === 'white') {
                    fenChar = fenChar.toUpperCase();
                }
                
                fen += fenChar;
            } else {
                emptyCount++;
            }
        }
        
        // Add empty count at the end of the rank if needed
        if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
        }
        
        // Add rank separator (except for the last rank)
        if (rank > 1) {
            fen += '/';
        }
    }
    
    // Add active color (w for White, b for Black)
    fen += ' ' + (currentPlayer === 'white' ? 'w' : 'b');
    
    // Add castling availability (simplified - assuming all castling is available)
    fen += ' KQkq';
    
    // Add en passant target square (simplified - no en passant tracking yet)
    fen += ' -';
    
    // Add halfmove clock and fullmove number (simplified)
    fen += ' 0 1';
    
    return fen;
}

function isKingInCheck(color) {
    // Find the king's position
    let kingPosition = null;
    for (const [square, piece] of Object.entries(pieces)) {
        if (piece === `${color}-king`) {
            kingPosition = square;
            break;
        }
    }
    
    if (!kingPosition) return false;
    
    // Check if any opponent piece can capture the king
    const opponentColor = color === 'white' ? 'black' : 'white';
    for (const [square, piece] of Object.entries(pieces)) {
        if (piece.startsWith(opponentColor)) {
            const validMoves = getValidMoves(square, piece);
            if (validMoves.includes(kingPosition)) {
                return true;
            }
        }
    }
    
    return false;
}

function isCheckmate(color) {
    // First check if the king is in check
    if (!isKingInCheck(color)) return false;
    
    // Then see if any move can get the king out of check
    for (const [square, piece] of Object.entries(pieces)) {
        if (piece.startsWith(color)) {
            const validMoves = getValidMovesConsideringCheck(square, piece);
            if (validMoves.length > 0) {
                return false; // There's at least one legal move
            }
        }
    }
    
    // No legal moves and king is in check = checkmate
    return true;
}

function isStalemate(color) {
    // First check if the king is not in check
    if (isKingInCheck(color)) return false;
    
    // Then see if the player has any legal moves
    for (const [square, piece] of Object.entries(pieces)) {
        if (piece.startsWith(color)) {
            const validMoves = getValidMovesConsideringCheck(square, piece);
            if (validMoves.length > 0) {
                return false; // There's at least one legal move
            }
        }
    }
    
    // No legal moves and king is not in check = stalemate
    return true;
}

// Add functions to show game end and check messages
function announceGameEnd(message) {
    // Create a modal or message div to display the result
    const gameEndModal = document.createElement('div');
    gameEndModal.className = 'game-end-modal';
    gameEndModal.innerHTML = `
        <div class="modal-content">
            <h2>${message}</h2>
            <button id="new-game">New Game</button>
        </div>
    `;
    document.body.appendChild(gameEndModal);
    
    // Add event listener to the new game button
    document.getElementById('new-game').addEventListener('click', resetGame);
}

function announceCheck() {
    // Show a message that the king is in check
    const checkMessage = document.createElement('div');
    checkMessage.className = 'check-message';
    checkMessage.textContent = 'Check!';
    document.body.appendChild(checkMessage);
    
    // Remove the message after a short delay
    setTimeout(() => {
        if (document.body.contains(checkMessage)) {
            document.body.removeChild(checkMessage);
        }
    }, 2000);
}

function resetGame() {
    // Reset the pieces to their starting positions
    pieces = {
        'a8': 'black-rook', 'b8': 'black-knight', 'c8': 'black-bishop', 'd8': 'black-queen',
        'e8': 'black-king', 'f8': 'black-bishop', 'g8': 'black-knight', 'h8': 'black-rook',
        'a7': 'black-pawn', 'b7': 'black-pawn', 'c7': 'black-pawn', 'd7': 'black-pawn',
        'e7': 'black-pawn', 'f7': 'black-pawn', 'g7': 'black-pawn', 'h7': 'black-pawn',
        'a2': 'white-pawn', 'b2': 'white-pawn', 'c2': 'white-pawn', 'd2': 'white-pawn',
        'e2': 'white-pawn', 'f2': 'white-pawn', 'g2': 'white-pawn', 'h2': 'white-pawn',
        'a1': 'white-rook', 'b1': 'white-knight', 'c1': 'white-bishop', 'd1': 'white-queen',
        'e1': 'white-king', 'f1': 'white-bishop', 'g1': 'white-knight', 'h1': 'white-rook'
    };
    
    // Reset global variables
    selectedPiece = null;
    selectedSquare = null;
    currentPlayer = 'white';
    
    // Clear the board and rebuild it
    verifyBoardState();
    
    // Remove any modal windows
    const modal = document.querySelector('.game-end-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
    
    // Clear any highlights
    clearHighlights();
}

// Determine valid moves for a given piece at a given position
function getValidMoves(position, pieceName) {
    const [file, rank] = position.split('');
    const fileIndex = 'abcdefgh'.indexOf(file);
    const rankIndex = parseInt(rank) - 1;
    const pieceType = pieceName.split('-')[1]; // pawn, rook, knight, etc.
    const pieceColor = pieceName.split('-')[0]; // white or black
    
    let validMoves = [];
    
    // Different movement logic based on piece type
    switch (pieceType) {
        case 'pawn':
            validMoves = getPawnMoves(fileIndex, rankIndex, pieceColor);
            break;
        case 'rook':
            validMoves = getRookMoves(fileIndex, rankIndex, pieceColor);
            break;
        case 'knight':
            validMoves = getKnightMoves(fileIndex, rankIndex, pieceColor);
            break;
        case 'bishop':
            validMoves = getBishopMoves(fileIndex, rankIndex, pieceColor);
            break;
        case 'queen':
            validMoves = getQueenMoves(fileIndex, rankIndex, pieceColor);
            break;
        case 'king':
            validMoves = getKingMoves(fileIndex, rankIndex, pieceColor);
            break;
    }
    
    return validMoves;
}

// Define difficulty settings function that's called in getBestMove
function getDifficultySettings() {
    // Default difficulty settings
    return {
        skillLevel: 10, // Medium difficulty (range is 0-20)
        depth: 10       // Search depth
    };
}
