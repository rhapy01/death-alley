import { createTank, updateTank, initLookAroundControls } from './tank.js';
import { spawnEnemies, updateEnemies } from './enemies.js';
import { updateCombat } from './combat.js';
import { createEnvironment, updateTollgate, updateSpawnItems, checkItemCollection, updateRainbowText, updateAtmosphere, createCheckpoints, updateCheckpoints, checkCheckpointCollision, clearCheckpoints, CHECKPOINT_POSITIONS } from './environment.js';
import { startReplay, recordFrame, recordShot, finishReplay, getReplayList, showReplayAnalysis } from './replay.js';
import { spawnObstacles, updateObstacles, checkObstacleCollisions, clearObstacles } from './obstacles.js';
import { addPortalsToScene } from './portalScene.js';
import { createMainMenu, updateMenuStats, handleKeyPress, notifyGameStarted } from './mainMenu.js';
import { audioManager } from './audio.js';

let scene, camera, renderer, tank, clock, gameActive = true;
let enemies = [], projectiles = [];
let currentLevel = 1;
let hasKey = false;
let levelLength;
let score = 0;
let playerHealth = 100;
let playerMaxHealth = 100;
let gameStarted = false;
let activePowerUps = {};
let isMobileDevice = false;
let isHudVisible = false;
let isGamePaused = false;
let playerLives = 2; // New: Track remaining restarts (2 by default)
let isGameOver = false; // New: Track if game is permanently over
let gateOpeningTriggered = false; // Flag to track if we've triggered automatic gate opening
let frameCount = 0; // Add a frame counter for debugging

// Make projectiles accessible globally for other modules
window.projectiles = projectiles;

const GAME_MODES = {
    NORMAL: 'normal',
    TIME_TRIAL: 'time_trial',
    SURVIVAL: 'survival',
    REPLAY_ANALYSIS: 'replay_analysis'
};

let currentGameMode = GAME_MODES.NORMAL;
let timeTrialStartTime = 0;
let timeTrialBestTimes = {
    1: Infinity,
    2: Infinity,
    3: Infinity,
    50: Infinity
};

// Survival mode variables
let currentWave = 1;
let waveStartTime = 0;
let waveEnemiesRemaining = 0;
let waveTotalEnemies = 0;
let waveInProgress = false;
let survivialHighScore = {
    wave: 0,
    kills: 0
};

// Local reference to checkpoint time bonus for UI (matches value in environment.js)
const CHECKPOINT_TIME_BONUS = 2000; // 2 seconds in milliseconds

// Function to check if the device is mobile or tablet (including iPads)
function detectMobile() {
    // Regular expression for common mobile devices
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    
    // Check if it's an iPad specifically (newer iPads may not identify as iPad in user agent)
    const isIPad = navigator.maxTouchPoints > 1 && 
                  navigator.platform === 'MacIntel' &&
                  !window.MSStream;
                  
    // Check if device supports touch
    const isTouch = 'ontouchstart' in window || 
                   navigator.maxTouchPoints > 0 ||
                   navigator.msMaxTouchPoints > 0;
    
    return mobileRegex.test(navigator.userAgent) || isIPad || isTouch;
}


// Ensure we have a valid user profile
function ensureUserProfile() {
    if (!window.userProfile) {
        try {
            console.log("Initializing user profile for game");
            window.userProfile = new UserProfile();
            return true;
        } catch (error) {
            console.error("Error initializing user profile:", error);
            return false;
        }
    }
    return true;
}

export function initGame() {
    // Make projectiles array globally available
    window.projectiles = projectiles;
    
    // Check if the device is mobile
    isMobileDevice = detectMobile();
    
    // Set up the scene, camera, and renderer
    setupSceneAndRenderer();
    
    // Create the main menu (which now acts as the landing page)
    createMainMenu();
    
    // Make game functions globally available for the main menu
    window.switchGameMode = switchGameMode;
    window.startGamePlay = startGamePlay;
    window.pauseGame = pauseGame;
    window.resumeGame = resumeGame;
    
    // Set up window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Add game over restart button handler
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    
    // Add return to menu button handler
    document.getElementById('returnToMenuBtn').addEventListener('click', returnToMainMenu);
    
    // Initialize mobile controls if needed
    if (isMobileDevice) {
        initMobileControls();
    }
    
    // Add global keyboard event listeners
    window.addEventListener('keydown', handleKeyboardInput);
    
    // Create game mode UI - REMOVED as this is now handled by the main menu
    
    // Add replay analysis button
    addReplayAnalysisButton();
    
    // Start the animation loop, but actual gameplay won't start until
    // the player clicks the Start Game button in the main menu
    animate();
}

// Function to set up the scene, camera, and renderer
function setupSceneAndRenderer() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000022); // Darker blue-black for better star visibility
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 15);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 0.5);
    scene.add(directionalLight);
}

