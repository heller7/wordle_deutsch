// Global variables for settings and statistics
let settings = {
    language: 'en',
    restrictedMode: false,
    maxGuesses: 6
};

let gameStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0]
};

const gameBoard = document.getElementById('game-board');
const newGameBtn = document.getElementById('new-game-btn');
const statsIcon = document.getElementById('stats-icon');
const settingsIcon = document.getElementById('settings-icon');
const messageDisplay = document.getElementById('message-display');


let guesses = [];
let currentRow = 0;
let currentTile = 0;
let gameOver = false;
let targetWord = '';

let activePopup = null;


// Settings

function updateSettings() {
    settings = {
        language: document.getElementById('language-select').value,
        restrictedMode: document.getElementById('restricted-mode').checked,
        maxGuesses: parseInt(document.getElementById('max-guesses').value, 10)
    };
    saveSettings();
    startNewGame();
    closePopup();
}

function saveSettings() {
    localStorage.setItem('wordleSettings', JSON.stringify(settings));
}

function loadSettings() {
    const storedSettings = localStorage.getItem('wordleSettings');
    settings = storedSettings ? JSON.parse(storedSettings) : { ...settings };
    applySettingsToUI();
}

function applySettingsToUI() {
    document.getElementById('language-select').value = settings.language;
    document.getElementById('restricted-mode').checked = settings.restrictedMode;
    document.getElementById('max-guesses').value = settings.maxGuesses;
}

// Event listeners
document.getElementById('save-settings').addEventListener('click', () => {
    updateSettings();
});

// Game Statistics
function saveStats() {
    localStorage.setItem('wordleStats', JSON.stringify(gameStats));
}

function loadStats() {
    const savedStats = localStorage.getItem('wordleStats');
    if (savedStats) {
        gameStats = JSON.parse(savedStats);
    }
}

function updateStats(won, guesses) {
    gameStats.gamesPlayed++;
    if (won) {
        gameStats.gamesWon++;
        gameStats.currentStreak++;
        gameStats.maxStreak = Math.max(gameStats.maxStreak, gameStats.currentStreak);
        gameStats.guessDistribution[guesses - 1]++;
    } else {
        gameStats.currentStreak = 0;
    }
    saveStats();
}

function renderStatsChart() {
    const statsChart = document.getElementById('stats-chart');
    statsChart.innerHTML = '';
    statsChart.className = 'stats-container';

    // Overall stats
    const overallStats = document.createElement('div');
    overallStats.className = 'overall-stats';
    const winPercentage = gameStats.gamesPlayed > 0 
        ? (gameStats.gamesWon / gameStats.gamesPlayed * 100).toFixed(1) 
        : 0;
    
    overallStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-value">${gameStats.gamesPlayed}</span>
            <span class="stat-label">Played</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${winPercentage}%</span>
            <span class="stat-label">Win %</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${gameStats.currentStreak}</span>
            <span class="stat-label">Current Streak</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${gameStats.maxStreak}</span>
            <span class="stat-label">Max Streak</span>
        </div>
    `;
    statsChart.appendChild(overallStats);

    // Guess distribution chart
    const distributionChart = document.createElement('div');
    distributionChart.className = 'distribution-chart';
    distributionChart.innerHTML = '<h3>Guess Distribution</h3>';
    
    const maxGuesses = Math.max(...gameStats.guessDistribution);
    gameStats.guessDistribution.forEach((count, index) => {
        if (index < settings.maxGuesses) {
            const percentage = maxGuesses > 0 ? (count / maxGuesses) * 100 : 0;
            distributionChart.innerHTML += `
                <div class="distribution-row">
                    <span class="guess-number">${index + 1}</span>
                    <div class="distribution-bar-container">
                        <div class="distribution-bar" style="width: ${percentage}%;">
                            <span class="distribution-count">${count}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    statsChart.appendChild(distributionChart);
}

function showStatistics() {
    const statsPopup = document.getElementById('stats-popup');
    statsPopup.style.display = 'block';
    renderStatsChart();
}

// Game State 
function saveGameState() {
    const gameState = {
        guesses,
        currentRow,
        currentTile,
        gameOver,
        targetWord
    };
    localStorage.setItem('wordleGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('wordleGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        guesses = gameState.guesses;
        currentRow = gameState.currentRow;
        currentTile = gameState.currentTile;
        gameOver = gameState.gameOver;
        targetWord = gameState.targetWord;
        return true;
    }
    return false;
}

function clearGameState() {
    localStorage.removeItem('wordleGameState');
}


