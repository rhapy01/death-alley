// Main Menu for Death Alley Tank Combat
// This file contains the implementation of the main menu interface

// Main menu state
let menuVisible = true; // Start with menu visible
let activeTab = 'start';
let gameStarted = false;

// Game modes (should match those in game.js)
const GAME_MODES = {
    NORMAL: 'normal',
    TIME_TRIAL: 'time_trial',
    SURVIVAL: 'survival',
    REPLAY_ANALYSIS: 'replay_analysis'
};

// Currently selected game mode
let selectedGameMode = GAME_MODES.NORMAL;

// Function to handle logo visibility
function updateLogoVisibility(visible) {
    const logo = document.getElementById('game-logo');
    if (logo) {
        if (visible) {
            logo.classList.add('visible');
            logo.classList.remove('menu-hidden');
        } else {
            logo.classList.remove('visible');
            logo.classList.add('menu-hidden');
        }
    }
}

// Function to create and initialize the main menu
export function createMainMenu() {
    // Show the logo when menu is created
    updateLogoVisibility(true);
    
    // Create main menu container if it doesn't exist
    if (!document.getElementById('main-menu')) {
        const menuContainer = document.createElement('div');
        menuContainer.id = 'main-menu';
        menuContainer.className = 'visible'; // Start visible
        
        // Create menu toggle button (hidden initially, only shown after game starts)
        const toggleButton = document.createElement('button');
        toggleButton.id = 'menu-toggle';
        toggleButton.innerHTML = '☰';
        toggleButton.title = 'Toggle Menu';
        toggleButton.style.display = 'none'; // Hide initially
        
        // Create menu content
        const menuContent = document.createElement('div');
        menuContent.id = 'menu-content';
        
        // Create menu header
        const menuHeader = document.createElement('div');
        menuHeader.id = 'menu-header';
        menuHeader.innerHTML = `
            <img src="textures/logo.png" alt="Death Alley Logo" class="menu-logo">
        `;
        
        // Create menu tabs
        const menuTabs = document.createElement('div');
        menuTabs.id = 'menu-tabs';
        
        // Add tabs - Main menu first
        const tabs = ['Start', 'Controls', 'Game Modes', 'Settings'];
        tabs.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = 'menu-tab';
            tabElement.dataset.tab = tab.toLowerCase().replace(' ', '-');
            tabElement.textContent = tab;
            tabElement.onclick = () => switchTab(tabElement.dataset.tab);
            menuTabs.appendChild(tabElement);
        });
        
        // Create tab content container
        const tabContent = document.createElement('div');
        tabContent.id = 'tab-content';
        
        // Create content for each tab
        createStartTab(tabContent);
        createControlsTab(tabContent);
        createGameModesTab(tabContent);
        createSettingsTab(tabContent);
        
        // Add close button (hidden initially, only shown after game starts)
        const closeButton = document.createElement('button');
        closeButton.id = 'menu-close';
        closeButton.textContent = '×';
        closeButton.title = 'Close Menu';
        closeButton.onclick = toggleMenu;
        closeButton.style.display = 'none'; // Hide initially
        
        // Assemble menu components
        menuContainer.appendChild(toggleButton);
        menuContent.appendChild(closeButton);
        menuContent.appendChild(menuHeader);
        menuContent.appendChild(menuTabs);
        menuContent.appendChild(tabContent);
        menuContainer.appendChild(menuContent);
        
        // Add menu to document
        document.body.appendChild(menuContainer);
        
        // Add toggle event
        toggleButton.addEventListener('click', toggleMenu);
        
        // Add keyboard event listener for ESC key
        document.addEventListener('keydown', handleKeyPress);
        
        // Initialize first tab
        switchTab('start');
        
        // Add volume control
        createVolumeControl();
    }
}

// Function to toggle the menu visibility
export function toggleMenu() {
    // Only allow toggling after game has started
    if (!gameStarted) return;
    
    menuVisible = !menuVisible;
    const menu = document.getElementById('main-menu');
    if (menu) {
        menu.className = menuVisible ? 'visible' : 'hidden';
    }
    
    // Update logo visibility
    updateLogoVisibility(menuVisible);
    
    // When menu is visible, pause the game
    if (menuVisible && window.pauseGame && typeof window.pauseGame === 'function') {
        window.pauseGame();
    } else if (!menuVisible && window.resumeGame && typeof window.resumeGame === 'function') {
        window.resumeGame();
    }
}

