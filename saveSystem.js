// SaveSystem.js 
// Handles saving/loading game data with localStorage primary and cookies backup
// Auto-saves every 30 seconds and when game is paused

// Cookie utility functions
function setCookie(name, value, days = 30) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (JSON.stringify(value) || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            try {
                return JSON.parse(c.substring(nameEQ.length, c.length));
            } catch (e) {
                return c.substring(nameEQ.length, c.length);
            }
        }
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
}

class SaveSystem {
    constructor() {
        this.initialized = false;
        this.autoSaveInterval = null;
        this.lastSaveTime = 0;
        this.isSaving = false;
        this.useLocalStorage = true;
        this.useCookies = true;
        this.saveInProgress = false;
        this.pendingSaves = [];
        this.maxRetries = 3;
        this.saveKeys = [
            'deathAlleyUserProfile',
            'deathAlleyDailyTasks',
            'deathAlleyAchievements',
            'deathAlleyBadges',
            'deathAlleyNFTs',
            'deathAlleyGameLevels',
            'deathAlleySettings',
            'deathAlleyStats'
        ];
        this.setupEventListeners();
    }

    // Initialize the save system (alias for initialize for compatibility)
    async init() {
        return this.initialize();
    }

    // Initialize the save system
    async initialize() {
        if (this.initialized) return Promise.resolve();
        
        console.log("Initializing Save System...");
        
        try {
            // Check which storage methods are available
            this.checkStorageAvailability();
            
            // Set up auto-save interval
            this.startAutoSave();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log("Save System initialized successfully");
            return Promise.resolve();
        } catch (error) {
            console.error("Error initializing Save System:", error);
            return Promise.reject(error);
        }
    }
    
    // Check which storage methods are available
    checkStorageAvailability() {
        // Check if localStorage is available
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            this.useLocalStorage = true;
            console.log("localStorage is available");
        } catch (e) {
            this.useLocalStorage = false;
            console.warn("localStorage is not available, falling back to cookies only");
        }
        
        // Check if cookies are available
        try {
            document.cookie = "test=test; max-age=60";
            this.useCookies = document.cookie.indexOf('test=test') !== -1;
            console.log("Cookies are available:", this.useCookies);
        } catch (e) {
            this.useCookies = false;
            console.warn("Cookies are not available");
        }
        