// Game Management Functions
function initGame() {
    loadSettings();
    loadStats();
    if (loadGameState()) {
        renderGameBoard();
        if (gameOver) {
            setTimeout(() => {
                showPopup('stats-popup');
            }, 1000);
        }
    } else {
        startNewGame();
    }
    setupEventListeners();
}

function startNewGame() {
    clearGameState();
    guesses = Array(settings.maxGuesses).fill('').map(() => Array(5).fill(''));
    currentRow = 0;
    currentTile = 0;
    gameOver = false;
    targetWord = getRandomWord();
    renderGameBoard();
    saveGameState();
    closePopup();
}

function getRandomWord() {
    const wordList = getWordList(settings.language);
    if (!wordList || wordList.length === 0) {
        console.error(`No words available for language: ${settings.language}`);
        showMessage(`No words available for language: ${settings.language}`);
        return 'ERROR';
    }
    const randomIndex = Math.floor(Math.random() * wordList.length);
    return wordList[randomIndex].toUpperCase();
}

function checkGuess() {
    const guess = getCurrentWord();
    if (!isValidWord(guess, settings.language)) {
        showMessage(`Not in ${settings.language} word list`);
        return;
    }
    guesses[currentRow] = guess;
    updateTileColors();
    if (guess === targetWord) {
            showMessage("Congratulations! You guessed the word!");
            updateStats(true, currentRow + 1);
            gameOver = true;
            setTimeout(() => {
                showPopup('stats-popup');
            }, 1500); // Show stats popup after 1.5 seconds
        } else if (currentRow === settings.maxGuesses - 1) {
            showMessage(`Game over! The word was ${targetWord}`);
            updateStats(false, settings.maxGuesses);
            gameOver = true;
            setTimeout(() => {
                showPopup('stats-popup');
            }, 1500); // Show stats popup after 1.5 seconds
        } else {
            moveToNextRow();
        }
    saveGameState();
}


// UI Functions
function togglePopup(popupId) {
    const popup = document.getElementById(popupId);
    popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
}


function createGameBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = ''; // Clear existing board
    for (let i = 0; i < settings.maxGuesses; i++) {
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            gameBoard.appendChild(tile);
        }
    }
}


function handleKeyPress(event) {
    if (gameOver) return;

    const key = event.key.toUpperCase();

    if (key === 'ENTER') {
        if (currentTile === 5) {
            checkGuess();
        } else {
            showMessage("Not enough letters");
        }
    } else if (key === 'BACKSPACE') {
        deleteLetter();
        saveGameState();
    } else if (/^[A-Z]$/.test(key) && currentTile < 5) {
        addLetter(key);
        saveGameState();
    }
    else {
        showMessage(`Invalid key: ${key}`);
    }
}

function addLetter(letter) {
    if (currentTile < 5 && currentRow < settings.maxGuesses) {
        guesses[currentRow][currentTile] = letter;
        const tile = document.getElementById('game-board').children[currentRow * 5 + currentTile];
        tile.textContent = letter;
        tile.setAttribute('data', letter);
        currentTile++;
        saveGameState();
    }
}

function deleteLetter() {
    if (currentTile > 0) {
        currentTile--;
        guesses[currentRow][currentTile] = '';
        const tile = document.getElementById('game-board').children[currentRow * 5 + currentTile];
        tile.textContent = '';
        tile.setAttribute('data', '');
        saveGameState();
    }
}

function moveToNextRow() {
    currentRow++;
    currentTile = 0;
    renderGameBoard();
}

function renderGameBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = ''; // Clear existing board
    for (let i = 0; i < settings.maxGuesses; i++) {
        const rowTiles = [];
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            if (guesses[i] && guesses[i][j]) {
                const letter = guesses[i][j];
                tile.textContent = letter;
                tile.setAttribute('data', letter);
            }
            rowTiles.push(tile);
            gameBoard.appendChild(tile);
        }
        
        if (i < currentRow || (i === currentRow && gameOver)) {
            colorTiles(rowTiles, guesses[i], targetWord);
        }
    }
}

function colorTiles(rowTiles, guess, target) {
    const targetLetters = target.split('');
    
    // First pass: Mark correct letters
    rowTiles.forEach((tile, index) => {
        const letter = tile.textContent;
        if (letter === targetLetters[index]) {
            tile.classList.add('correct');
            targetLetters[index] = null; // Mark this letter as used
        }
    });

    // Second pass: Mark present or absent letters
    rowTiles.forEach((tile, index) => {
        if (!tile.classList.contains('correct')) {
            const letter = tile.textContent;
            const remainingIndex = targetLetters.indexOf(letter);
            if (remainingIndex > -1) {
                tile.classList.add('present');
                targetLetters[remainingIndex] = null; // Mark this letter as used
            } else {
                tile.classList.add('absent');
            }
        }
    });
}