// Function to notify that game has started and prepare for in-game mode
export function notifyGameStarted() {
    gameStarted = true;
    
    // Show toggle button
    const toggleButton = document.getElementById('menu-toggle');
    if (toggleButton) toggleButton.style.display = 'flex';
    
    // Show close button
    const closeButton = document.getElementById('menu-close');
    if (closeButton) closeButton.style.display = 'flex';
    
    // Hide menu and logo
    menuVisible = false;
    const menu = document.getElementById('main-menu');
    if (menu) menu.className = 'hidden';
    updateLogoVisibility(false);
    
    // Change Start tab to Stats tab
    const startTab = document.querySelector('.menu-tab[data-tab="start"]');
    if (startTab) {
        startTab.textContent = 'Stats';
        startTab.dataset.tab = 'stats';
        startTab.onclick = () => switchTab('stats');
    }
    
    // Create Stats tab content
    const tabContent = document.getElementById('tab-content');
    if (tabContent) {
        // Create stats content and replace the start content
        const statsContent = document.createElement('div');
        statsContent.id = 'stats-content';
        statsContent.className = 'tab-content';
        
        // Remove the start content
        const startContent = document.getElementById('start-content');
        if (startContent) startContent.remove();
        
        // Add stats content
        createStatsTab(tabContent);
    }
}

// Function to switch between tabs
function switchTab(tabName) {
    activeTab = tabName;
    
    // Update tab highlighting
    const tabs = document.querySelectorAll('.menu-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update tab content visibility
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
        if (content.id === `${tabName}-content`) {
            content.style.display = 'block';
        }
    });
}

// Create Start tab content (main menu landing page)
function createStartTab(container) {
    const startContent = document.createElement('div');
    startContent.id = 'start-content';
    startContent.className = 'tab-content';
    
    // Game logo/title (already in header)
    
    // Profile button
    const profileButton = document.createElement('button');
    profileButton.id = 'profile-button';
    profileButton.className = 'menu-button';
    profileButton.innerHTML = '<i class="fas fa-user"></i> Profile';
    profileButton.onclick = () => {
        // Safely check if userProfile exists and has syncUserProfile method
        if (window.userProfile) {
            // Try to sync the profile if the function exists
            if (typeof window.userProfile.syncUserProfile === 'function') {
                window.userProfile.syncUserProfile();
            } else {
                // If the function doesn't exist, just save the profile using available methods
                if (typeof window.userProfile.saveProfile === 'function') {
                    window.userProfile.saveProfile();
                }
                
                // Try to use the save system directly if available
                if (window.saveSystem && typeof window.saveSystem.saveAll === 'function') {
                    window.saveSystem.saveAll(true);
                }
            }
            
            // Navigate to profile page regardless of sync success
            window.location.href = 'user.html';
        } else {
            console.warn("Profile not initialized, cannot navigate to profile page");
            // Show a message to the user
            alert("Unable to access profile. Please try again later.");
        }
    };
    
    // Game mode selection
    const modeSelection = document.createElement('div');
    modeSelection.className = 'start-mode-selection';
    modeSelection.innerHTML = `
        <h3>SELECT GAME MODE</h3>
        <div class="game-mode-selection">
            <button class="game-mode-btn active" id="start-normal-mode-btn">Normal Mode</button>
            <button class="game-mode-btn" id="start-time-trial-btn">Time Trial</button>
            <button class="game-mode-btn" id="start-survival-mode-btn">Survival Mode</button>
        </div>
        
        <div class="game-mode-description" id="current-mode-desc">
            <p>Classic gameplay with progression through levels. Defeat enemies, collect power-ups, and reach the tollgate to advance.</p>
        </div>
    `;
    
    // Start game button
    const startButton = document.createElement('button');
    startButton.id = 'start-game-btn';
    startButton.textContent = 'START GAME';
    startButton.onclick = startGame;
    
    // Credits section
    const credits = document.createElement('div');
    credits.className = 'credits';
    credits.innerHTML = `
        <p>Death Alley Tank Combat &copy; 2023</p>
        <p class="version">Version 1.0</p>
    `;
    
    // Add to container
    startContent.appendChild(profileButton);
    startContent.appendChild(modeSelection);
    startContent.appendChild(startButton);
    startContent.appendChild(credits);
    container.appendChild(startContent);
    
    // Add event listeners for game mode buttons
    setTimeout(() => {
        const normalModeBtn = document.getElementById('start-normal-mode-btn');
        const timeTrialBtn = document.getElementById('start-time-trial-btn');
        const survivalModeBtn = document.getElementById('start-survival-mode-btn');
        
        if (normalModeBtn) {
            normalModeBtn.addEventListener('click', () => {
                selectedGameMode = GAME_MODES.NORMAL;
                updateModeSelection('normal');
                document.getElementById('current-mode-desc').innerHTML = `
                    <p>Classic gameplay with progression through levels. Defeat enemies, collect power-ups, and reach the tollgate to advance.</p>
                `;
            });
        }
        
        if (timeTrialBtn) {
            timeTrialBtn.addEventListener('click', () => {
                selectedGameMode = GAME_MODES.TIME_TRIAL;
                updateModeSelection('time-trial');
                document.getElementById('current-mode-desc').innerHTML = `
                    <p>Race against the clock! Pass through checkpoints to gain time bonuses. Your best times are recorded for each level.</p>
                `;
            });
        }
        
        if (survivalModeBtn) {
            survivalModeBtn.addEventListener('click', () => {
                selectedGameMode = GAME_MODES.SURVIVAL;
                updateModeSelection('survival');
                document.getElementById('current-mode-desc').innerHTML = `
                    <p>Face endless waves of increasingly difficult enemies. How long can you survive? Boss enemies appear every 3 waves!</p>
                `;
            });
        }
    }, 100);
}