// Handle keyboard input
function handleKeyboardInput(e) {
    // Pass event to menu keyboard handler first
    handleKeyPress(e);
    
    // Only handle game inputs if game has started
    if (!gameStarted) return;
    
    // Handle pause/resume with 'P' key
    if (e.key.toLowerCase() === 'p' && gameStarted) {
        if (isGamePaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }
    
    // Play shoot sound and record shot for replay analysis
    if (e.key === ' ' && gameStarted && currentGameMode !== GAME_MODES.REPLAY_ANALYSIS) {
        audioManager.playShootSound();
        recordShot();
    }
}

// Function to start actual gameplay (called from main menu)
export function startGamePlay() {
    console.log("Starting gameplay with proper user profile initialization");
    
    // Load or initialize user profile - critical for tracking progress
    ensureUserProfile();
    
    // Initialize game session with proper tracking
    window.gameSession = {
        mode: currentGameMode,
        level: currentLevel,
        dCoinsEarned: 0,
        score: 0,
        enemiesDefeated: 0,
        playerDied: false,
        duration: 0,
        startTime: Date.now()
    };
    
    console.log("Game session initialized:", window.gameSession);
    
    // Reset game state
    health = 100;
    score = 0;
    
    // Hide the menu
    document.getElementById("menuContainer").style.display = "none";
    document.getElementById("gameCanvas").style.display = "block";

    // Make sure we're starting with fresh state if returning from game over
    
    // Initialize game session
    window.gameSession = {
        mode: currentGameMode,
        level: currentLevel,
        dCoinsEarned: 0,
        score: 0,
        enemiesDefeated: 0,
        playerDied: false,
        duration: 0,
        startTime: Date.now()
    };

    if (isGameOver) {
        // Reset critical game state variables for a fresh start
        isGameOver = false;
        playerLives = 2;
        playerHealth = 100;
        score = 0;
    currentLevel = 1;
    hasKey = false;
        activePowerUps = {};
        
        // Reset survival mode variables
            currentWave = 1;
            waveEnemiesRemaining = 0;
            waveTotalEnemies = 0;
            waveInProgress = false;
        
        // Update UI to reflect reset state
        updateHealthBar(playerHealth);
        updateStats();
    }

    // Set game as started
    gameStarted = true;
    gameActive = true;
    
    // Start background music
    audioManager.startBackgroundMusic();
    
    // Initialize the game world if not done yet
    if (!tank) {
        initGameWorld();
    } else {
        // Reset tank position for a fresh start
        tank.position.set(0, 0, 0);
        
        // Clear existing enemies and obstacles
        clearEnemies();
        if (typeof clearObstacles === 'function') {
            clearObstacles();
        }
    }
            
            // Set level start time for key acquisition validation
            scene.userData.levelStartTime = Date.now();
            
    // Set up for the selected game mode
            if (currentGameMode === GAME_MODES.TIME_TRIAL) {
                console.log("Starting Time Trial mode");
                timeTrialStartTime = Date.now();
                
                // Set the tank's gameMode property so the tollgate can identify time trial mode
                if (tank && tank.userData) {
                    tank.userData.gameMode = 'time_trial';
                }
                
                // Show time trial timer
                const timerContainer = document.getElementById('time-trial-container');
                if (timerContainer) {
                    console.log("Showing time trial timer container");
                    timerContainer.style.display = 'block';
                    // Also ensure the timer is immediately updated
                    const timerElement = document.getElementById('time-trial-timer');
                    if (timerElement) {
                        timerElement.textContent = '00:00.000';
                    }
                } else {
                    console.error("Could not find time-trial-container");
                }
                
                updateTimeTrialTimer();
                
                // Create checkpoints for Time Trial mode
                console.log("Creating checkpoints for Time Trial mode");
                const newCheckpoints = createCheckpoints(scene, currentLevel, 'time_trial');
                console.log(`Created ${newCheckpoints.length} checkpoints`);
                
                // Display checkpoint info message
                displayMessage("Time Trial Started! Race to each checkpoint for time bonuses!", "mission");
    } else if (currentGameMode === GAME_MODES.SURVIVAL) {
                    // Set tank's game mode
                    if (tank && tank.userData) {
                        tank.userData.gameMode = 'survival';
                    }
                    
        // Start first wave for survival mode only if game is active and started
        if (gameActive && gameStarted) {
                    startNewWave();
        }
                    
                    displayMessage("Survival Mode Started! Defeat waves of enemies!", "mission");
            } else {
                // Normal mode
                if (tank && tank.userData) {
                    tank.userData.gameMode = 'normal';
                }
                
                displayMessage("Mission Started! Watch for obstacles and defeat enemies!", "mission");
            }
            
            // Spawn obstacles for the current mode and level
            spawnObstacles(scene, currentLevel, currentGameMode);
            
    // Start replay recording
            if (currentGameMode !== GAME_MODES.REPLAY_ANALYSIS) {
                startReplay(tank, currentLevel, currentGameMode);
            }
            
    // Notify the menu that game has started
    notifyGameStarted();
    
    // Show game UI - removed controls help display
    document.getElementById('hud').style.display = 'block';
    // document.getElementById('controls-help').style.display = 'block'; // Controls removed - now in main menu
    
    // Update stats display
    updateStats();
}

// Initialize the game world
function initGameWorld() {
    try {
    // Create environment
    const envInfo = createEnvironment(scene);
    levelLength = envInfo.LEVEL_LENGTH;
    
        // Store references for animation - with error handling
        if (envInfo.eiffelTowers) {
            console.log("Storing eiffelTowers reference", {
                count: Array.isArray(envInfo.eiffelTowers) ? envInfo.eiffelTowers.length : 'not an array'
            });
    window.eiffelTowers = envInfo.eiffelTowers;
        } else {
            console.warn("No eiffelTowers created in environment - initializing empty array");
            window.eiffelTowers = [];
        }
    
    // Add portals to the scene
    window.portalManager = addPortalsToScene(scene, camera, renderer);
    
    // Create the player tank
    tank = createTank(scene);
    tank.position.z = 0;
        
        // Set game mode on tank for combat system reference
        tank.userData.gameMode = currentGameMode;
    
    // Initialize the clock
    clock = new THREE.Clock();
    
    // Initialize Look Around feature
    initLookAroundControls();
    
    // Reset game variables
    currentLevel = 1;
    hasKey = false;
    score = 0;
        playerHealth = currentGameMode === GAME_MODES.TIME_TRIAL ? Infinity : 100;
    
    // Update level display
    document.getElementById('level').textContent = `Level: ${currentLevel}`;
    
    // Initialize health bar
        updateHealthBar(currentGameMode === GAME_MODES.TIME_TRIAL ? 100 : playerHealth);
    
    // Initialize distance meter with full distance
    updateDistanceDisplay(levelLength);
    
    // Add Replay Analysis button to UI
    addReplayAnalysisButton();
    
    // Spawn enemies for the current level and mode
    spawnEnemies(scene, enemies, tank, currentLevel, currentGameMode);
    } catch (error) {
        console.error("Error initializing game world:", error);
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Increment frame counter
    frameCount++;
    
    // Always render the scene
    renderer.render(scene, camera);
    
    // Don't update game state if paused or not active
    if (!gameActive || isGamePaused) {
        return;
    }
    
    // Only update game logic if game has started
    if (gameStarted) {
        const delta = clock.getDelta();
        
        // Update the tank
        const tankData = updateTank(tank, delta, scene, camera);
        
        // Update projectiles
        updateProjectiles(delta);
        
        // Update enemies
        updateEnemies(enemies, tank, scene, delta, projectiles);
        
        // Check for enemy hits and handle combat
        updateCombat(projectiles, enemies, scene, tank, updateStats, displayMessage);
        
        // Update effects
        updateEnvironmentEffects(delta);
        
        // Update game state based on the current game mode
        updateGameModeState(delta);
        
        // Update power-ups
        updatePowerUpIndicator();
    
    // Update speedometer
        updateSpeedometer(tankData.speed);
        
        // Record frame for replay
        if (currentGameMode !== GAME_MODES.REPLAY_ANALYSIS) {
        recordFrame(tank, projectiles, enemies, currentLevel, currentGameMode);
    }
    }
    
    if (gameActive && !isGamePaused) {
        // ... other update code ...
        
        // Check wave completion for survival mode
        checkWaveCompletion();
    }
}

function updateDistanceDisplay(distance) {
    const distanceElement = document.getElementById('distance');
    if (distanceElement) {
        const formattedDistance = Math.max(0, Math.floor(distance - (tank ? tank.position.z : 0)));
        distanceElement.textContent = `Distance to Tollgate: ${formattedDistance}m`;
        
        // Update menu stats - add distance update
        updateMenuStats({
            distance: formattedDistance
        });
        
        // Add visual effect when getting close to tollgate
    const distanceContainer = document.getElementById('distance-container');
        if (distanceContainer) {
            if (formattedDistance < 100) {
                distanceElement.style.color = '#ff3333';
                distanceElement.style.textShadow = '0 0 5px rgba(255, 0, 0, 0.7)';
                distanceContainer.style.borderColor = '#ff3333';
                distanceContainer.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
                
                if (formattedDistance < 50) {
            distanceContainer.classList.add('pulse');
                } else {
        distanceContainer.classList.remove('pulse');
                }
    } else {
                distanceElement.style.color = '#00ffff';
                distanceElement.style.textShadow = '0 0 5px rgba(0, 255, 255, 0.7)';
        distanceContainer.style.borderColor = '#00aaff';
                distanceContainer.style.boxShadow = '0 0 10px rgba(0, 170, 255, 0.5)';
        distanceContainer.classList.remove('pulse');
            }
        }
    }
}

function updateStats(damage = 0, points = 0) {
    // In Time Trial mode, player should have infinite health
    if (currentGameMode === GAME_MODES.TIME_TRIAL) {
        playerHealth = Infinity;
        damage = 0; // Prevent any damage from being applied
    } else {
    if (damage > 0) playerHealth = Math.max(0, playerHealth - damage);
    }
    score += points;
    
    document.getElementById('stats').textContent = `Score: ${score} | Health: ${currentGameMode === GAME_MODES.TIME_TRIAL ? '8' : playerHealth} | Lives: ${playerLives}`;
    updateHealthBar(currentGameMode === GAME_MODES.TIME_TRIAL ? 100 : playerHealth);
    
    // Check if player health is zero (only in non-Time Trial modes)
    if (playerHealth <= 0 && gameActive && currentGameMode !== GAME_MODES.TIME_TRIAL) {
        if (playerLives > 0) {
            // Player still has lives, show restart message
            displayMessage(`You lost! ${playerLives} restart${playerLives === 1 ? '' : 's'} remaining. Click Restart to continue on level ${currentLevel}.`, "warning");
        }
        handlePlayerDeath();
    }
    
    // Update menu stats - safely handle case where tank doesn't exist yet
    const distance = tank ? Math.max(0, Math.floor(levelLength - tank.position.z)) : levelLength;
    
    updateMenuStats({
        level: currentLevel,
        score: score,
        health: currentGameMode === GAME_MODES.TIME_TRIAL ? '8' : playerHealth,
        lives: playerLives,
        distance: distance,
        currentTime: document.getElementById('time-trial-timer') ? document.getElementById('time-trial-timer').textContent : null,
        bestTimes: timeTrialBestTimes,
        currentWave: currentWave,
        enemiesDefeated: waveTotalEnemies - waveEnemiesRemaining,
        highestWave: survivialHighScore.wave
    });
}

function updateHealthBar(health) {
    const percentage = Math.max(0, health);
    const healthBar = document.getElementById('health-bar-fill');
    healthBar.style.width = `${percentage}%`;
    
    // Change color based on health level
    if (percentage > 60) {
        healthBar.style.background = 'linear-gradient(to right, #ff0000, #ff3300)';
    } else if (percentage > 30) {
        healthBar.style.background = 'linear-gradient(to right, #ff3300, #ff6600)';
    } else {
        healthBar.style.background = 'linear-gradient(to right, #ff6600, #ff9900)';
    }
}

// New function to handle player death
function handlePlayerDeath() {
    gameActive = false;
    
    if (playerLives > 0) {
        // Player still has lives, show restart screen with restart option
        showRestartScreen();
    } else {
        // Player has no lives left, permanent game over
        isGameOver = true;
        gameOver();
    }
}

// New function to show the restart screen
function showRestartScreen() {
    const gameOverElement = document.getElementById('gameOver');
    const gameOverTitle = gameOverElement.querySelector('h1');
    const restartBtn = document.getElementById('restartBtn');
    const returnToMenuBtn = document.getElementById('returnToMenuBtn');
    
    // Change text to indicate restart
    gameOverTitle.textContent = 'YOU DIED';
    document.getElementById('finalScore').textContent = `Score: ${score} | Level: ${currentLevel}`;
    
    if (playerLives > 0) {
        // Show restart button with lives count
        restartBtn.textContent = `Restart Level (${playerLives} left)`;
        restartBtn.style.display = 'block';
        returnToMenuBtn.style.display = 'none';
    } else {
        // Show return to menu button when no lives left
        restartBtn.style.display = 'none';
        returnToMenuBtn.style.display = 'block';
    }
    
    // Hide survival stats if they exist
    const survivalStats = document.getElementById('survival-stats');
    if (survivalStats) {
        survivalStats.style.display = 'none';
    }
    
    // Show restart screen
    gameOverElement.style.display = 'flex';
}

function gameOver() {
    console.log("Game over - preparing to save progress");
    gameActive = false;

    // Update final game session stats
    if (window.gameSession) {
        window.gameSession.duration = Date.now() - window.gameSession.startTime;
        window.gameSession.score = score;
        window.gameSession.level = currentLevel;
        window.gameSession.playerDied = true;
        
        console.log("Final game session:", JSON.stringify(window.gameSession));
        
        // Save game session to user profile
        try {
            if (ensureUserProfile() && typeof window.userProfile.updateStats === 'function') {
                console.log("Saving game session to user profile");
                window.userProfile.updateStats(window.gameSession);
                
                // Force profile save
                if (typeof window.userProfile.saveProfile === 'function') {
                    window.userProfile.saveProfile();
                    console.log("User profile saved successfully");
                }
            } else {
                console.error("User profile not properly initialized or missing updateStats method");
            }
        } catch (error) {
            console.error("Error saving game session:", error);
        }
    } else {
        console.error("Game session not initialized - progress will not be saved");
    }

    const finalScore = document.getElementById('finalScore');
    const survivalStats = document.getElementById('survival-stats');
    const gameOverElement = document.getElementById('gameOver');
    const gameOverTitle = gameOverElement.querySelector('h1');
    const restartBtn = document.getElementById('restartBtn');
    const returnToMenuBtn = document.getElementById('returnToMenuBtn');
    
    // Reset title and show return to menu button
    gameOverTitle.textContent = 'GAME OVER';
    restartBtn.style.display = 'none';
    returnToMenuBtn.style.display = 'block';
    
    if (currentGameMode === GAME_MODES.SURVIVAL) {
        const killsText = waveTotalEnemies - waveEnemiesRemaining;
        finalScore.innerHTML = `Waves Survived: ${currentWave}<br>Enemies Defeated: ${killsText}`;
        
        // Show survival stats
        if (survivalStats) {
            document.getElementById('highest-wave').textContent = survivialHighScore.wave;
            document.getElementById('total-enemies-defeated').textContent = survivialHighScore.kills;
            survivalStats.style.display = 'block';
        }
        
        // Update high score if needed
        if (killsText > survivialHighScore.kills) {
            survivialHighScore.kills = killsText;
            saveSurvivalHighScore();
        }
        
        // Add survival class to gameOver for special styling
        gameOverElement.classList.add('survival-mode');
    } else {
        finalScore.textContent = `Score: ${score} | Level: ${currentLevel}`;
        
        // Hide survival stats for other modes
        if (survivalStats) {
            survivalStats.style.display = 'none';
        }
        
        // Remove survival class
        gameOverElement.classList.remove('survival-mode');
    }
    
    gameOverElement.style.display = 'flex';
}

function restartGame() {
    // Reset gate opening flag for all game restarts
    gateOpeningTriggered = false;
    
    if (!isGameOver) {
        // If not permanent game over, this is a level restart
        playerLives--; // Decrement lives
        playerHealth = 100; // Restore health
        gameActive = true;
        
        // Keep current level and score, just restore health and reposition
        tank.position.set(0, 0, 0); // Reset tank position at start of current level
        clearEnemies(); // Clear enemies and respawn for current level
        
        if (currentGameMode === GAME_MODES.SURVIVAL) {
            // For survival, reset to start of current wave
            waveEnemiesRemaining = waveTotalEnemies;
            startNewWave(false); // Don't increment wave
        } else {
            // Respawn enemies and obstacles for the current level
            spawnEnemies(scene, enemies, tank, currentLevel);
            clearObstacles();
            spawnObstacles(scene, currentLevel, currentGameMode);
        }
    } else {
        // Complete game reset on permanent game over
        isGameOver = false;
        playerLives = 2; // Reset lives to max
    gameActive = true;
    score = 0;
    playerHealth = currentGameMode === GAME_MODES.TIME_TRIAL ? Infinity : 100;
    gameStarted = false;
    activePowerUps = {};
    
    // Reset level for non-survival modes
    if (currentGameMode !== GAME_MODES.SURVIVAL) {
    currentLevel = 1;
    } else {
        // Reset survival mode variables
        currentWave = 1;
        waveEnemiesRemaining = 0;
        waveTotalEnemies = 0;
        waveInProgress = false;
    }
    
    hasKey = false;
        
        // Reset tank position
        tank.position.set(0, 0, 0);
    
    // Reset time trial timer
    timeTrialStartTime = Date.now();
    const timerDisplay = document.getElementById('time-trial-timer');
    if (timerDisplay) timerDisplay.textContent = "00:00.000";
    }
    
    // Reset HUD elements
    document.getElementById('stats').textContent = `Score: ${score} | Health: ${playerHealth} | Lives: ${playerLives}`;
    
    if (currentGameMode === GAME_MODES.SURVIVAL) {
        document.getElementById('level').textContent = `Wave: ${currentWave}`;
    } else {
    document.getElementById('level').textContent = `Level: ${currentLevel}`;
    }
    
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('power-up-indicator').style.opacity = 0;
    updateHealthBar(currentGameMode === GAME_MODES.TIME_TRIAL ? 100 : playerHealth);
    updateDistanceDisplay(levelLength);
    updateSpeedometer(0); // Reset speedometer
    
    // Display restart message
    if (!isGameOver) {
        displayMessage(`Restarted level ${currentLevel}. Health restored!`, "success");
    }
}

// Clear all enemies from the scene
function clearEnemies() {
    // Remove all enemies from the scene
    enemies.forEach(enemy => {
        if (enemy && enemy.parent) {
        scene.remove(enemy);
    }
    });
    enemies.length = 0;
}

function nextLevel() {
    try {
        console.log(`Starting next level ${currentLevel + 1}`);
        
        // Increment level
        currentLevel++;
        
        // Reset key status and gate opening trigger
        hasKey = false;
        gateOpeningTriggered = false;
        
        // Save time trial best time for the completed level
        if (currentGameMode === GAME_MODES.TIME_TRIAL) {
            const levelTime = Date.now() - timeTrialStartTime;
            if (levelTime < timeTrialBestTimes[currentLevel - 1]) {
                timeTrialBestTimes[currentLevel - 1] = levelTime;
                saveBestTimes();
                updateBestTimesDisplay();
                displayMessage(`New Best Time! ${formatTime(levelTime)}`, "mission");
            }
            
            // Clear existing checkpoints
            clearCheckpoints(scene);
            
            // Reset time trial timer for new level
            timeTrialStartTime = Date.now();
            const timerDisplay = document.getElementById('time-trial-timer');
            if (timerDisplay) timerDisplay.textContent = "00:00.000";
        }
        
        // Clear existing obstacles and enemies
        clearObstacles(scene);
        clearEnemies();
        
        // Create new set of obstacles for the next level if game is active
        if (gameActive && gameStarted) {
            spawnObstacles(scene, currentLevel, currentGameMode);
            
            if (currentGameMode === GAME_MODES.TIME_TRIAL) {
                // Create new checkpoints for the next level
                createCheckpoints(scene, currentLevel, 'time_trial');
                displayMessage(`Level ${currentLevel} - Race to checkpoints for time bonuses!`, "mission");
            } else {
                displayMessage(`Level ${currentLevel} Starting! Watch for obstacles!`, "mission");
            }
        }
        
        // Update level text
        document.getElementById('level').textContent = `Level: ${currentLevel}`;
        
        // Reset arrays for new level
        projectiles.length = 0;
        window.projectiles = projectiles;
        
        // Respawn tank at start of next level
        tank.position.set(0, 0, 0);
        
        // Reset level start time for key acquisition validation
        scene.userData.levelStartTime = Date.now();
        
        // Spawn enemies for this level
        spawnEnemies(scene, enemies, tank, currentLevel, currentGameMode);
        
        // Apply visual theme for this level
        try {
            applyLevelTheme(currentLevel);
        } catch (e) {
            console.error("Error applying level theme:", e);
        }
    } catch (error) {
        console.error("Error in nextLevel function:", error);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Add a function to apply power-ups
function applyPowerUp(effect) {
    const duration = 15000; // 15 seconds in milliseconds
    
    // Update power-up indicator
    const powerUpIndicator = document.getElementById('power-up-indicator');
    
    switch(effect) {
        case 'speed':
            tank.userData.speedBoost = 2.5; // 2.5x speed boost
            activePowerUps.speed = true;
            
            // Show power-up indicator
            powerUpIndicator.textContent = "SPEED BOOST ACTIVE!";
            powerUpIndicator.style.borderColor = "#ffff00";
            powerUpIndicator.style.textShadow = "0 0 10px rgba(255, 255, 0, 0.8)";
            powerUpIndicator.style.opacity = 1;
            
            // Add visual effect to tank
            if (tank.body) {
                tank.body.material.emissive.setHex(0xffff00);
                tank.body.material.emissiveIntensity = 0.5;
            }
            
            setTimeout(() => { 
                tank.userData.speedBoost = 1;
                activePowerUps.speed = false;
                if (tank.body) {
                    tank.body.material.emissive.setHex(0x000000);
                    tank.body.material.emissiveIntensity = 0;
                }
                updatePowerUpIndicator();
            }, duration);
            
            displayMessage("Speed Boost Activated! (2.5x speed for 15 seconds)", "speed");
            break;
            
        case 'health':
            const healthBoost = 50; // Increased health boost
            playerHealth = Math.min(100, playerHealth + healthBoost);
            updateStats();
            
            // Show power-up indicator briefly
            powerUpIndicator.textContent = "HEALTH RESTORED!";
            powerUpIndicator.style.borderColor = "#00ff00";
            powerUpIndicator.style.textShadow = "0 0 10px rgba(0, 255, 0, 0.8)";
            powerUpIndicator.style.opacity = 1;
            
            // Add healing visual effect
            if (tank.body) {
                tank.body.material.emissive.setHex(0x00ff00);
                tank.body.material.emissiveIntensity = 0.5;
                setTimeout(() => {
                    tank.body.material.emissive.setHex(0x000000);
                    tank.body.material.emissiveIntensity = 0;
                    powerUpIndicator.style.opacity = 0;
                }, 2000);
            }
            
            displayMessage(`Health Restored! +${healthBoost} HP`, "health");
            break;
            
        case 'attack':
            tank.userData.attackBoost = 3; // Triple attack power
            activePowerUps.attack = true;
            
            // Show power-up indicator
            powerUpIndicator.textContent = "ATTACK BOOST ACTIVE!";
            powerUpIndicator.style.borderColor = "#ff0000";
            powerUpIndicator.style.textShadow = "0 0 10px rgba(255, 0, 0, 0.8)";
            powerUpIndicator.style.opacity = 1;
            
            // Add visual effect to tank
            if (tank.body) {
                tank.body.material.emissive.setHex(0xff0000);
                tank.body.material.emissiveIntensity = 0.5;
            }
            
            setTimeout(() => { 
                tank.userData.attackBoost = 1;
                activePowerUps.attack = false;
                if (tank.body) {
                    tank.body.material.emissive.setHex(0x000000);
                    tank.body.material.emissiveIntensity = 0;
                }
                updatePowerUpIndicator();
            }, duration);
            
            displayMessage("Attack Boost Activated! (3x damage for 15 seconds)", "attack");
            break;
    }
}

// Update power-up indicator based on active power-ups
function updatePowerUpIndicator() {
    const powerUpIndicator = document.getElementById('power-up-indicator');
    
    if (activePowerUps.speed && activePowerUps.attack) {
        powerUpIndicator.textContent = "SPEED & ATTACK BOOST ACTIVE!";
        powerUpIndicator.style.borderColor = "#ffff00";
        powerUpIndicator.style.textShadow = "0 0 5px rgba(255, 255, 0, 0.5)";
    } else if (activePowerUps.speed) {
        powerUpIndicator.textContent = "SPEED BOOST ACTIVE!";
        powerUpIndicator.style.borderColor = "#ffff00";
        powerUpIndicator.style.textShadow = "0 0 5px rgba(255, 255, 0, 0.5)";
    } else if (activePowerUps.attack) {
        powerUpIndicator.textContent = "ATTACK BOOST ACTIVE!";
        powerUpIndicator.style.borderColor = "#00ff00";
        powerUpIndicator.style.textShadow = "0 0 5px rgba(0, 255, 0, 0.5)";
    } else {
        powerUpIndicator.style.opacity = 0;
    }
}

// Add a function to display temporary messages
function displayMessage(message, type = "") {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    // Add specific class based on message content or specified type
    if (type === "speed" || message.includes('Speed')) {
        messageDiv.classList.add('speed');
    } else if (type === "health" || message.includes('Health')) {
        messageDiv.classList.add('health');
    } else if (type === "damage" || message.includes('Hit')) {
        messageDiv.classList.add('damage');
    } else if (type === "attack" || message.includes('Attack')) {
        messageDiv.classList.add('attack');
    }
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // Animate in
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 10);
    
    // Fade out and remove after 2 seconds
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 500);
    }, 2000);
}