function getCurrentWord() {
    let word = '';
    for (let i = 0; i < 5; i++) {
        const tile = document.getElementById('game-board').children[currentRow * 5 + i];
        word += tile.getAttribute('data') || '';
    }
    return word;
}

function updateTileColors() {
    const rowTiles = Array.from(document.getElementById('game-board').children)
        .slice(currentRow * 5, (currentRow + 1) * 5);
    const guess = getCurrentWord();
    colorTiles(rowTiles, guess, targetWord);
}

function createKeyboard() {
    const keyboardElement = document.getElementById('keyboard');
    keyboardElement.innerHTML = '';
    const keyboard = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace']
    ];
    keyboard.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.classList.add('keyboard-row');
        row.forEach(key => {
            const keyElement = document.createElement('button');
            keyElement.textContent = key;
            keyElement.classList.add('key');
            keyElement.setAttribute('data-key', key);
            keyElement.addEventListener('click', () => handleKeyPress({ key }));
            rowElement.appendChild(keyElement);
        });
        keyboardElement.appendChild(rowElement);
    });
}

function updateKeyboard() {
    const guessedLetters = new Set();
    const correctLetters = new Set();
    const presentLetters = new Set();

    // Get all the tiles from the game board
    const tiles = document.querySelectorAll('#game-board .tile');
    const guessedWords = [];

    // Group tiles into words
    for (let i = 0; i < tiles.length; i += 5) {
        const word = Array.from(tiles)
            .slice(i, i + 5)
            .map(tile => tile.getAttribute('data'))
            .join('');
        if (word.length === 5) {
            guessedWords.push(word);
        }
    }

    // Process each guessed word
    guessedWords.forEach(word => {
        for (let j = 0; j < 5; j++) {
            const letter = word[j];
            guessedLetters.add(letter);
            if (letter === targetWord[j]) {
                correctLetters.add(letter);
            } else if (targetWord.includes(letter)) {
                presentLetters.add(letter);
            }
        }
    });

    // Update the keyboard UI
    const keyElements = document.querySelectorAll('.key');
    keyElements.forEach(keyElement => {
        const letter = keyElement.getAttribute('data-key');
        if (correctLetters.has(letter)) {
            keyElement.classList.add('correct');
        } else if (presentLetters.has(letter)) {
            keyElement.classList.add('present');
        } else if (guessedLetters.has(letter)) {
            keyElement.classList.add('absent');
        }
    });
}

function getWordFromRow(row) {
    let word = '';
    for (let i = 0; i < 5; i++) {
        const tile = document.getElementById('game-board').children[row * 5 + i];
        word += tile.getAttribute('data');
    }
    return word;
}


// Message Display
function showMessage(message) {
    const messageDisplay = document.getElementById('message-display');
    messageDisplay.textContent = message;
    messageDisplay.style.display = 'block';

    // Optionally, hide the message after a few seconds
    setTimeout(() => {
        messageDisplay.style.display = 'none';
    }, 3000); // Hide after 3 seconds
}

// Popup Functions
function showPopup(popupId) {
    const popup = document.getElementById(popupId);
    popup.style.display = 'block';
    activePopup = popup;
    
    // If it's the stats popup, render the chart
    if (popupId === 'stats-popup') {
        renderStatsChart();
    }

    // Add event listener to close popup when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closePopupOutside);
    }, 0);
}

function closePopupOutside(event) {
    if (activePopup && !activePopup.contains(event.target)) {
        activePopup.style.display = 'none';
        activePopup = null;
        document.removeEventListener('click', closePopupOutside);
    }
}

function closePopup() {
    if (activePopup) {
        activePopup.style.display = 'none';
        activePopup = null;
        document.removeEventListener('click', closePopupOutside);
    }
}

function handleGlobalKeyPress(event) {
    if (event.key === 'Enter' && activePopup) {
        closePopup();
    }
}


// Setup event listeners
function setupEventListeners() {
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', handleGlobalKeyPress);
    newGameBtn.addEventListener('click', (event) => {
        startNewGame();
        event.target.blur();
    });
    statsIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        showPopup('stats-popup');
    });
    settingsIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        showPopup('settings-popup');
    });
}

// Call initGame when the page loads
window.addEventListener('load', initGame);