// Update mode selection highlighting
function updateModeSelection(mode) {
    const buttons = document.querySelectorAll('.start-mode-selection .game-mode-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (mode === 'normal') {
        document.getElementById('start-normal-mode-btn').classList.add('active');
    } else if (mode === 'time-trial') {
        document.getElementById('start-time-trial-btn').classList.add('active');
    } else if (mode === 'survival') {
        document.getElementById('start-survival-mode-btn').classList.add('active');
    }
}

// Create Stats tab content
function createStatsTab(container) {
    const statsContent = document.createElement('div');
    statsContent.id = 'stats-content';
    statsContent.className = 'tab-content';
    
    // Level and Score
    const gameStats = document.createElement('div');
    gameStats.id = 'menu-game-stats';
    gameStats.innerHTML = `
        <h3>Game Statistics</h3>
        <div class="stat-item">
            <span class="stat-label">Level:</span>
            <span class="stat-value" id="menu-level">1</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Score:</span>
            <span class="stat-value" id="menu-score">0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Health:</span>
            <span class="stat-value" id="menu-health">100%</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Distance:</span>
            <span class="stat-value" id="menu-distance">1000m</span>
        </div>
    `;
    
    // Time Trial Stats
    const timeTrialStats = document.createElement('div');
    timeTrialStats.id = 'menu-time-trial-stats';
    timeTrialStats.innerHTML = `
        <h3>Time Trial</h3>
        <div class="stat-item">
            <span class="stat-label">Current Time:</span>
            <span class="stat-value" id="menu-current-time">00:00:000</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Best Time (Level 1):</span>
            <span class="stat-value" id="menu-best-time-1">--:--:---</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Best Time (Level 2):</span>
            <span class="stat-value" id="menu-best-time-2">--:--:---</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Best Time (Level 3):</span>
            <span class="stat-value" id="menu-best-time-3">--:--:---</span>
        </div>
    `;
    
    // Survival Stats
    const survivalStats = document.createElement('div');
    survivalStats.id = 'menu-survival-stats';
    survivalStats.innerHTML = `
        <h3>Survival Mode</h3>
        <div class="stat-item">
            <span class="stat-label">Current Wave:</span>
            <span class="stat-value" id="menu-current-wave">0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Enemies Defeated:</span>
            <span class="stat-value" id="menu-enemies-defeated">0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Highest Wave:</span>
            <span class="stat-value" id="menu-highest-wave">0</span>
        </div>
    `;
    
    // Add to container
    statsContent.appendChild(gameStats);
    statsContent.appendChild(timeTrialStats);
    statsContent.appendChild(survivalStats);
    container.appendChild(statsContent);
}