// Make displayMessage globally available
window.displayMessage = displayMessage;

// Function to update the speedometer
function updateSpeedometer(speed) {
    const speedValue = document.getElementById('speed-value');
    const speedBarFill = document.getElementById('speed-bar-fill');
    
    // Convert speed to absolute value for display
    const absSpeed = Math.abs(Math.round(speed));
    
    // Update text
    speedValue.textContent = `${absSpeed} KPH`;
    
    // Set maximum speed for the bar (adjust as needed)
    const maxSpeed = 160; // Higher max for the new system
    const percentage = Math.min(100, (absSpeed / maxSpeed) * 100);
    
    // Update speed bar with smooth transition
    speedBarFill.style.width = `${percentage}%`;
    
    // Change color based on speed
    if (absSpeed > 120) {
        speedBarFill.style.background = 'linear-gradient(to right, #ff6600, #ff0000)';
        speedValue.style.color = '#ff0000';
        speedValue.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
    } else if (absSpeed > 80) {
        speedBarFill.style.background = 'linear-gradient(to right, #ffff00, #ff6600)';
        speedValue.style.color = '#ffff00';
        speedValue.style.textShadow = '0 0 10px rgba(255, 255, 0, 0.7)';
    } else if (absSpeed > 40) {
        speedBarFill.style.background = 'linear-gradient(to right, #00ff00, #ffff00)';
        speedValue.style.color = '#00ff00';
        speedValue.style.textShadow = '0 0 10px rgba(0, 255, 0, 0.7)';
    } else {
        speedBarFill.style.background = 'linear-gradient(to right, #00aaff, #00ff00)';
        speedValue.style.color = '#00ffff';
        speedValue.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.7)';
    }
    
    // Add direction indicator if needed
    if (speed < 0) {
        speedValue.textContent += ' (R)'; // R for reverse
    }
}