        // If neither is available, warn about data loss
        if (!this.useLocalStorage && !this.useCookies) {
            console.error("No storage methods available! Game progress won't be saved.");
            this.showStorageWarning();
        }
    }
    
    // Set up auto-save interval
    startAutoSave() {
        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.saveAll();
        }, 30000);
        
        console.log("Auto-save interval started (30s)");
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Listen for game pause to save
        window.addEventListener('gamePaused', () => {
            console.log("Game paused, saving progress");
            this.saveAll();
        });
        
        // Listen for game completion to save
        window.addEventListener('gameCompleted', () => {
            console.log("Game completed, saving progress");
            this.saveAll();
        });
        
        // Listen for level completion to save
        window.addEventListener('levelCompleted', () => {
            console.log("Level completed, saving progress");
            this.saveAll();
        });
        
        // Listen for achievement unlocked to save
        window.addEventListener('achievementUnlocked', () => {
            console.log("Achievement unlocked, saving progress");
            this.saveAll();
        });
        
        // Listen for page unload to save
        window.addEventListener('beforeunload', () => {
            console.log("Page unloading, saving progress");
            this.saveAll(true); // Synchronous save on page unload
        });
        
        console.log("Save System event listeners set up");
    }
    
    // Show warning if storage isn't available
    showStorageWarning() {
        const warning = document.createElement('div');
        warning.style.position = 'fixed';
        warning.style.top = '10px';
        warning.style.left = '50%';
        warning.style.transform = 'translateX(-50%)';
        warning.style.backgroundColor = 'rgba(255, 152, 0, 0.9)';
        warning.style.color = 'white';
        warning.style.padding = '10px 20px';
        warning.style.borderRadius = '5px';
        warning.style.zIndex = '9999';
        warning.style.textAlign = 'center';
        warning.style.fontFamily = "'Chakra Petch', sans-serif";
        warning.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
        
        warning.textContent = "Warning: Storage is disabled or not available. Your game progress won't be saved!";
        
        document.body.appendChild(warning);
        
        // Remove after 10 seconds
        setTimeout(() => {
            warning.style.opacity = '0';
            warning.style.transition = 'opacity 1s ease';
            
            // Remove from DOM after fade out
            setTimeout(() => {
                warning.remove();
            }, 1000);
        }, 10000);
    }
    
    // Save all game data
    async saveAll(synchronous = false) {
        if (this.saveInProgress && !synchronous) {
            // Queue this save request to be processed after the current one
            this.pendingSaves.push(() => this.saveAll());
            console.log("Save already in progress, queued another save");
            return;
        }
        
        this.saveInProgress = true;
        this.lastSaveTime = Date.now();
        
        try {
            console.log("Saving all game data...");
            
            // Save user profile
            if (window.userProfile && window.userProfile.initialized) {
                await this.saveUserProfile();
            }
            
            // Save game state
            await this.saveGameState();
            
            // Save settings
            await this.saveSettings();
            
            // Dispatch save completed event
            window.dispatchEvent(new CustomEvent('saveCompleted', {
                detail: {
                    timestamp: this.lastSaveTime
                }
            }));
            
            console.log("All game data saved successfully");
        } catch (error) {
            console.error("Error saving game data:", error);
            
            // Retry failed save
            this.retrySave();
        } finally {
            this.saveInProgress = false;
            
            // Process any pending saves
            if (this.pendingSaves.length > 0) {
                const nextSave = this.pendingSaves.shift();
                nextSave();
            }
        }
    }
    
    // Save user profile
    async saveUserProfile() {
        if (!window.userProfile) return;
        
        try {
            await window.userProfile.saveProfile();
            console.log("User profile saved");
        } catch (error) {
            console.error("Error saving user profile:", error);
            throw error;
        }
    }
    
    // Save game state
    async saveGameState() {
        if (!this.useLocalStorage && !this.useCookies) return;
        
        try {
            // Get current game state
            const gameState = {
                currentLevel: window.currentLevel || 1,
                currentScore: window.playerScore || 0,
                currentGameMode: window.currentGameMode || 'normal',
                lastPlayed: new Date().toISOString()
            };
            
            // Save to storage
            await this.saveData('deathAlleyGameState', gameState);
            console.log("Game state saved");
        } catch (error) {
            console.error("Error saving game state:", error);
            throw error;
        }
    }
    
    // Save settings
    async saveSettings() {
        if (!this.useLocalStorage && !this.useCookies) return;
        
        try {
            // Get current settings
            const settings = {
                soundVolume: window.soundVolume || 1.0,
                musicVolume: window.musicVolume || 0.7,
                difficulty: window.gameDifficulty || 'normal',
                controlType: window.controlType || 'keyboard',
                lastUpdated: new Date().toISOString()
            };
            
            // Save to storage
            await this.saveData('deathAlleySettings', settings);
            console.log("Settings saved");
        } catch (error) {
            console.error("Error saving settings:", error);
            throw error;
        }
    }
    
    // Load all game data
    async loadAll() {
        try {
            console.log("Loading all game data...");
            
            // Load user profile
            if (window.userProfile) {
                await window.userProfile.initialize();
            }
            
            // Load game state
            const gameState = await this.loadData('deathAlleyGameState');
            
            // Load settings
            const settings = await this.loadData('deathAlleySettings');
            
            // Apply loaded data to game
            if (gameState) {
                window.currentLevel = gameState.currentLevel || 1;
                window.playerScore = gameState.currentScore || 0;
                window.currentGameMode = gameState.currentGameMode || 'normal';
                console.log("Game state loaded");
            }
            
            if (settings) {
                window.soundVolume = settings.soundVolume || 1.0;
                window.musicVolume = settings.musicVolume || 0.7;
                window.gameDifficulty = settings.difficulty || 'normal';
                window.controlType = settings.controlType || 'keyboard';
                console.log("Settings loaded");
            }
            
            console.log("All game data loaded successfully");
            return true;
        } catch (error) {
            console.error("Error loading game data:", error);
            return false;
        }
    }
    
    // Save data to storage
    async saveData(key, data) {
        // Stringify the data
        const jsonData = JSON.stringify(data);
        
        // Save to localStorage if available
        if (this.useLocalStorage) {
            try {
                localStorage.setItem(key, jsonData);
            } catch (e) {
                console.warn("localStorage save failed, falling back to cookies:", e);
                this.useLocalStorage = false;
            }
        }
        
        // Save to cookies as backup or if localStorage is unavailable
        if (!this.useLocalStorage && this.useCookies) {
            try {
                // Set a cookie that expires in 1 year
                const expires = new Date();
                expires.setFullYear(expires.getFullYear() + 1);
                
                // If data is too large, split it into chunks
                if (jsonData.length > 4000) {
                    const chunks = this.chunkString(jsonData, 3900);
                    
                    for (let i = 0; i < chunks.length; i++) {
                        document.cookie = `${key}_${i}=${encodeURIComponent(chunks[i])}; expires=${expires.toUTCString()}; path=/`;
                    }
                    
                    // Store the number of chunks
                    document.cookie = `${key}_chunks=${chunks.length}; expires=${expires.toUTCString()}; path=/`;
                } else {
                    document.cookie = `${key}=${encodeURIComponent(jsonData)}; expires=${expires.toUTCString()}; path=/`;
                }
            } catch (e) {
                console.error("Cookie save failed:", e);
                this.useCookies = false;
                throw new Error("All storage methods failed");
            }
        }
    }
    
    // Load data from storage
    async loadData(key) {
        let data = null;
        
        // Try to load from localStorage first
        if (this.useLocalStorage) {
            try {
                const stored = localStorage.getItem(key);
                if (stored) {
                    data = JSON.parse(stored);
                }
            } catch (e) {
                console.warn("localStorage load failed, falling back to cookies:", e);
                this.useLocalStorage = false;
            }
        }
        
        // If not found in localStorage, try cookies
        if (!data && this.useCookies) {
            try {
                // Check if data was chunked
                const chunksMatch = document.cookie.match(new RegExp(`${key}_chunks=([^;]+)`));
                
                if (chunksMatch) {
                    // Get number of chunks
                    const numChunks = parseInt(chunksMatch[1], 10);
                    let jsonData = '';
                    
                    // Combine chunks
                    for (let i = 0; i < numChunks; i++) {
                        const chunkMatch = document.cookie.match(new RegExp(`${key}_${i}=([^;]+)`));
                        if (chunkMatch) {
                            jsonData += decodeURIComponent(chunkMatch[1]);
                        }
                    }
                    
                    if (jsonData) {
                        data = JSON.parse(jsonData);
                    }
                } else {
                    // Try to get non-chunked data
                    const match = document.cookie.match(new RegExp(`${key}=([^;]+)`));
                    if (match) {
                        data = JSON.parse(decodeURIComponent(match[1]));
                    }
                }
            } catch (e) {
                console.error("Cookie load failed:", e);
                this.useCookies = false;
            }
        }
        
        return data;
    }
    
    // Helper to split string into chunks
    chunkString(str, size) {
        const numChunks = Math.ceil(str.length / size);
        const chunks = new Array(numChunks);
        
        for (let i = 0, o = 0; i < numChunks; i++, o += size) {
            chunks[i] = str.substr(o, size);
        }
        
        return chunks;
    }
    
    // Retry failed save
    retrySave(retryCount = 0) {
        if (retryCount >= this.maxRetries) {
            console.error("Max save retries reached, giving up");
            return;
        }
        
        console.log(`Retrying save (attempt ${retryCount + 1} of ${this.maxRetries})...`);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        
        setTimeout(() => {
            this.saveAll()
                .catch(() => {
                    this.retrySave(retryCount + 1);
                });
        }, delay);
    }
    
    // Load data (compatibility method for progressSystem)
    load(key) {
        return this.loadData(key);
    }

    // Save data (compatibility method for progressSystem)
    save(key, data) {
        return this.saveData(key, data);
    }

    // Clean up resources
    cleanup() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        // Final save
        this.saveAll(true);
        
        console.log("Save System cleaned up");
    }
}

// Create and export a singleton instance
export const saveSystem = new SaveSystem();
export default saveSystem; 