// Create Controls tab content
function createControlsTab(container) {
    const controlsContent = document.createElement('div');
    controlsContent.id = 'controls-content';
    controlsContent.className = 'tab-content';
    
    controlsContent.innerHTML = `
        <h3>Game Controls</h3>
        <div class="controls-grid">
            <div class="control-item">
                <div class="control-key">↑ ↓ ← →</div>
                <div class="control-desc">Drive Tank</div>
            </div>
            <div class="control-item">
                <div class="control-key">MOUSE</div>
                <div class="control-desc">Aim Turret</div>
            </div>
            <div class="control-item">
                <div class="control-key">SPACE</div>
                <div class="control-desc">Fire</div>
            </div>
            <div class="control-item">
                <div class="control-key">Q / E</div>
                <div class="control-desc">Zoom In/Out</div>
            </div>
            <div class="control-item">
                <div class="control-key">L</div>
                <div class="control-desc">Look Around</div>
            </div>
            <div class="control-item">
                <div class="control-key">P</div>
                <div class="control-desc">Pause/Resume</div>
            </div>
            <div class="control-item">
                <div class="control-key">ESC</div>
                <div class="control-desc">Toggle Menu</div>
            </div>
        </div>
        
        <h3>Mobile Controls</h3>
        <p>On mobile devices, on-screen controls will automatically appear:</p>
        <div class="mobile-controls-info">
            <div>• D-Pad: Move the tank</div>
            <div>• SHOOT button: Fire the cannon</div>
            <div>• HUD button: Toggle heads-up display</div>
            <div>• Pause/Play buttons: Pause or resume game</div>
        </div>
    `;
    
    container.appendChild(controlsContent);
}

// Create Game Modes tab content
function createGameModesTab(container) {
    const gameModesContent = document.createElement('div');
    gameModesContent.id = 'game-modes-content';
    gameModesContent.className = 'tab-content';
    
    // Create game mode buttons
    gameModesContent.innerHTML = `
        <h3>Game Modes</h3>
        <div class="game-mode-selection">
            <button class="game-mode-btn" id="menu-normal-mode-btn">Normal Mode</button>
            <button class="game-mode-btn" id="menu-time-trial-btn">Time Trial</button>
            <button class="game-mode-btn" id="menu-survival-mode-btn">Survival Mode</button>
            <button class="game-mode-btn" id="menu-replay-analysis-btn">Replay Analysis</button>
        </div>
        
        <div class="game-mode-description" id="normal-mode-desc">
            <h4>Normal Mode</h4>
            <p>Classic gameplay with progression through levels. Defeat enemies, collect power-ups, and reach the tollgate to advance.</p>
        </div>
        
        <div class="game-mode-description" id="time-trial-desc">
            <h4>Time Trial</h4>
            <p>Race against the clock! Pass through checkpoints to gain time bonuses. Your best times are recorded for each level.</p>
        </div>
        
        <div class="game-mode-description" id="survival-mode-desc">
            <h4>Survival Mode</h4>
            <p>Face endless waves of increasingly difficult enemies. How long can you survive? Boss enemies appear every 3 waves!</p>
        </div>
        
        <div class="game-mode-description" id="replay-analysis-desc">
            <h4>Replay Analysis</h4>
            <p>Review your previous gameplay sessions with detailed analysis of your performance.</p>
        </div>
    `;
    
    container.appendChild(gameModesContent);
    
    // Add event listeners to game mode buttons
    setTimeout(() => {
        const normalModeBtn = document.getElementById('menu-normal-mode-btn');
        const timeTrialBtn = document.getElementById('menu-time-trial-btn');
        const survivalModeBtn = document.getElementById('menu-survival-mode-btn');
        const replayAnalysisBtn = document.getElementById('menu-replay-analysis-btn');
        
        if (normalModeBtn) {
            normalModeBtn.addEventListener('click', () => {
                if (window.switchGameMode) {
                    window.switchGameMode(GAME_MODES.NORMAL);
                    toggleMenu(); // Close menu after selection
                }
            });
        }
        
        if (timeTrialBtn) {
            timeTrialBtn.addEventListener('click', () => {
                if (window.switchGameMode) {
                    window.switchGameMode(GAME_MODES.TIME_TRIAL);
                    toggleMenu(); // Close menu after selection
                }
            });
        }
        
        if (survivalModeBtn) {
            survivalModeBtn.addEventListener('click', () => {
                if (window.switchGameMode) {
                    window.switchGameMode(GAME_MODES.SURVIVAL);
                    toggleMenu(); // Close menu after selection
                }
            });
        }
        
        if (replayAnalysisBtn) {
            replayAnalysisBtn.addEventListener('click', () => {
                if (window.switchGameMode) {
                    window.switchGameMode(GAME_MODES.REPLAY_ANALYSIS);
                    toggleMenu(); // Close menu after selection
                }
            });
        }
    }, 100); // Short delay to ensure DOM is ready
}