// Add a function to apply visual themes based on level
function applyLevelTheme(level) {
    console.log(`Applying level theme for level ${level}`);
    
    // Ensure window.eiffelTowers exists before proceeding with billboard updates
    if (!window.eiffelTowers || !Array.isArray(window.eiffelTowers)) {
        console.warn("eiffelTowers not available or not an array - skipping billboard updates");
        window.eiffelTowers = [];
    }
    
    // Apply environment changes based on level
    switch(level) {
        case 2:
            // Neon city theme - change colors and lighting
            scene.background = new THREE.Color(0x000033); // Deep blue
            
            // Update scene lighting
            scene.children.forEach(child => {
                // Change ambient light color
                if (child instanceof THREE.AmbientLight) {
                    child.color.set(0x6600aa); // Purple ambient
                    child.intensity = 0.6;
                }
                
                // Change directional light
                if (child instanceof THREE.DirectionalLight) {
                    child.color.set(0xff66ff); // Pink directional
                    child.intensity = 1.2;
                }
                
                // Add fog for atmosphere
                scene.fog = new THREE.FogExp2(0x220033, 0.005);
            });
            
            // Update cloud colors if atmosphere exists
            if (window.atmosphere && window.atmosphere.clouds) {
                window.atmosphere.clouds.children.forEach(cloud => {
                    cloud.children.forEach(part => {
                        if (part.material) {
                            part.material.color.set(0x6633ff);
                            if (part.material.emissive) {
                                part.material.emissive.set(0x220077);
                            }
                        }
                    });
                });
            }
            
            // Update billboard sponsor texts with level-appropriate content
            if (window.eiffelTowers && window.eiffelTowers.length > 0) {
                const level2Sponsors = [
                    "LEVEL 2 ARENA", 
                    "NEON DISTRICT", 
                    "CYBER ZONE",
                    "DANGER AHEAD",
                    "NO ESCAPE",
                    "BOSS FIGHT SOON"
                ];
                
                window.eiffelTowers.forEach((tower, i) => {
                    if (tower && tower.billboard && tower.billboard.material && tower.billboard.material.map) {
                        // Draw new text on the billboard's canvas
                        const texture = tower.billboard.material.map;
                        if (texture && texture.image) {
                            const ctx = texture.image.getContext('2d');
                            ctx.clearRect(0, 0, texture.image.width, texture.image.height);
                            
                            // Background gradient
                            const gradient = ctx.createLinearGradient(0, 0, 0, texture.image.height);
                            gradient.addColorStop(0, '#330066');
                            gradient.addColorStop(1, '#660033');
                            ctx.fillStyle = gradient;
                            ctx.fillRect(0, 0, texture.image.width, texture.image.height);
                            
                            // Border
                            ctx.strokeStyle = '#ff00ff';
                            ctx.lineWidth = 20;
                            ctx.strokeRect(10, 10, texture.image.width - 20, texture.image.height - 20);
                            
                            // Text
                            const sponsor = level2Sponsors[i % level2Sponsors.length];
                            ctx.font = 'bold 120px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            // Glowing text effect
                            ctx.fillStyle = '#ff00ff';
                            ctx.fillText(sponsor, texture.image.width/2, texture.image.height/2);
                            
                            // Set texture to update
                            texture.needsUpdate = true;
                        }
                    }
                });
            }
            break;
            
        case 3:
            // Apocalyptic theme
            scene.background = new THREE.Color(0x331100); // Burnt orange
            
            // Update scene lighting for fire-like effect
            scene.children.forEach(child => {
                if (child instanceof THREE.AmbientLight) {
                    child.color.set(0xff3300); // Orange ambient
                    child.intensity = 0.7;
                }
                
                if (child instanceof THREE.DirectionalLight) {
                    child.color.set(0xffcc00); // Yellow directional
                    child.intensity = 1.0;
                }
            });
            
            // Add fog effect
            scene.fog = new THREE.FogExp2(0x220000, 0.008);
            
            // Update clouds to look like smoke
            if (window.atmosphere && window.atmosphere.clouds) {
                window.atmosphere.clouds.children.forEach(cloud => {
                    cloud.children.forEach(part => {
                        if (part.material) {
                            part.material.color.set(0x444444);
                            if (part.material.emissive) {
                                part.material.emissive.set(0x220000);
                            }
                            part.material.opacity = 0.9;
                        }
                    });
                });
            }
            
            // Update billboards
            if (window.eiffelTowers && window.eiffelTowers.length > 0) {
                const level3Sponsors = [
                    "FINAL STAGE", 
                    "APOCALYPSE", 
                    "BOSS AHEAD",
                    "SURVIVE OR DIE",
                    "NO RETURN",
                    "FINAL BATTLE"
                ];
                
                window.eiffelTowers.forEach((tower, i) => {
                    if (tower && tower.billboard && tower.billboard.material && tower.billboard.material.map) {
                        const texture = tower.billboard.material.map;
                        if (texture && texture.image) {
                            const ctx = texture.image.getContext('2d');
                            ctx.clearRect(0, 0, texture.image.width, texture.image.height);
                            
                            // Background
                            const gradient = ctx.createLinearGradient(0, 0, 0, texture.image.height);
                            gradient.addColorStop(0, '#330000');
                            gradient.addColorStop(1, '#ff3300');
                            ctx.fillStyle = gradient;
                            ctx.fillRect(0, 0, texture.image.width, texture.image.height);
                            
                            // Border with fire effect
                            ctx.strokeStyle = '#ff6600';
                            ctx.lineWidth = 20;
                            ctx.strokeRect(10, 10, texture.image.width - 20, texture.image.height - 20);
                            
                            // Text
                            const sponsor = level3Sponsors[i % level3Sponsors.length];
                            ctx.font = 'bold 120px Impact';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            // Glowing text
                            ctx.fillStyle = '#ffcc00';
                            ctx.fillText(sponsor, texture.image.width/2, texture.image.height/2);
                            
                            texture.needsUpdate = true;
                        }
                    }
                });
            }
            break;
            
        default:
            // Reset to original theme when going beyond level 3 or if there's an error
            scene.background = new THREE.Color(0x000022);
            scene.fog = null;
            
            // Reset lighting
            scene.children.forEach(child => {
                if (child instanceof THREE.AmbientLight) {
                    child.color.set(0x404040);
                    child.intensity = 1.0;
                }
                
                if (child instanceof THREE.DirectionalLight) {
                    child.color.set(0xffffff);
                    child.intensity = 0.8;
                }
            });
            
            // Reset cloud colors
            if (window.atmosphere && window.atmosphere.clouds) {
                window.atmosphere.clouds.children.forEach(cloud => {
                    cloud.children.forEach(part => {
                        if (part.material) {
                            part.material.color.set(0xffffff);
                            if (part.material.emissive) {
                                part.material.emissive.set(0x333333);
                            }
                        }
                    });
                });
            }
            break;
    }
}

// Add these functions after createGameModeUI

function createGameModeUI() {
    // Load best times (we still need this data)
    loadBestTimes();
    
    // Load survival high scores (we still need this data)
    loadSurvivalHighScore();
}

function switchGameMode(mode) {
    // Skip if we're already in this mode
    if (currentGameMode === mode) return;
    
    // Update game mode
    currentGameMode = mode;
    
    // Reset game state for new mode
    if (tank && tank.userData) {
        tank.userData.gameMode = mode;
    }
    
    // Time Trial specific setup
    if (mode === GAME_MODES.TIME_TRIAL) {
        // Load best times from localStorage
        loadBestTimes();
        
        // Show a special message for time trial mode
        if (!gameStarted) {
            displayMessage("Time Trial Mode: Race through checkpoints to earn time bonuses!", "mission");
            
            // Also show checkpoint info
            setTimeout(() => {
                showCheckpointInfo();
            }, 2000);
        }
    } 
    // Survival mode specific setup
    else if (mode === GAME_MODES.SURVIVAL) {
        // Load survival high score
        loadSurvivalHighScore();
        
        // Enhanced player stats for survival mode
        playerMaxHealth = 200; // Set max health first
        playerHealth = playerMaxHealth; // Then set current health to max
        playerLives = 3; // Extra life
        
        // Add survival mode power-ups
        if (tank) {
            tank.userData.survivalBuffs = {
                damageMultiplier: 1.5,  // 50% more damage
                speedMultiplier: 1.2,   // 20% faster movement
                armorMultiplier: 1.3    // 30% damage reduction
            };
            
            // Increase tank speed for better maneuverability
            tank.speed *= tank.userData.survivalBuffs.speedMultiplier;
            tank.rotationSpeed *= 1.2; // 20% faster rotation
            
            // Update tank visuals to show enhanced state
            if (tank.body && tank.body.material) {
                tank.body.material.emissiveIntensity = 0.5;
                tank.body.material.emissive.setHex(0x00ff00);
            }
        }
        
        // Reset wave variables
        currentWave = 1;
        waveInProgress = false;
        waveEnemiesRemaining = 0;
        waveTotalEnemies = 0;
        window.waveFullySpawned = false;
        
        // Show special message for survival mode
        displayMessage("Enhanced Survival Mode: Defeat endless waves of enemies across the arena!", "mission");
            setTimeout(() => {
            displayMessage("Your tank has been upgraded with enhanced armor and firepower!", "mission");
        }, 2000);
        setTimeout(() => {
            displayMessage("Watch out for bosses every 3 waves - they're more powerful than ever!", "warning");
        }, 4000);
        
        // Start first wave immediately if game is already started
        if (gameStarted && gameActive) {
            console.log("Starting first wave in survival mode");
            startNewWave(false); // false means don't increment wave number
        }
    }
    // Normal mode
    else {
        // Reset to normal stats
        playerMaxHealth = 100; // Set max health first
        playerHealth = playerMaxHealth; // Then set current health to max
        playerLives = 2;
        
        // Remove survival buffs if they exist
        if (tank && tank.userData.survivalBuffs) {
            tank.speed /= tank.userData.survivalBuffs.speedMultiplier;
            tank.rotationSpeed /= 1.2;
            delete tank.userData.survivalBuffs;
            
            // Reset tank visuals
            if (tank.body && tank.body.material) {
                tank.body.material.emissiveIntensity = 0.3;
                tank.body.material.emissive.setHex(0x000000);
            }
        }
        
        // Show normal mode message
        if (!gameStarted) {
            displayMessage("Normal Mode: Reach the tollgate to advance to the next level!", "mission");
        }
    }
    
    // Update health display
    updateStats();
    
    // If game is already started, we need to respawn enemies/obstacles for the new mode
    if (gameStarted) {
        // Clear existing enemies
        clearEnemies();
        
        // Respawn enemies for new mode
        if (mode !== GAME_MODES.SURVIVAL) { // Don't spawn here for survival mode as it's handled by startNewWave
        spawnEnemies(scene, enemies, tank, currentLevel, mode);
        }
    }
}

// Display information about the Obstacle Gauntlet feature
function showObstacleGauntletInfo() {
    // Remove any existing modal
    const existingModal = document.getElementById('obstacle-gauntlet-info');
    if (existingModal) existingModal.remove();
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'obstacle-gauntlet-info';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '500px';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    modal.style.border = '2px solid #ff9900';
    modal.style.borderRadius = '10px';
    modal.style.padding = '20px';
    modal.style.color = 'white';
    modal.style.fontFamily = 'Arial, sans-serif';
    modal.style.zIndex = '2000';
    modal.style.boxShadow = '0 0 20px rgba(255, 153, 0, 0.5)';
    
    // Add content with details for both game modes
    modal.innerHTML = `
        <h2 style="color: #ff9900; text-align: center; margin-top: 0;">RANDOMIZED OBSTACLE GAUNTLET</h2>
        <p>Each run spawns a unique set of obstacles that will test your driving skills!</p>
        
        <div style="margin: 15px 0;">
            <h3 style="color: #ff6600;">Obstacle Types:</h3>
            <ul style="list-style-type: none; padding-left: 10px;">
                <li style="margin-bottom: 10px;"><span style="color: #ff3300; font-weight: bold;">Barriers</span> - Static obstacles that block part of the road. Drive around them!</li>
                <li style="margin-bottom: 10px;"><span style="color: #00aaff; font-weight: bold;">Moving Walls</span> - Walls that shift from side to side. Time your approach!</li>
                <li style="margin-bottom: 10px;"><span style="color: #ffaa00; font-weight: bold;">Gates</span> - Narrow passages that require precision driving.</li>
                <li style="margin-bottom: 10px;"><span style="color: #00ff00; font-weight: bold;">Ramps</span> - Drive over these at high speed for a velocity boost!</li>
                <li style="margin-bottom: 10px;"><span style="color: #ff0000; font-weight: bold;">Spinners</span> - Rotating obstacles that require careful timing to pass safely.</li>
            </ul>
        </div>
        
        <div style="margin: 15px 0;">
            <h3 style="color: #ff6600;">Game Mode Differences:</h3>
            <p><span style="color: #ffffff; font-weight: bold;">Time Trial Mode:</span> More obstacles with increasing difficulty. You're invincible, so focus on speed!</p>
            <p><span style="color: #ffffff; font-weight: bold;">Normal Mode:</span> Fewer obstacles that are more forgiving. Balance combat with navigation!</p>
        </div>
        
        <p>Each level increases the number and difficulty of obstacles. Plan your route carefully!</p>
        
        <div style="text-align: center; margin-top: 20px;">
            <button id="close-obstacle-info" style="background-color: #ff9900; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">Got It!</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener to close button
    document.getElementById('close-obstacle-info').addEventListener('click', () => {
        modal.remove();
    });
    
    // Auto-close after 15 seconds
    setTimeout(() => {
        if (document.getElementById('obstacle-gauntlet-info')) {
            document.getElementById('obstacle-gauntlet-info').remove();
        }
    }, 15000);
}

function formatTime(milliseconds) {
    if (milliseconds === Infinity) return "Not Set";
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function updateTimeTrialTimer() {
    if (currentGameMode !== GAME_MODES.TIME_TRIAL || !gameStarted || isGamePaused) return;
    
    const elapsedTime = Date.now() - timeTrialStartTime;
    const formattedTime = formatTime(elapsedTime);
    
    const timerElement = document.getElementById('time-trial-timer');
    if (timerElement) {
        timerElement.textContent = formattedTime;
        
        // Update menu stats with time trial time
        updateMenuStats({
            currentTime: formattedTime
        });
    }
    
    // Update the timer every 10ms for smooth display
    setTimeout(updateTimeTrialTimer, 10);
}

function loadBestTimes() {
    const saved = localStorage.getItem('timeTrialBestTimes');
    if (saved) {
        try {
            const parsedTimes = JSON.parse(saved);
            timeTrialBestTimes = parsedTimes;
        } catch (e) {
            console.error("Failed to parse saved best times:", e);
        }
    }
}

function saveBestTimes() {
    try {
        localStorage.setItem('timeTrialBestTimes', JSON.stringify(timeTrialBestTimes));
    } catch (e) {
        console.error("Failed to save best times:", e);
    }
}

function updateBestTimesDisplay() {
    const container = document.getElementById('best-times-container');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;margin-bottom:5px;"><b>BEST TIMES</b></div>';
    
    for (let i = 1; i <= 3; i++) {
        const timeDisplay = document.createElement('div');
        timeDisplay.style.display = 'flex';
        timeDisplay.style.justifyContent = 'space-between';
        timeDisplay.style.margin = '2px 0';
        
        const levelLabel = document.createElement('span');
        levelLabel.textContent = `Level ${i}:`;
        timeDisplay.appendChild(levelLabel);
        
        const time = document.createElement('span');
        time.textContent = formatTime(timeTrialBestTimes[i]);
        time.style.fontWeight = 'bold';
        time.style.color = timeTrialBestTimes[i] === Infinity ? '#999' : '#FFFF00';
        timeDisplay.appendChild(time);
        
        container.appendChild(timeDisplay);
    }
}

function addReplayAnalysisButton() {
    const container = document.getElementById('game-mode-container');
    if (!container) return;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.gap = '5px';
    
    const replayAnalysisBtn = document.createElement('button');
    replayAnalysisBtn.textContent = 'Replay Analysis';
    replayAnalysisBtn.className = 'mode-button';
    replayAnalysisBtn.style.padding = '5px 10px';
    replayAnalysisBtn.style.backgroundColor = '#333';
    replayAnalysisBtn.style.border = 'none';
    replayAnalysisBtn.style.borderRadius = '3px';
    replayAnalysisBtn.style.cursor = 'pointer';
    replayAnalysisBtn.style.flex = '1';
    replayAnalysisBtn.onclick = () => switchGameMode(GAME_MODES.REPLAY_ANALYSIS);
    buttonContainer.appendChild(replayAnalysisBtn);
    
    container.appendChild(buttonContainer);
}

// Create replay browser UI
function showReplayBrowser(replayList) {
    // Remove existing browser if present
    const existingBrowser = document.getElementById('replay-browser');
    if (existingBrowser) existingBrowser.remove();
    
    // Create a list of available replays
    const replays = replayList || getReplayList();
    
    // Create container
    let container = document.getElementById('replay-browser');
    if (!container) {
        container = document.createElement('div');
        container.id = 'replay-browser';
        container.className = 'replay-panel';
        document.body.appendChild(container);
    }
    
    // Add CSS if not already added
    if (!document.getElementById('replay-styles')) {
        const style = document.createElement('style');
        style.id = 'replay-styles';
        style.textContent = `
            .replay-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 600px;
                background-color: rgba(0, 0, 0, 0.9);
                border: 2px solid #00aaff;
                border-radius: 10px;
                color: white;
                font-family: Arial, sans-serif;
                z-index: 2000;
                padding: 20px;
                box-shadow: 0 0 20px rgba(0, 170, 255, 0.5);
            }
            
            .replay-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #00aaff;
                padding-bottom: 10px;
            }
            
            .replay-header h2 {
                margin: 0;
                color: #00aaff;
            }
            
            .replay-close {
                cursor: pointer;
                font-size: 24px;
                color: #ff3333;
            }
            
            .replay-list {
                max-height: 300px;
                overflow-y: auto;
                margin-bottom: 20px;
            }
            
            .replay-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                margin-bottom: 5px;
                background-color: rgba(0, 50, 80, 0.7);
                border-radius: 5px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .replay-item:hover {
                background-color: rgba(0, 80, 120, 0.7);
            }
            
            .replay-item-details {
                display: flex;
                flex-direction: column;
            }
            
            .replay-item-title {
                font-weight: bold;
                color: #00ffff;
            }
            
            .replay-item-stats {
                font-size: 0.9em;
                color: #aaddff;
            }
            
            .replay-actions {
                display: flex;
                justify-content: center;
                gap: 15px;
            }
            
            .replay-actions button {
                background-color: #006699;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                transition: background-color 0.2s;
            }
            
            .replay-actions button:hover {
                background-color: #0088cc;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Build the UI
    container.innerHTML = `
        <div class="replay-header">
            <h2>Replay Analysis Browser</h2>
            <div class="replay-close" onclick="document.getElementById('replay-browser').remove()">�</div>
        </div>
        <div class="replay-list">
            ${replays.length === 0 ? 
              '<div style="text-align:center;padding:20px;">No replays available yet. Complete a run first!</div>' : 
              replays.map((replay, index) => `
                <div class="replay-item" onclick="window.loadAndShowReplay(${replay.id})">
                    <div class="replay-item-details">
                        <div class="replay-item-title">Level ${replay.level} - ${new Date(replay.date).toLocaleString()}</div>
                        <div class="replay-item-stats">
                            Time: ${formatTime(replay.completionTime)} | 
                            Max Speed: ${Math.round(replay.maxSpeed)} KPH | 
                            Shots: ${replay.totalShots}
                        </div>
                    </div>
                    <div>?</div>
                </div>
              `).join('')}
        </div>
        <div class="replay-actions">
            <button onclick="document.getElementById('replay-browser').remove()">Close</button>
        </div>
    `;
    
    // Make sure loadAndShowReplay is available globally
    window.loadAndShowReplay = function(replayId) {
        container.remove();
        import('./replay.js').then(module => {
            module.loadReplay(replayId);
            module.showReplayAnalysis();
        });
    };
    
    // Show the container
    container.style.display = 'block';
}