// Create Settings tab content
function createSettingsTab(container) {
    const settingsContent = document.createElement('div');
    settingsContent.id = 'settings-content';
    settingsContent.className = 'tab-content';
    
    settingsContent.innerHTML = `
        <h3>Game Settings</h3>
        
        <div class="settings-group">
            <h4>Display</h4>
            <div class="setting-item">
                <label for="hud-toggle">Show HUD</label>
                <input type="checkbox" id="hud-toggle" checked>
            </div>
            <div class="setting-item">
                <label for="effects-toggle">Visual Effects</label>
                <input type="checkbox" id="effects-toggle" checked>
            </div>
        </div>
        
        <div class="settings-group">
            <h4>Sound</h4>
            <div class="setting-item">
                <label for="master-volume">Master Volume</label>
                <input type="range" id="master-volume" min="0" max="100" value="100">
                <span class="volume-value">100%</span>
            </div>
            <div class="setting-item">
                <label for="music-toggle">Music</label>
                <input type="checkbox" id="music-toggle" checked>
            </div>
            <div class="setting-item">
                <label for="sfx-toggle">Sound Effects</label>
                <input type="checkbox" id="sfx-toggle" checked>
            </div>
        </div>
        
        <div class="settings-group">
            <h4>Performance</h4>
            <div class="setting-item">
                <label for="graphics-quality">Graphics Quality</label>
                <select id="graphics-quality">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
            </div>
        </div>
    `;
    
    container.appendChild(settingsContent);
    
    // Add event listeners for settings
    setTimeout(() => {
        const hudToggle = document.getElementById('hud-toggle');
        if (hudToggle) {
            hudToggle.addEventListener('change', (e) => {
                const hud = document.getElementById('hud');
                if (hud) {
                    hud.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        // Volume slider
        const volumeSlider = document.getElementById('master-volume');
        const volumeValue = document.querySelector('.volume-value');
        
        if (volumeSlider && volumeValue) {
            volumeSlider.addEventListener('input', (e) => {
                volumeValue.textContent = `${e.target.value}%`;
                // Set volume (if game has audio system)
                if (window.setVolume) {
                    window.setVolume(e.target.value / 100);
                }
            });
        }
    }, 100); // Short delay to ensure DOM is ready
}

// Start the game with the selected mode
function startGame() {
    // Hide main menu
    menuVisible = false;
    const menu = document.getElementById('main-menu');
    if (menu) menu.className = 'hidden';
    
    // Switch to the selected game mode
    if (window.switchGameMode) {
        window.switchGameMode(selectedGameMode);
    }
    
    // Call the function to initiate gameplay
    if (window.startGamePlay) {
        window.startGamePlay().catch(error => {
            console.error("Failed to start game:", error);
            // TODO: Show error to user
        });
    }
    
    // Notify that game has started
    notifyGameStarted();
}

// Function to update the menu stats
export function updateMenuStats(stats) {
    if (!stats) return;
    
    // Update basic stats
    if (stats.level) {
        const menuLevel = document.getElementById('menu-level');
        if (menuLevel) menuLevel.textContent = stats.level;
    }
    
    if (stats.score) {
        const menuScore = document.getElementById('menu-score');
        if (menuScore) menuScore.textContent = stats.score;
    }
    
    if (stats.health) {
        const menuHealth = document.getElementById('menu-health');
        if (menuHealth) menuHealth.textContent = `${stats.health}%`;
    }
    
    if (stats.distance) {
        const menuDistance = document.getElementById('menu-distance');
        if (menuDistance) menuDistance.textContent = `${stats.distance}m`;
    }
    
    // Update time trial stats
    if (stats.currentTime) {
        const menuCurrentTime = document.getElementById('menu-current-time');
        if (menuCurrentTime) menuCurrentTime.textContent = stats.currentTime;
    }
    
    if (stats.bestTimes) {
        if (stats.bestTimes[1] && stats.bestTimes[1] !== Infinity) {
            const menuBestTime1 = document.getElementById('menu-best-time-1');
            if (menuBestTime1) menuBestTime1.textContent = formatTime(stats.bestTimes[1]);
        }
        
        if (stats.bestTimes[2] && stats.bestTimes[2] !== Infinity) {
            const menuBestTime2 = document.getElementById('menu-best-time-2');
            if (menuBestTime2) menuBestTime2.textContent = formatTime(stats.bestTimes[2]);
        }
        
        if (stats.bestTimes[3] && stats.bestTimes[3] !== Infinity) {
            const menuBestTime3 = document.getElementById('menu-best-time-3');
            if (menuBestTime3) menuBestTime3.textContent = formatTime(stats.bestTimes[3]);
        }
    }
    
    // Update survival stats
    if (stats.currentWave) {
        const menuCurrentWave = document.getElementById('menu-current-wave');
        if (menuCurrentWave) menuCurrentWave.textContent = stats.currentWave;
    }
    
    if (stats.enemiesDefeated) {
        const menuEnemiesDefeated = document.getElementById('menu-enemies-defeated');
        if (menuEnemiesDefeated) menuEnemiesDefeated.textContent = stats.enemiesDefeated;
    }
    
    if (stats.highestWave) {
        const menuHighestWave = document.getElementById('menu-highest-wave');
        if (menuHighestWave) menuHighestWave.textContent = stats.highestWave;
    }
}

// Helper function to format time
function formatTime(milliseconds) {
    if (!milliseconds || milliseconds === Infinity) return '--:--:---';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
}

// Handler for key presses
export function handleKeyPress(event) {
    // Only handle ESC if game has started
    if (event.key === 'Escape' && gameStarted) {
        toggleMenu();
        
        // Prevent default browser behavior
        event.preventDefault();
    }
}

// Function to reset the menu state back to initial main menu
export function resetMenuState() {
    gameStarted = false;
    
    // Show menu header
    const menuHeader = document.getElementById('menu-header');
    if (menuHeader) menuHeader.style.display = 'block';
    
    // Change Stats tab back to Start tab
    const statsTab = document.querySelector('.menu-tab[data-tab="stats"]');
    if (statsTab) {
        statsTab.textContent = 'Start';
        statsTab.dataset.tab = 'start';
        statsTab.onclick = () => switchTab('start');
    }
    
    // Remove stats content if it exists
    const statsContent = document.getElementById('stats-content');
    if (statsContent) {
        statsContent.remove();
    }
    
    // Create start content
    const tabContent = document.getElementById('tab-content');
    if (tabContent) {
        // Create start content
        createStartTab(tabContent);
    }
    
    // Reset active tab
    activeTab = 'start';
    switchTab('start');
    
    // Hide menu toggle and close buttons
    const toggleButton = document.getElementById('menu-toggle');
    const closeButton = document.getElementById('menu-close');
    if (toggleButton) toggleButton.style.display = 'none';
    if (closeButton) closeButton.style.display = 'none';
    
    // Show the menu
    menuVisible = true;
    const menu = document.getElementById('main-menu');
    if (menu) menu.className = 'visible';
}

// When the module is loaded, expose necessary functions to window
window.toggleMenu = toggleMenu;
window.updateMenuStats = updateMenuStats;
window.resetMenuState = resetMenuState;

function createVolumeControl() {
    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'volume-control';
    volumeContainer.style.position = 'absolute';
    volumeContainer.style.top = '10px';
    volumeContainer.style.right = '10px';
    volumeContainer.style.display = 'flex';
    volumeContainer.style.alignItems = 'center';
    volumeContainer.style.gap = '10px';
    volumeContainer.style.padding = '10px';
    volumeContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    volumeContainer.style.borderRadius = '5px';
    volumeContainer.style.zIndex = '1000';

    // Create mute button
    const muteBtn = document.createElement('button');
    muteBtn.innerHTML = '🔊';
    muteBtn.style.background = 'none';
    muteBtn.style.border = 'none';
    muteBtn.style.color = '#fff';
    muteBtn.style.fontSize = '20px';
    muteBtn.style.cursor = 'pointer';
    muteBtn.onclick = () => {
        const isMuted = window.updateGameSettings({ muted: true });
        muteBtn.innerHTML = isMuted ? '🔇' : '🔊';
    };

    // Create volume slider
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = '70';
    volumeSlider.style.width = '100px';
    volumeSlider.oninput = (e) => {
        window.updateGameSettings({ volume: e.target.value / 100 });
    };

    volumeContainer.appendChild(muteBtn);
    volumeContainer.appendChild(volumeSlider);
    document.body.appendChild(volumeContainer);
} 