// Display information about the checkpoint system
function showCheckpointInfo() {
    // Remove any existing modal
    const existingModal = document.getElementById('checkpoint-info-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'checkpoint-info-modal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '480px';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    modal.style.border = '2px solid #00ffff';
    modal.style.borderRadius = '10px';
    modal.style.padding = '20px';
    modal.style.color = 'white';
    modal.style.fontFamily = 'Arial, sans-serif';
    modal.style.zIndex = '2000';
    modal.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
    
    modal.innerHTML = `
        <h2 style="color: #00ffff; text-align: center; margin-top: 0;">CHECKPOINT TIME BONUSES</h2>
        
        <p>Race against the clock and pass through checkpoints to earn time deductions!</p>
        
        <div style="margin: 15px 0;">
            <h3 style="color: #00cccc;">How It Works:</h3>
            <ul style="list-style-type: none; padding-left: 10px;">
                <li style="margin-bottom: 10px;"><span style="color: #00ffff; font-weight: bold;">Timed Gates</span> - Glowing blue checkpoints are placed throughout each level.</li>
                <li style="margin-bottom: 10px;"><span style="color: #00ffff; font-weight: bold;">Time Bonus</span> - Reach each checkpoint before its target time to earn a ${CHECKPOINT_TIME_BONUS/1000} second reduction from your total time.</li>
                <li style="margin-bottom: 10px;"><span style="color: #00ffff; font-weight: bold;">Visual Feedback</span> - Checkpoints turn green when you earn the bonus, or red when you miss the target time.</li>
                <li style="margin-bottom: 10px;"><span style="color: #00ffff; font-weight: bold;">Increasing Difficulty</span> - Each level has tighter time requirements for checkpoints.</li>
            </ul>
        </div>
        
        <p>Collect all time bonuses to achieve the fastest possible completion time!</p>
        
        <div style="text-align: center; margin-top: 20px;">
            <button id="close-checkpoint-info" style="background-color: #00aaff; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">Got It!</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener to close button
    document.getElementById('close-checkpoint-info').addEventListener('click', () => {
        modal.remove();
    });
    
    // Auto-close after 12 seconds
    setTimeout(() => {
        if (document.getElementById('checkpoint-info-modal')) {
            document.getElementById('checkpoint-info-modal').remove();
        }
    }, 12000);
}

// Play checkpoint sound
function playCheckpointSound(success) {
    // This could be connected to an audio system later
    if (success) {
        console.log('Checkpoint success sound');
    } else {
        console.log('Checkpoint missed sound');
    }
}

// Initialize mobile controls
function initMobileControls() {
    // D-pad buttons
    const dpadUp = document.getElementById('dpad-up');
    const dpadDown = document.getElementById('dpad-down');
    const dpadLeft = document.getElementById('dpad-left');
    const dpadRight = document.getElementById('dpad-right');
    const shootBtn = document.getElementById('shoot-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const playBtn = document.getElementById('play-btn');
    const hudToggleBtn = document.getElementById('hud-toggle-btn');
    
    // Let's ensure all buttons exist before setting up event handlers
    if (!dpadUp || !dpadDown || !dpadLeft || !dpadRight || !shootBtn || !pauseBtn || !playBtn || !hudToggleBtn) {
        console.error("Mobile controls not found in the DOM");
        return;
    }
    
    // Toggle HUD visibility on dedicated button 
    hudToggleBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        isHudVisible = !isHudVisible;
        document.getElementById('hud').classList.toggle('visible', isHudVisible);
        this.classList.toggle('active', isHudVisible);
    });
    
    // Also support mouse clicks for iPad with mouse/trackpad
    hudToggleBtn.addEventListener('click', function(e) {
        isHudVisible = !isHudVisible;
        document.getElementById('hud').classList.toggle('visible', isHudVisible);
        this.classList.toggle('active', isHudVisible);
    });
    
    // D-pad controls - touch events
    const setupDpadButton = (button, keyCode) => {
        let isActive = false;
        
        // Prevent default on touch events to avoid scrolling/zooming
        const preventDefaultTouch = (e) => {
            if (e && e.preventDefault) {
                e.preventDefault();
            }
            if (e && e.stopPropagation) {
                e.stopPropagation();
            }
            return false;
        };
        
        button.addEventListener('touchstart', function(e) {
            preventDefaultTouch(e);
            isActive = true;
            this.classList.add('active');
            
            // Simulate key press
            const event = new KeyboardEvent('keydown', { key: keyCode });
            window.dispatchEvent(event);
        }, { passive: false });
        
        button.addEventListener('touchend', function(e) {
            preventDefaultTouch(e);
            isActive = false;
            this.classList.remove('active');
            
            // Simulate key release
            const event = new KeyboardEvent('keyup', { key: keyCode });
            window.dispatchEvent(event);
        }, { passive: false });
        
        button.addEventListener('touchcancel', function(e) {
            preventDefaultTouch(e);
            if (isActive) {
                isActive = false;
                this.classList.remove('active');
                
                // Simulate key release
                const event = new KeyboardEvent('keyup', { key: keyCode });
                window.dispatchEvent(event);
            }
        }, { passive: false });
        
        // For iPad with mouse support
        button.addEventListener('mousedown', function(e) {
            isActive = true;
            this.classList.add('active');
            
            // Simulate key press
            const event = new KeyboardEvent('keydown', { key: keyCode });
            window.dispatchEvent(event);
        });
        
        button.addEventListener('mouseup', function(e) {
            isActive = false;
            this.classList.remove('active');
            
            // Simulate key release
            const event = new KeyboardEvent('keyup', { key: keyCode });
            window.dispatchEvent(event);
        });
        
        // Handle case when cursor leaves the button while pressed
        button.addEventListener('mouseleave', function(e) {
            if (isActive) {
                isActive = false;
                this.classList.remove('active');
                
                // Simulate key release
                const event = new KeyboardEvent('keyup', { key: keyCode });
                window.dispatchEvent(event);
            }
        });
    };
    
    // Setup D-pad buttons
    setupDpadButton(dpadUp, 'ArrowUp');
    setupDpadButton(dpadDown, 'ArrowDown');
    setupDpadButton(dpadLeft, 'ArrowLeft');
    setupDpadButton(dpadRight, 'ArrowRight');
    
    // Shoot button
    let isShooting = false;
    let shootInterval;
    
    const startShooting = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        shootBtn.classList.add('active');
        isShooting = true;
        
        // Initial shot
        const event = new KeyboardEvent('keydown', { key: ' ' });
        window.dispatchEvent(event);
        
        // Continuous shooting (auto-fire)
        shootInterval = setInterval(() => {
            const event = new KeyboardEvent('keydown', { key: ' ' });
            window.dispatchEvent(event);
        }, 200); // Slightly slower than keyboard control
    };
    
    const stopShooting = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        shootBtn.classList.remove('active');
        isShooting = false;
        clearInterval(shootInterval);
        
        // Release space key
        const event = new KeyboardEvent('keyup', { key: ' ' });
        window.dispatchEvent(event);
    };
    
    // Touch events for shooting
    shootBtn.addEventListener('touchstart', startShooting, { passive: false });
    shootBtn.addEventListener('touchend', stopShooting, { passive: false });
    shootBtn.addEventListener('touchcancel', stopShooting, { passive: false });
    
    // Mouse events for shooting (iPad with mouse)
    shootBtn.addEventListener('mousedown', startShooting);
    shootBtn.addEventListener('mouseup', stopShooting);
    shootBtn.addEventListener('mouseleave', function(e) {
        if (isShooting) {
            stopShooting(e);
        }
    });
    
    // Game control buttons for pause/play - Fixed to use exported functions
    pauseBtn.addEventListener('touchstart', function(e) {
        if (e && e.preventDefault) e.preventDefault();
        pauseGame(); // Call the exported function
    }, { passive: false });
    
    playBtn.addEventListener('touchstart', function(e) {
        if (e && e.preventDefault) e.preventDefault();
        resumeGame(); // Call the exported function 
    }, { passive: false });
    
    // Mouse events for game controls (iPad with mouse)
    pauseBtn.addEventListener('click', function(e) {
        pauseGame(); // Call the exported function
    });
    
    playBtn.addEventListener('click', function(e) {
        resumeGame(); // Call the exported function
    });
    
    // Initial state
    playBtn.style.display = 'none'; // Hide play button initially
    
    // Disable page scrolling/zooming on touchmove for the game area
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('canvas') || e.target.closest('#mobile-controls')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // For iPad Safari - prevent bouncing/scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
}

// Export the pause/resume functions for other modules
export function pauseGame() {
        isGamePaused = true;
    clock.stop();
        showPauseOverlay(true);
    
    // Pause background music
    audioManager.stopBackgroundMusic();
    
    // Update menu to show pause state
    updateMenuStats({
        isPaused: true
    });
}

export function resumeGame() {
        isGamePaused = false;
    clock.start();
        showPauseOverlay(false);
    
    // Resume background music
    audioManager.startBackgroundMusic();
    
    // Update menu to show resume state
    updateMenuStats({
        isPaused: false
    });
    
    // Resume animation loop if it was stopped
    if (!gameActive) {
        gameActive = true;
        animate();
    }
}

// Function to show/hide the pause overlay
function showPauseOverlay(show) {
    let pauseOverlay = document.getElementById('pause-overlay');
    
    if (!pauseOverlay && show) {
        // Create pause overlay if it doesn't exist
        pauseOverlay = document.createElement('div');
        pauseOverlay.id = 'pause-overlay';
        
        // Different content based on device type
        if (isMobileDevice) {
            pauseOverlay.innerHTML = `
                <div class="pause-content">
                    <h2>GAME PAUSED</h2>
                    <button id="resume-btn">TAP TO RESUME</button>
                </div>
            `;
        } else {
            pauseOverlay.innerHTML = `
                <div class="pause-content">
                    <h2>GAME PAUSED</h2>
                    <button id="resume-btn">RESUME</button>
                    <p>Press 'P' or click Resume to continue</p>
                </div>
            `;
        }
        
        document.body.appendChild(pauseOverlay);
        
        // Add click/touch event to resume button
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) {
            if (isMobileDevice) {
                // For mobile, add touchstart event with preventDefault to avoid double events
                resumeBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    resumeGame();
                }, { passive: false });
            }
            
            // Always add click for universal support
            resumeBtn.addEventListener('click', function() {
                resumeGame();
            });
        }
        
        // Make the entire overlay clickable/touchable on mobile
        if (isMobileDevice) {
            pauseOverlay.addEventListener('touchstart', function(e) {
                // Only resume if the target is not the resume button (to avoid double triggers)
                if (e.target.id !== 'resume-btn') {
                    e.preventDefault();
                    resumeGame();
                }
            }, { passive: false });
        }
    }
    
    if (pauseOverlay) {
        pauseOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Add survival mode-specific functions
function startNewWave(incrementWave = true) {
    // Only start new wave if game is active and started
    if (!gameActive || !gameStarted) {
        console.log("Cannot start wave: game not active or not started", { gameActive, gameStarted });
        return;
    }

    console.log("Starting wave, current state:", { 
        gameActive, 
        gameStarted, 
        isGamePaused,
        currentWave,
        incrementWave 
    });
    
    // Increment wave number if specified
    if (incrementWave) {
        currentWave++;
    }
    
    // Setup wave meta data
    waveInProgress = true;
    waveStartTime = Date.now();
    
    // Reset wave spawning flag
    window.waveFullySpawned = false;
    
    // Clear existing enemies
    clearEnemies();
    
    // Force enemies array to be empty
    enemies.length = 0;
    
    // Spawn wave enemies using the spawnEnemies function
    // Pass currentWave as the level parameter and 'survival' as the game mode
    const spawnedCount = spawnEnemies(scene, enemies, tank, currentWave, 'survival');
    
    // Update wave counters based on actual spawned enemies
    waveTotalEnemies = spawnedCount;
    waveEnemiesRemaining = spawnedCount;
    
    // Mark wave as fully spawned
    window.waveFullySpawned = true;
    
    // Update wave display
    updateWaveProgress();
    
    // Display wave start message with actual enemy count
    const hasBoss = currentWave % 3 === 0;
        displayMessage(`Wave ${currentWave} started! Enemies: ${waveTotalEnemies}${hasBoss ? ' (includes Boss)' : ''}`, "mission");
    
    console.log(`Wave ${currentWave} started with ${spawnedCount} enemies`);
}

function spawnWaveEnemies(scene, enemies, tank, wave, count, hasBoss) {
    // Calculate enemy difficulty level based on wave number
    // Every 5 waves increases the effective "level" of enemies
    const effectiveLevel = Math.min(3, Math.floor(wave / 5) + 1);
    
    console.log(`Spawning wave ${wave} with ${count} enemies (level ${effectiveLevel}) and boss: ${hasBoss}`);
    
    // Mark wave as not fully spawned yet
    window.waveFullySpawned = false;
    
    // Keep track of successful spawns
    let successfulSpawns = 0;
    
    // Spawn regular enemies
    for (let i = 0; i < count; i++) {
        // Spawn in a circle around the player but ensure visibility
        // Use multiple rings of enemies to prevent clumping
        const ringIndex = Math.floor(i / 10); // Every 10 enemies form a new ring
        const baseDistance = 30 + (ringIndex * 15); // Base distance increases with each ring
        const angle = (i % 10) * (Math.PI * 2 / 10) + (Math.random() * 0.5); // Evenly distribute with small randomization
        const distance = baseDistance + (Math.random() * 10); // Add randomness to distance
        
        const xPos = tank.position.x + Math.cos(angle) * distance;
        const zPos = tank.position.z + Math.sin(angle) * distance;
        
        // Create enemy with appropriate level
        const enemy = createEnemy(scene, enemies, false, zPos, xPos, effectiveLevel);
        
        // Verify enemy was created successfully
        if (enemy) {
            successfulSpawns++;
            
            // Add visual spawn effect
            addSpawnEffect(scene, xPos, zPos);
            
            // Set enemy behavior specifically for survival mode
            if (wave > 5) {
                // Higher waves have more aggressive enemies
                const aggressiveChance = Math.min(0.7, 0.3 + (wave * 0.05)); // Increases with wave, caps at 70%
                if (Math.random() < aggressiveChance) {
                    enemy.currentBehavior = 'charge';
                    enemy.chargeSpeed = enemy.speed * 1.5;
                }
            }
        }
    }
    
    // Spawn boss if needed
    if (hasBoss) {
        // Spawn boss further away but ensure it's in front of the player for visibility
        const angle = Math.random() * (Math.PI / 2) - (Math.PI / 4); // -45� to +45� in front of player
        const distance = 60 + Math.random() * 20; // 60-80 units away
        
        const xPos = tank.position.x + Math.cos(angle) * distance;
        const zPos = tank.position.z + Math.sin(angle) * distance;
        
        // Create boss with scaled difficulty
        const boss = createEnemy(scene, enemies, true, zPos, xPos, effectiveLevel);
        
        if (boss) {
            successfulSpawns++;
            
            // Add epic boss spawn effect
            addBossSpawnEffect(scene, xPos, zPos);
        
        // Scale boss health based on wave
        const bossHealthMultiplier = 1 + (wave * 0.2); // Increase by 20% per wave
        boss.health = Math.floor(boss.health * bossHealthMultiplier);
        
        // Special effects for higher wave bosses
        if (wave >= 10) {
            // Add shield
            const shieldGeometry = new THREE.SphereGeometry(4, 16, 16);
            const shieldMaterial = new THREE.MeshPhongMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.3,
                emissive: 0x0088ff,
                emissiveIntensity: 0.5
            });
            const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
            shield.position.y = 1.5;
            boss.add(shield);
            boss.userData.shield = shield;
            
            // Add teleport ability
            boss.userData.specialAttack = 'teleport';
            boss.userData.lastSpecialAttack = 0;
            boss.userData.specialAttackCooldown = 8000 - (wave * 300); // Reduces cooldown with higher waves
        }
        
        if (wave >= 15) {
            // Add multishot ability
            boss.userData.specialAttack = 'multishot';
            boss.userData.lastSpecialAttack = 0;
            boss.userData.specialAttackCooldown = 5000 - (wave * 200); // Reduces cooldown with higher waves
            }
            
            // Display boss message
            displayMessage(`WAVE ${wave} BOSS APPEARED!`, "warning");
        }
    }
    
    // Flag for ensuring enemies are actually in the scene
    waveTotalEnemies = successfulSpawns;
    waveEnemiesRemaining = successfulSpawns;
    
    // If no enemies were spawned successfully, force at least one enemy
    if (successfulSpawns === 0) {
        // Force spawn one enemy right in front of player
        const forcedXPos = tank.position.x;
        const forcedZPos = tank.position.z + 30; // 30 units in front
        
        const forcedEnemy = createEnemy(scene, enemies, false, forcedZPos, forcedXPos, effectiveLevel);
        if (forcedEnemy) {
            waveTotalEnemies = 1;
            waveEnemiesRemaining = 1;
            console.log("Forced emergency enemy spawn due to 0 successful spawns");
        }
    }
    
    // Update wave progress with the actual number of enemies
    updateWaveProgress();
    
    // Mark wave as fully spawned after spawning all enemies
    window.waveFullySpawned = true;
    console.log(`Wave ${wave} fully spawned with ${enemies.length} enemies (${successfulSpawns} successful)`);
    
    return enemies.length;
}

// Add visual effects for enemy spawning
function addSpawnEffect(scene, x, z) {
    if (!scene) return;
    
    try {
        // Create a particle effect for enemy spawn
        const particleGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.7
        });
        
        const particleSystem = new THREE.Group();
        
        // Create 8 particles in a circle
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(
                Math.cos(angle) * 2,
                0.5,
                Math.sin(angle) * 2
            );
            particle.userData = {
                angle: angle,
                speed: 0.2 + Math.random() * 0.3,
                life: 1.0
            };
            particleSystem.add(particle);
        }
        
        // Position the particle system
        particleSystem.position.set(x, 0, z);
        scene.add(particleSystem);
        
        // Animate and remove after effect is complete
        const startTime = Date.now();
        
        function animateParticles() {
            const elapsed = (Date.now() - startTime) / 1000;
            
            // Remove after 1 second
            if (elapsed > 1) {
                scene.remove(particleSystem);
                return;
            }
            
            // Update particles
            particleSystem.children.forEach(particle => {
                const data = particle.userData;
                
                // Move outward
                particle.position.x += Math.cos(data.angle) * data.speed;
                particle.position.z += Math.sin(data.angle) * data.speed;
                
                // Rise and fall
                particle.position.y = 0.5 + Math.sin(elapsed * Math.PI) * 2;
                
                // Fade out
                particle.material.opacity = 1 - elapsed;
                
                // Scale down
                const scale = 1 - elapsed;
                particle.scale.set(scale, scale, scale);
            });
            
            requestAnimationFrame(animateParticles);
        }
        
        animateParticles();
    } catch (e) {
        console.error("Error creating spawn effect:", e);
    }
}

// Add epic boss spawn effect
function addBossSpawnEffect(scene, x, z) {
    if (!scene) return;
    
    try {
        // Create a more impressive effect for boss spawn
        const ringGeometry = new THREE.RingGeometry(1, 10, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // Lay flat
        ring.position.set(x, 0.5, z);
        scene.add(ring);
        
        // Add pillar of light
        const pillarGeometry = new THREE.CylinderGeometry(0.5, 3, 20, 16);
        const pillarMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.6
        });
        
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(x, 10, z);
        scene.add(pillar);
        
        // Animate and remove
        const startTime = Date.now();
        
        function animateBossEffect() {
            const elapsed = (Date.now() - startTime) / 1000;
            
            // Remove after 2 seconds
            if (elapsed > 2) {
                scene.remove(ring);
                scene.remove(pillar);
                return;
            }
            
            // Ring animation
            ring.scale.set(1 + elapsed * 2, 1 + elapsed * 2, 1);
            ring.material.opacity = 0.8 - (elapsed / 2.5);
            
            // Pillar animation
            pillar.scale.y = 1 + Math.sin(elapsed * 5) * 0.2;
            pillar.rotation.y += 0.1;
            pillar.material.opacity = 0.6 - (elapsed / 3.3);
            
            requestAnimationFrame(animateBossEffect);
        }
        
        animateBossEffect();
        
        // Play boss sound effect if available
        if (window.audioManager && window.audioManager.playSound) {
            window.audioManager.playSound('bossSpawn');
        }
    } catch (e) {
        console.error("Error creating boss spawn effect:", e);
    }
}

function updateWaveProgress() {
    const waveIndicator = document.getElementById('wave-indicator');
    if (!waveIndicator) {
        const indicator = document.createElement('div');
        indicator.id = 'wave-indicator';
        indicator.className = 'wave-indicator active';
        document.body.appendChild(indicator);
    }
    
    const indicator = document.getElementById('wave-indicator');
    indicator.textContent = `Wave ${currentWave} - Enemies: ${waveEnemiesRemaining}/${waveTotalEnemies}`;
    indicator.style.display = 'block';
}

// Add survival high score functions
function loadSurvivalHighScore() {
    const savedWave = localStorage.getItem('highestWave');
    const savedKills = localStorage.getItem('highestEnemiesDefeated');
    
    survivialHighScore = {
        wave: savedWave ? parseInt(savedWave) : 0,
        kills: savedKills ? parseInt(savedKills) : 0
    };
    
    updateSurvivalHighScoreDisplay();
}

function saveSurvivalHighScore() {
    localStorage.setItem('highestWave', survivialHighScore.wave.toString());
    localStorage.setItem('highestEnemiesDefeated', survivialHighScore.kills.toString());
    updateSurvivalHighScoreDisplay();
}

// Properly defined survival mode helper functions
function updateSurvivalHighScoreDisplay() {
    const survivalHighScoreContainer = document.getElementById('survival-high-score');
    if (!survivalHighScoreContainer) return;
    
    survivalHighScoreContainer.style.display = 'block';
    const highestWave = localStorage.getItem('highestWave') || 0;
    const highestEnemiesDefeated = localStorage.getItem('highestEnemiesDefeated') || 0;
    survivalHighScoreContainer.textContent = `BEST: Wave ${highestWave} | ${highestEnemiesDefeated} Enemies`;
}

// Add survival mode helper functions
window.updateBossHealthBar = function(boss) {
    if (!boss) return;
    
    let bossHealthBar = document.getElementById('boss-health-bar');
    let bossHealthContainer = document.getElementById('boss-health-container');
    
    if (!bossHealthContainer) {
        bossHealthContainer = document.createElement('div');
        bossHealthContainer.id = 'boss-health-container';
        bossHealthContainer.style.position = 'absolute';
        bossHealthContainer.style.top = '40px';
        bossHealthContainer.style.left = '50%';
        bossHealthContainer.style.transform = 'translateX(-50%)';
        bossHealthContainer.style.width = '80%';
        bossHealthContainer.style.maxWidth = '400px';
        bossHealthContainer.style.height = '20px';
        bossHealthContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        bossHealthContainer.style.border = '2px solid #ff0000';
        bossHealthContainer.style.zIndex = '10';
        
        const bossLabel = document.createElement('div');
        bossLabel.textContent = 'BOSS';
        bossLabel.style.position = 'absolute';
        bossLabel.style.top = '-25px';
        bossLabel.style.left = '50%';
        bossLabel.style.transform = 'translateX(-50%)';
        bossLabel.style.color = '#ff0000';
        bossLabel.style.fontFamily = 'Impact, fantasy';
        bossLabel.style.fontSize = '20px';
        
        bossHealthContainer.appendChild(bossLabel);
        
        bossHealthBar = document.createElement('div');
        bossHealthBar.id = 'boss-health-bar';
        bossHealthBar.style.width = '100%';
        bossHealthBar.style.height = '100%';
        bossHealthBar.style.backgroundColor = '#ff0000';
        
        bossHealthContainer.appendChild(bossHealthBar);
        document.body.appendChild(bossHealthContainer);
    }
    
    // Calculate boss health percentage
    const maxHealth = boss.userData.maxHealth || boss.userData.initialHealth || 100;
    const healthPercent = (boss.health / maxHealth) * 100;
    bossHealthBar.style.width = `${healthPercent}%`;
    
    // Apply pulse animation if boss health is low
    if (healthPercent < 30) {
        bossHealthBar.style.animation = 'pulse 1s infinite';
        if (!document.getElementById('boss-health-pulse-keyframes')) {
            const style = document.createElement('style');
            style.id = 'boss-health-pulse-keyframes';
            style.textContent = `
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        bossHealthBar.style.animation = 'none';
    }
    
    // Show the boss health container
    bossHealthContainer.style.display = 'block';
};

window.hideBossHealthBar = function() {
    const bossHealthContainer = document.getElementById('boss-health-container');
    if (bossHealthContainer) {
        bossHealthContainer.style.display = 'none';
    }
};

window.showWaveCompleteNotification = function(waveNumber) {
    let waveNotification = document.getElementById('wave-notification');
    
    if (!waveNotification) {
        waveNotification = document.createElement('div');
        waveNotification.id = 'wave-notification';
        waveNotification.style.position = 'absolute';
        waveNotification.style.top = '50%';
        waveNotification.style.left = '50%';
        waveNotification.style.transform = 'translate(-50%, -50%)';
        waveNotification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        waveNotification.style.color = '#ffffff';
        waveNotification.style.padding = '20px';
        waveNotification.style.borderRadius = '10px';
        waveNotification.style.fontFamily = 'Impact, fantasy';
        waveNotification.style.fontSize = '24px';
        waveNotification.style.zIndex = '1000';
        waveNotification.style.transition = 'opacity 0.5s ease';
        waveNotification.style.textAlign = 'center';
        waveNotification.style.border = '2px solid #00ff00';
        waveNotification.style.boxShadow = '0 0 20px #00ff00';
        document.body.appendChild(waveNotification);
    }
    
    waveNotification.textContent = `WAVE ${waveNumber} COMPLETE!`;
    waveNotification.style.opacity = '1';
    waveNotification.style.display = 'block';
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        waveNotification.style.opacity = '0';
        setTimeout(() => {
            if (waveNotification && waveNotification.parentNode) {
                waveNotification.style.display = 'none';
            }
        }, 500);
    }, 3000);
};

window.updateSurvivalHighScoreDisplay = function() {
    const survivalHighScoreContainer = document.getElementById('survival-high-score');
    if (!survivalHighScoreContainer) return;
    
    survivalHighScoreContainer.style.display = 'block';
    const highestWave = localStorage.getItem('highestWave') || 0;
    const highestEnemiesDefeated = localStorage.getItem('highestEnemiesDefeated') || 0;
    survivalHighScoreContainer.textContent = `BEST: Wave ${highestWave} | ${highestEnemiesDefeated} Enemies`;
};

// Function to update projectiles movement and expiration
function updateProjectiles(delta) {
    if (!projectiles || projectiles.length === 0) return;
    
    // Debug log projectile count
    console.log(`Updating ${projectiles.length} projectiles, ${projectiles.filter(p => p?.userData?.isEnemy).length} enemy projectiles`);
    
    // Iterate backwards through the array for safe removal
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        if (!projectile || !projectile.userData) continue;
        
        // Update lifetime - remove projectiles that have existed for too long
        projectile.userData.lifetime += delta;
        if (projectile.userData.lifetime > 2) { // Remove after ~2 seconds
            scene.remove(projectile);
            projectiles.splice(i, 1);
            continue;
        }
        
        // Update position based on direction and speed
        const speed = projectile.userData.isEnemy ? 0.3 : 0.8; // Player projectiles move faster
        const moveDistance = speed * delta * 60; // Normalize by target framerate
        
        if (projectile.userData.direction) {
            const movement = projectile.userData.direction.clone().multiplyScalar(moveDistance);
            projectile.position.add(movement);
        }
    }
}

function updateGameModeState(delta) {
    // Debug current level status
    if (tank && frameCount % 60 === 0) { // Log once per second (assuming 60fps)
        console.log("Current game state:", {
            currentLevel: currentLevel,
            hasKey: hasKey,
            tankPosition: tank.position.z,
            tollgatePosition: -levelLength,
            distanceToTollgate: Math.abs(tank.position.z - (-levelLength))
        });
    }
    
    if (currentGameMode === GAME_MODES.TIME_TRIAL) {
        updateTimeTrialTimer();
        
        // Debug time trial mode
        const DEBUG_TIME_TRIAL = true;
        if (DEBUG_TIME_TRIAL && tank && frameCount % 60 === 0) {
            console.log("Time Trial Status:", {
                hasKey: hasKey,
                tankPosition: tank.position.z,
                distanceToTollgate: Math.abs(tank.position.z - (-levelLength)),
                tollgatePosition: -levelLength,
                levelLength: levelLength,
                currentLevel: currentLevel
            });
        }
        
        // Auto-open the gate when player has the key, just like in normal mode
        if (hasKey && !gateOpeningTriggered) {
            // This flag prevents triggering multiple times
            gateOpeningTriggered = true;
            
            if (DEBUG_TIME_TRIAL) {
                console.log("KEY ACQUIRED - AUTOMATICALLY OPENING GATE");
            }
            
            // Display a message to notify the player
            displayMessage("Gate unlocked! Proceed to the end of the level!", "mission");
        }
        
        // Check if player has reached the tollgate
        if (Math.abs(tank.position.z - (-levelLength)) < 10) {  // Fixed: Added negative sign to levelLength
            if (!hasKey) {
                displayMessage("You need the key to unlock the tollgate! Find all checkpoints!", "warning");
                // Bounce tank back a bit
                tank.position.z -= 25;
                
                if (DEBUG_TIME_TRIAL) {
                    console.log("Tank reached tollgate but doesn't have the key!");
                }
            } else {
                // Let player proceed to next level if they have the key
                if (DEBUG_TIME_TRIAL) {
                    console.log("Tank reached tollgate with the key! Advancing to next level!");
                }
                advanceToNextLevel();
            }
        }
    } else {
        // Normal mode logic
        
        // Check if all enemies are defeated to give the key
        if (enemies.length === 0 && !hasKey) {
            hasKey = true;
            displayMessage("All enemies defeated! The tollgate has been unlocked!", "mission");
            console.log("Normal mode: All enemies defeated, key acquired!");
        }
        
        // Level completion when reaching the tollgate - FIXED: Added negative sign to levelLength
        const distanceToTollgate = Math.abs(tank.position.z - (-levelLength));
        if (distanceToTollgate < 10) { // Increased detection threshold
            console.log("Player is close to the tollgate!", {
                tankPosition: tank.position.z,
                tollgatePosition: -levelLength,
                distance: distanceToTollgate,
                currentLevel: currentLevel,
                hasKey: hasKey
            });
            
            if (!hasKey) {
                // If player doesn't have key, warn them and bounce back
                displayMessage("You need to defeat all enemies to unlock the tollgate!", "warning");
                tank.position.z -= 25; // Bounce back
            } else {
                // Player has the key and is at the tollgate - advance to next level
                console.log("Player reached tollgate with key! Advancing to next level!");
            advanceToNextLevel();
            }
        }
    }
}

// Add a new function to handle wave completion
function completeWave() {
    waveInProgress = false;
    
    // Show wave complete notification
    showWaveCompleteNotification(currentWave);
    
    // Update high score if needed
    if (currentWave > survivialHighScore.wave) {
        survivialHighScore.wave = currentWave;
        saveSurvivalHighScore();
    }
    
    // Pause briefly before starting next wave
    setTimeout(() => {
        if (gameActive && !isGamePaused) {
            // Start next wave
            startNewWave(true); // true = increment wave number
        }
    }, 5000); // 5-second delay between waves
    
    // Add health bonus between waves
    playerHealth = Math.min(100, playerHealth + 10);
    updateStats();
    displayMessage("Wave complete! Health +10", "health");
}

// Function to update various environmental effects
function updateEnvironmentEffects(delta) {
    // Update tollgate animation if it exists
    if (typeof updateTollgate === 'function') {
        updateTollgate(tank, enemies, scene, hasKey);
    }
    
    // Update spawned items like power-ups
    if (typeof updateSpawnItems === 'function') {
        updateSpawnItems(delta);
        
        // Check if tank has collected any items
        if (tank) {
            checkItemCollection(tank, scene, applyPowerUp, score, displayMessage);
        }
    }
    
    // Update rainbow text effects
    if (typeof updateRainbowText === 'function') {
        updateRainbowText(delta);
    }
    
    // Update atmospheric effects
    if (typeof updateAtmosphere === 'function') {
        updateAtmosphere(window.atmosphere, tank);
    }
    
    // Update any checkpoint animations
    if (typeof updateCheckpoints === 'function' && currentGameMode === GAME_MODES.TIME_TRIAL) {
        updateCheckpoints(delta);
        
        // Check for checkpoint collisions
        if (tank) {
            // Use the levelStartTime from scene.userData to calculate time bonuses
            const checkpointResult = checkCheckpointCollision(tank, scene.userData.levelStartTime);
            if (checkpointResult.collision) {
                console.log("Checkpoint collision detected!", checkpointResult);
                
                // Handle checkpoint collection
                const timeBonus = checkpointResult.timeBonus;
                if (timeBonus > 0) {
                    // Player reached checkpoint in time for bonus
                    timeTrialStartTime += timeBonus;
                    displayMessage(`Checkpoint reached! -${timeBonus/1000}s bonus!`, "checkpoint");
                    playCheckpointSound(true);
                } else {
                    // Player reached checkpoint but too late for bonus
                    displayMessage("Checkpoint reached, but too late for time bonus!", "checkpoint-missed");
                    playCheckpointSound(false);
                }
                
                // Check if all checkpoints have been collected
                if (checkpointResult.allCollected) {
                    hasKey = true;
                    displayMessage("All checkpoints collected! The tollgate has been unlocked!", "mission");
                    
                    // Start auto-opening the gate in time trial mode
                    if (currentGameMode === GAME_MODES.TIME_TRIAL && !gateOpeningTriggered) {
                        gateOpeningTriggered = true;
                        console.log("All checkpoints collected - automatically opening gate");
                        // Audio feedback would be good here
                        // playSound('gateUnlock');
                    }
                }
            }
        }
    }
    
    // Update obstacle animations
    if (typeof updateObstacles === 'function') {
        updateObstacles(delta);
        
        // Check for collisions with obstacles
        if (tank) {
            checkObstacleCollisions(tank, scene, enemies);
        }
    }
    
    // The portalManager handles its own animation internally, so we don't need to update it here
    // The error was: window.portalManager.update is not a function
}

function advanceToNextLevel() {
    // Add a protective check to prevent double-calls
    if (window.isAdvancingLevel) {
        console.log("Already advancing to next level, ignoring duplicate call");
        return;
    }
    
    // Set flag to prevent duplicate calls
    window.isAdvancingLevel = true;
    
    console.log("Advancing to next level - preparing to save progress");
    
    // Update game session for level completion
    if (window.gameSession) {
        window.gameSession.duration = Date.now() - window.gameSession.startTime;
        window.gameSession.score = score;
        window.gameSession.level = currentLevel;
        window.gameSession.victory = true;
        window.gameSession.enemiesDefeated = window.gameSession.enemiesDefeated || 0;
        
        console.log("Level completion game session:", JSON.stringify(window.gameSession));
        
        // Save game session to user profile
        try {
            if (ensureUserProfile() && typeof window.userProfile.updateStats === 'function') {
                console.log("Saving level completion to user profile");
                window.userProfile.updateStats(window.gameSession);
                
                // Force profile save
                if (typeof window.userProfile.saveProfile === 'function') {
                    window.userProfile.saveProfile();
                    console.log("User profile saved successfully after level completion");
                }
            } else {
                console.error("User profile not properly initialized or missing updateStats method");
            }
        } catch (error) {
            console.error("Error saving level completion:", error);
        }
        
        // Reset game session for next level
        window.gameSession = {
            mode: currentGameMode,
            level: currentLevel + 1,
            dCoinsEarned: 0,
            score: score,
            enemiesDefeated: 0,
            playerDied: false,
            duration: 0,
            startTime: Date.now()
        };
        
        console.log("New game session initialized for next level:", JSON.stringify(window.gameSession));
    } else {
        console.error("Game session not initialized - level progress will not be saved");
    }
    
    // Show level completion message
    displayMessage(`Level ${currentLevel} Completed!`, "mission");
    
    console.log(`Advancing to next level from Level ${currentLevel}`);
    
    // Wait a moment before transitioning to next level
    setTimeout(() => {
        // Call nextLevel function to advance to the next level
        console.log(`About to call nextLevel() from Level ${currentLevel}`);
        nextLevel();
        
        // Reset advancing flag after a brief delay
        setTimeout(() => {
            window.isAdvancingLevel = false;
        }, 500);
    }, 1500);
}

// Add function to return to main menu
function returnToMainMenu() {
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    
    // Stop background music
    audioManager.stopBackgroundMusic();
    
    // Reset all game state for a fresh start
    isGameOver = false;
    gameStarted = false;
    gameActive = false;
    playerLives = 2; // Reset lives to initial value
    playerHealth = 100; // Reset health
    score = 0; // Reset score
    currentLevel = 1; // Reset to first level
    hasKey = false; // Reset key status
    activePowerUps = {}; // Clear active power-ups
    gateOpeningTriggered = false; // Reset gate opening flag
    
    // Reset survival mode variables if they exist
    if (typeof currentWave !== 'undefined') {
        currentWave = 1;
        waveEnemiesRemaining = 0;
        waveTotalEnemies = 0;
        waveInProgress = false;
    }
    
    // Reset tank position if it exists
    if (tank) {
        tank.position.set(0, 0, 0);
    }
    
    // Clear enemies and obstacles
    clearEnemies();
    if (typeof clearObstacles === 'function') {
        clearObstacles();
    }
    
    // Reset the menu state to initial main menu using the new function
    if (window.resetMenuState) {
        window.resetMenuState();
    }
}

// Add volume control to the game settings
function updateGameSettings(settings) {
    if (typeof settings.volume !== 'undefined') {
        audioManager.setVolume(settings.volume);
    }
    if (typeof settings.muted !== 'undefined') {
        if (settings.muted) {
            audioManager.toggleMute();
        }
    }
}

// Make updateGameSettings globally available
window.updateGameSettings = updateGameSettings;

// Add function to check wave completion in the update loop
function checkWaveCompletion() {
    if (currentGameMode === GAME_MODES.SURVIVAL && waveInProgress && gameStarted && !isGamePaused) {
        // Only count enemies that are actually spawned and in the scene
        const activeEnemies = enemies.filter(enemy => enemy && enemy.parent);
        waveEnemiesRemaining = activeEnemies.length;
        
        updateWaveProgress();
        
        // Only complete wave if all enemies are defeated AND we've actually spawned them
        // This prevents auto-completion when no enemies have been spawned yet
        if (waveEnemiesRemaining === 0 && waveTotalEnemies > 0 && window.waveFullySpawned === true) {
            console.log("Wave complete! All enemies defeated.");
            completeWave();
        }
    }
}

// Update the damage handling for survival mode
function handlePlayerDamage(damage) {
    if (!gameActive || isGamePaused) return;
    
    // Apply damage reduction in survival mode
    if (currentGameMode === GAME_MODES.SURVIVAL && tank && tank.userData.survivalBuffs) {
        damage = damage / tank.userData.survivalBuffs.armorMultiplier;
    }
    
    playerHealth -= damage;
    
    // Flash the health display red
    const healthDisplay = document.getElementById('health');
    if (healthDisplay) {
        healthDisplay.style.color = 'red';
        setTimeout(() => {
            healthDisplay.style.color = '';
        }, 200);
    }
    
    if (playerHealth <= 0) {
        playerLives--;
        if (playerLives >= 0) {
            // Restore health and grant temporary invulnerability
            playerHealth = currentGameMode === GAME_MODES.SURVIVAL ? 200 : 100;
            tank.userData.invulnerable = true;
            setTimeout(() => {
                tank.userData.invulnerable = false;
            }, 2000);
            
            displayMessage("Life lost! Temporary shield activated!", "warning");
        } else {
            handleGameOver();
        }
    }
    
    updateStats();
}
