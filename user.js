// User Profile System
// Handles user data, achievements, badges, and statistics

// Use global BlockchainManager instead of importing
// Create blockchain manager instance after ensuring DOM is loaded
let blockchainManager = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.BlockchainManager) {
        console.log('Initializing BlockchainManager from global variable');
        blockchainManager = new window.BlockchainManager();
    } else {
        console.error('BlockchainManager not found globally');
    }
});

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

// Storage Manager for handling data persistence across different storage mechanisms
class StorageManager {
    static async save(key, value) {
        try {
            // Primary storage
            localStorage.setItem(key, JSON.stringify(value));
            
            // Backup storage
            setCookie(key, value);
            
            // If connected to blockchain, sync relevant data
            if (blockchainManager && blockchainManager.isConnected) {
                await blockchainManager.syncData(key, value);
            }
            
            return true;
                } catch (error) {
            console.error('StorageManager save error:', error);
            return false;
        }
    }

    static async load(key) {
        try {
            // Try primary storage first
            const localData = localStorage.getItem(key);
            if (localData) {
                return JSON.parse(localData);
            }

            // Try cookie backup
            const cookieData = getCookie(key);
            if (cookieData) {
                // Sync back to localStorage
                await this.save(key, cookieData);
                return cookieData;
            }

            // Try blockchain if connected
            if (blockchainManager && blockchainManager.isConnected) {
                const chainData = await blockchainManager.loadData(key);
                if (chainData) {
                    // Sync to local storage
                    await this.save(key, chainData);
                    return chainData;
                }
            }

            return null;
            } catch (error) {
            console.error('StorageManager load error:', error);
            return null;
        }
    }

    static async clear(key) {
        try {
            localStorage.removeItem(key);
            deleteCookie(key);
            if (blockchainManager && blockchainManager.isConnected) {
                await blockchainManager.clearData(key);
            }
            return true;
        } catch (error) {
            console.error('StorageManager clear error:', error);
            return false;
        }
    }
}

// Device fingerprint generator
const generateDeviceFingerprint = () => {
    const components = [
        navigator.userAgent,
        navigator.language,
        new Date().getTimezoneOffset(),
        screen.width,
        screen.height,
        screen.colorDepth
    ];
    return components.join('|');
};

// Define user profile structure
class UserProfile {
    constructor() {
        this.initialized = false;
        this.dailyTasks = {
            tasks: [],
            lastUpdated: null
        };
        this.initPromise = this.initialize();
        this.connectedWallet = null;
        this.dCoin = {
            balance: 0,
            totalEarned: 0,
            lastUpdated: new Date().toISOString(),
            transactions: []
        };
        this.xp = {
            current: 0,
            level: 1,
            nextLevelAt: 100, // Base XP needed for level 2
            totalEarned: 0
        };
    }

    async initialize() {
        try {
            // Load from local storage first
            const savedProfile = await StorageManager.load('userProfile');
            if (savedProfile) {
                Object.assign(this, savedProfile);
            }

            // Initialize stats if not present
            if (!this.stats) {
        this.stats = {
            battles: 0,
            victories: 0,
            totalScore: 0,
            highScore: 0,
            enemiesDefeated: 0,
            deaths: 0,
            timePlayed: 0,
                    lastPlayed: new Date().toISOString(),
                    lastLevel: 1
        };
            }
        
            // Initialize game modes if not present
            if (!this.gameModes) {
        this.gameModes = {
            normal: {
                levelsCompleted: 0,
                bestScore: 0,
                totalKills: 0,
                levels: {}
            },
            timeTrial: {
                bestTimes: [null, null, null],
                checkpointsHit: 0,
                attempts: 0,
                completions: 0
            },
            obstacle: {
                obstaclesCleared: 0,
                longestRun: 0,
                boostRampsUsed: 0
                    },
                    survival: {
                        highestWave: 0,
                        totalWaves: 0,
                        bossesDefeated: 0
            }
        };
            }
        
            // Initialize achievements if not present
            if (!this.achievements) {
        this.achievements = this.initDefaultAchievements();
                console.log("Initialized default achievements:", this.achievements.length);
            }

            // Initialize badges if not present
            if (!this.badges) {
        this.badges = this.initDefaultBadges();
                console.log("Initialized default badges:", this.badges.length);
            }

            // Initialize NFTs if not present
            if (!this.nfts) {
                this.nfts = {
            minted: [],
                    eligible: this.initDefaultEligibleNFTs()
                };
                console.log("Initialized default NFTs:", this.nfts.eligible.length);
            }

            // Initialize daily tasks if needed
            await this.initializeDailyTasks();

            this.initialized = true;
            await this.saveProfile();
            console.log("User profile initialized successfully");
        } catch (error) {
            console.error("Error initializing user profile:", error);
            this.initialized = true;
            await this.saveProfile();
        }
    }

    async initializeDailyTasks() {
        const today = new Date().toISOString().split('T')[0];
        const savedTasks = localStorage.getItem('deathAlleyDailyTasks');
        
        if (savedTasks) {
            try {
                const tasks = JSON.parse(savedTasks);
                if (tasks.date === today) {
                    this.dailyTasks = tasks;
                    console.log("Loaded daily tasks for today:", this.dailyTasks);
                    return;
                }
            } catch (error) {
                console.error("Error parsing saved daily tasks:", error);
            }
        }
        
        // Generate new tasks for today
        console.log("Generating new daily tasks for today");
        const generatedTasks = this.generateDailyTasks();
        
        this.dailyTasks = {
            date: today,
            lastUpdated: new Date().toISOString(),
            tasks: generatedTasks
        };
        
        // Save to localStorage
        try {
            localStorage.setItem('deathAlleyDailyTasks', JSON.stringify(this.dailyTasks));
            console.log("Saved new daily tasks:", this.dailyTasks);
        } catch (error) {
            console.error("Error saving daily tasks:", error);
        }
    }

    // Generate random daily tasks
    generateDailyTasks() {
        const taskCategories = [
            {
                name: 'combat',
                tasks: [
                    { id: 'defeat_enemies', title: 'Road Rage', description: 'Defeat 25 enemy vehicles', progress: 0, total: 25, reward: 150, completed: false },
                    { id: 'perfect_dash', title: 'Perfect Dash', description: 'Successfully dash through 10 enemies with invulnerability', progress: 0, total: 10, reward: 100, completed: false },
                    { id: 'killstreak', title: 'Killstreak Master', description: 'Defeat 5 enemies within one dash cooldown (2s)', progress: 0, total: 5, reward: 200, completed: false },
                    { id: 'critical_hits', title: 'Precision Driver', description: 'Land 15 critical hits on enemy weak points', progress: 0, total: 15, reward: 150, completed: false }
                ]
            },
            {
                name: 'movement',
                tasks: [
                    { id: 'double_jumps', title: 'Air Master', description: 'Successfully chain 20 double jumps', progress: 0, total: 20, reward: 100, completed: false },
                    { id: 'dash_distance', title: 'Speed Demon', description: 'Travel 1000 pixels using dash moves', progress: 0, total: 1000, reward: 100, completed: false },
                    { id: 'near_misses', title: 'Close Call', description: 'Perform 15 near misses with enemies while dashing', progress: 0, total: 15, reward: 150, completed: false }
                ]
            },
            {
                name: 'progression',
                tasks: [
                    { id: 'clear_waves', title: 'Wave Crusher', description: 'Clear 3 enemy waves without taking damage', progress: 0, total: 3, reward: 200, completed: false },
                    { id: 'survive_scaling', title: 'Survivor', description: 'Survive 2 difficulty scaling increases (+20% enemy HP)', progress: 0, total: 2, reward: 150, completed: false },
                    { id: 'high_score', title: 'Score Hunter', description: 'Achieve a score of 10,000 in one run', progress: 0, total: 10000, reward: 200, completed: false }
                ]
            },
            {
                name: 'shooting',
                tasks: [
                    { id: 'accuracy', title: 'Sharpshooter', description: 'Maintain 80% shot accuracy for 3 minutes', progress: 0, total: 3, reward: 150, completed: false },
                    { id: '360_shots', title: '360 No Scope', description: 'Hit 10 enemies while performing 360° rotations', progress: 0, total: 10, reward: 200, completed: false },
                    { id: 'rapid_fire', title: 'Rapid Fire', description: 'Hit 30 enemies within 10 seconds', progress: 0, total: 30, reward: 200, completed: false }
                ]
            }
        ];
        
        // Always include blockchain check-in task
        const blockchainTask = { 
            id: 'blockchain_checkin', 
            title: 'Daily Check-in', 
            description: 'Connect your wallet for daily DCoin bonus', 
            progress: 0, 
            total: 1, 
            reward: 100, 
            completed: false,
            isBlockchain: true 
        };
        
        // Select 4 random tasks (one from each category)
        const selectedTasks = taskCategories.map(category => {
            const randomTask = category.tasks[Math.floor(Math.random() * category.tasks.length)];
            return { ...randomTask };
        });
        
        // Randomly select one more task from any category
        const allTasks = taskCategories.flatMap(category => category.tasks);
        const extraTask = allTasks[Math.floor(Math.random() * allTasks.length)];
        selectedTasks.push({ ...extraTask });
        
        // Add blockchain task as the 6th task
        selectedTasks.push({ ...blockchainTask });
        
        return selectedTasks;
    }

    // Save profile to both local storage and cookie
    async saveProfile() {
        if (!this.initialized) {
            await this.initPromise;
        }

        try {
            const profile = {
                stats: this.stats,
                gameModes: this.gameModes,
                achievements: this.achievements,
                badges: this.badges,
                settings: this.settings,
                dCoin: this.dCoin,
                nfts: this.nfts,
                dailyTasks: this.dailyTasks,
                connectedWallet: this.connectedWallet,
                xp: this.xp
            };

            // Save to local storage
            await StorageManager.save('userProfile', profile);

            return true;
        } catch (error) {
            console.error("Error saving profile:", error);
            return false;
        }
    }

    // Connect wallet
    async connectWallet(walletAddress) {
        if (this.connectedWallet) {
            throw new Error("Wallet already connected");
        }

        try {
            this.connectedWallet = walletAddress;
            await this.saveProfile();
            return true;
        } catch (error) {
            console.error("Error connecting wallet:", error);
            return false;
        }
    }

    // Get connected wallet
    getConnectedWallet() {
        return this.connectedWallet;
    }
    
    // Initialize default achievements
    initDefaultAchievements() {
        return [
            // Progression Achievements
            {
                id: 'road-warrior',
                title: 'Road Warrior',
                description: 'Complete Level 1 for the first time',
                icon: 'textures/achievements/road-warrior.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 50,
                minted: false
            },
            {
                id: 'highway-to-hell',
                title: 'Highway to Hell',
                description: 'Complete Level 2 for the first time',
                icon: 'textures/achievements/highway-to-hell.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 75,
                minted: false
            },
            {
                id: 'death-alley-master',
                title: 'Death Alley Master',
                description: 'Complete Level 3 for the first time',
                icon: 'textures/achievements/master.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 100,
                minted: false
            },
            {
                id: 'full-throttle',
                title: 'Full Throttle',
                description: 'Finish all levels on Normal mode',
                icon: 'textures/achievements/full-throttle.png',
                unlocked: false,
                progress: 0,
                total: 3,
                xpReward: 150,
                minted: false
            },
            
            // Combat Achievements
            {
                id: 'first-blood',
                title: 'First Blood',
                description: 'Defeat your first enemy vehicle',
                icon: 'textures/achievements/first-blood.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 25,
                minted: false
            },
            {
                id: 'vehicular-manslaughter',
                title: 'Vehicular Manslaughter',
                description: 'Defeat 50 enemy vehicles',
                icon: 'textures/achievements/manslaughter.png',
                unlocked: false,
                progress: 0,
                total: 50,
                xpReward: 100,
                minted: false
            },
            {
                id: 'destruction-derby',
                title: 'Destruction Derby',
                description: 'Defeat 200 enemy vehicles',
                icon: 'textures/achievements/derby.png',
                unlocked: false,
                progress: 0,
                total: 200,
                xpReward: 250,
                minted: false
            },
            {
                id: 'precision',
                title: 'Precision',
                description: 'Hit 85% of your shots in one complete level',
                icon: 'textures/achievements/precision.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 75,
                minted: false
            },
            
            // Time Trial Achievements
            {
                id: 'speed-demon',
                title: 'Speed Demon',
                description: 'Complete a Time Trial level under 1:30',
                icon: 'textures/achievements/speed-demon.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 100,
                minted: false
            },
            {
                id: 'checkpoint-hunter',
                title: 'Checkpoint Hunter',
                description: 'Hit all checkpoints in a Time Trial run',
                icon: 'textures/achievements/checkpoint-hunter.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 75,
                minted: false
            },
            
            // Obstacle Mode Achievements
            {
                id: 'obstacle-master',
                title: 'Obstacle Master',
                description: 'Clear 100 obstacles in Obstacle Gauntlet',
                icon: 'textures/achievements/obstacle-master.png',
                unlocked: false,
                progress: 0,
                total: 100,
                xpReward: 100,
                minted: false
            },
            {
                id: 'marathon-runner',
                title: 'Marathon Runner',
                description: 'Travel 5000m in Obstacle Gauntlet',
                icon: 'textures/achievements/marathon.png',
                unlocked: false,
                progress: 0,
                total: 5000,
                xpReward: 150,
                minted: false
            },
            
            // Special Achievements
            {
                id: 'untouchable',
                title: 'Untouchable',
                description: 'Complete any level without taking damage',
                icon: 'textures/achievements/untouchable.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 125,
                minted: false
            },
            {
                id: 'daredevil',
                title: 'Daredevil',
                description: 'Perform 50 near misses with obstacles',
                icon: 'textures/achievements/daredevil.png',
                unlocked: false,
                progress: 0,
                total: 50,
                xpReward: 100,
                minted: false
            },
            {
                id: 'veteran',
                title: 'Death Alley Veteran',
                description: 'Play for more than 10 hours total',
                icon: 'textures/achievements/veteran.png',
                unlocked: false,
                progress: 0,
                total: 36000000, // 10 hours in ms
                xpReward: 200,
                minted: false
            },
            // New Achievements
            {
                id: 'wave-master',
                title: 'Wave Master',
                description: 'Survive 10 waves in Survival mode',
                icon: 'textures/achievements/wave-master.png',
                unlocked: false,
                progress: 0,
                total: 10,
                xpReward: 150,
                minted: false
            },
            {
                id: 'boss-slayer',
                title: 'Boss Slayer',
                description: 'Defeat 5 boss enemies in Survival mode',
                icon: 'textures/achievements/boss-slayer.png',
                unlocked: false,
                progress: 0,
                total: 5,
                xpReward: 175,
                minted: false
            },
            {
                id: 'combo-king',
                title: 'Combo King',
                description: 'Defeat 10 enemies within 5 seconds',
                icon: 'textures/achievements/combo-king.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 125,
                minted: false
            },
            {
                id: 'speed-runner',
                title: 'Speed Runner',
                description: 'Complete all Time Trial levels under 5 minutes total',
                icon: 'textures/achievements/speed-runner.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 200,
                minted: false
            },
            {
                id: 'perfect-run',
                title: 'Perfect Run',
                description: 'Complete any level without missing a single shot',
                icon: 'textures/achievements/perfect-run.png',
                unlocked: false,
                progress: 0,
                total: 1,
                xpReward: 150,
                minted: false
            }
        ];
    }
    
    // Initialize default badges
    initDefaultBadges() {
        return [
            // Level Mastery Badges
            {
                id: 'level1-master',
                title: 'Level 1 Master',
                description: 'Complete Level 1 with a perfect score',
                icon: 'textures/badges/level1-master.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'level2-master',
                title: 'Level 2 Master',
                description: 'Complete Level 2 with a perfect score',
                icon: 'textures/badges/level2-master.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'level3-master',
                title: 'Level 3 Master',
                description: 'Complete Level 3 with a perfect score',
                icon: 'textures/badges/level3-master.png',
                unlocked: false,
                minted: false
            },
            
            // Speed Badges
            {
                id: 'speed-demon',
                title: 'Speed Demon',
                description: 'Maintain top speed for 30 seconds',
                icon: 'textures/badges/speed-demon.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'timekeeper',
                title: 'Timekeeper',
                description: 'Beat developer time in all Time Trial levels',
                icon: 'textures/badges/timekeeper.png',
                unlocked: false,
                minted: false
            },
            
            // Combat Badges
            {
                id: 'marksman',
                title: 'Marksman',
                description: 'Defeat 10 enemies without missing a shot',
                icon: 'textures/badges/marksman.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'exterminator',
                title: 'Exterminator',
                description: 'Defeat 5 enemies in 10 seconds',
                icon: 'textures/badges/exterminator.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'tactical-genius',
                title: 'Tactical Genius',
                description: 'Complete a level using only 3 shots',
                icon: 'textures/badges/tactical.png',
                unlocked: false,
                minted: false
            },
            
            // Style Badges
            {
                id: 'stunt-driver',
                title: 'Stunt Driver',
                description: 'Perform a 720° spin jump',
                icon: 'textures/badges/stunt.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'ghost-driver',
                title: 'Ghost Driver',
                description: 'Complete a level without being seen by enemies',
                icon: 'textures/badges/ghost.png',
                unlocked: false,
                minted: false
            },
            
            // Endurance Badges
            {
                id: 'survivor',
                title: 'Survivor',
                description: 'Survive with less than 10% health',
                icon: 'textures/badges/survivor.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'veteran',
                title: 'Veteran',
                description: 'Play for more than 10 hours total',
                icon: 'textures/badges/veteran.png',
                unlocked: false,
                minted: false
            },
            
            // Special Achievement Badges
            {
                id: 'completionist',
                title: 'Completionist',
                description: 'Unlock all achievements',
                icon: 'textures/badges/completionist.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'legend',
                title: 'Death Alley Legend',
                description: 'Reach the highest rank',
                icon: 'textures/badges/legend.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'blockchain-pioneer',
                title: 'Blockchain Pioneer',
                description: 'Mint your first achievement or badge as NFT',
                icon: 'textures/badges/blockchain.png',
                unlocked: false,
                minted: false
            },
            // New Badges
            {
                id: 'survival-elite',
                title: 'Survival Elite',
                description: 'Reach wave 20 in Survival mode',
                icon: 'textures/badges/survival-elite.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'boss-hunter',
                title: 'Boss Hunter',
                description: 'Defeat a boss without taking damage',
                icon: 'textures/badges/boss-hunter.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'speed-master',
                title: 'Speed Master',
                description: 'Set a new record in all Time Trial levels',
                icon: 'textures/badges/speed-master.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'perfect-warrior',
                title: 'Perfect Warrior',
                description: 'Complete all levels with 100% accuracy',
                icon: 'textures/badges/perfect-warrior.png',
                unlocked: false,
                minted: false
            },
            {
                id: 'ultimate-champion',
                title: 'Ultimate Champion',
                description: 'Complete all achievements and earn all other badges',
                icon: 'textures/badges/ultimate-champion.png',
                unlocked: false,
                minted: false
            }
        ];
    }
    
    // Initialize default daily tasks
    initDailyTasks() {
        const today = new Date().toISOString().split('T')[0];
        const savedTasks = localStorage.getItem('deathAlleyDailyTasks');
        
        if (savedTasks) {
            const tasks = JSON.parse(savedTasks);
            
            // Check if tasks are from today
            if (tasks.date === today) {
                return tasks.tasks;
            }
        }
        
        // If no tasks or tasks are old, generate new ones
        return this.generateDailyTasks(today);
    }

    // Generate random daily tasks
    generateDailyTasks(date) {
        const taskCategories = [
            {
                name: 'combat',
                tasks: [
                    { id: 'defeat-enemies', title: 'Road Rage', description: 'Defeat 15 enemy vehicles', progress: 0, total: 15, reward: 100 },
                    { id: 'headshots', title: 'Critical Hit', description: 'Land 10 critical hits on enemy vehicles', progress: 0, total: 10, reward: 100 },
                    { id: 'vehicle-types', title: 'Vehicle Hunter', description: 'Defeat 3 different types of enemy vehicles', progress: 0, total: 3, reward: 100 }
                ]
            },
            {
                name: 'driving',
                tasks: [
                    { id: 'distance', title: 'Road Warrior', description: 'Drive a total of 2000 meters', progress: 0, total: 2000, reward: 100 },
                    { id: 'top-speed', title: 'Need for Speed', description: 'Maintain top speed for a total of 60 seconds', progress: 0, total: 60, reward: 100 },
                    { id: 'drift', title: 'Drift King', description: 'Perform 10 drift maneuvers', progress: 0, total: 10, reward: 100 }
                ]
            },
            {
                name: 'time-trial',
                tasks: [
                    { id: 'complete-trial', title: 'Beat the Clock', description: 'Complete a Time Trial level', progress: 0, total: 1, reward: 100 },
                    { id: 'checkpoints', title: 'Checkpoint Master', description: 'Hit 20 checkpoints in Time Trial mode', progress: 0, total: 20, reward: 100 },
                    { id: 'time-under', title: 'Speed Run', description: 'Complete Level 1 under 2 minutes', progress: 0, total: 1, reward: 100 }
                ]
            },
            {
                name: 'obstacle',
                tasks: [
                    { id: 'clear-obstacles', title: 'Obstacle Course', description: 'Clear 30 obstacles in Obstacle mode', progress: 0, total: 30, reward: 100 },
                    { id: 'boost-ramps', title: 'Ramp Jumper', description: 'Use 5 boost ramps in Obstacle mode', progress: 0, total: 5, reward: 100 },
                    { id: 'distance-obstacle', title: 'Marathon', description: 'Travel 1000m in Obstacle mode', progress: 0, total: 1000, reward: 100 }
                ]
            },
            {
                name: 'general',
                tasks: [
                    { id: 'play-modes', title: 'Jack of All Trades', description: 'Play all 3 game modes once', progress: 0, total: 3, reward: 100 },
                    { id: 'collect-powerups', title: 'Power Collector', description: 'Collect 10 power-ups', progress: 0, total: 10, reward: 100 },
                    { id: 'near-misses', title: 'Close Call', description: 'Perform 15 near misses with obstacles or enemies', progress: 0, total: 15, reward: 100 }
                ]
            }
        ];
        
        // Always include blockchain check-in task
        const blockchainTask = { 
            id: 'blockchain-checkin', 
            title: 'Blockchain Check-in', 
            description: 'Connect your wallet for daily check-in reward', 
            progress: 0, 
            total: 1, 
            reward: 100, 
            isBlockchain: true 
        };
        
        // Randomly select 3 categories
        const shuffledCategories = [...taskCategories].sort(() => 0.5 - Math.random());
        const selectedCategories = shuffledCategories.slice(0, 3);
        
        // Randomly select 3 tasks, one from each category
        const selectedTasks = selectedCategories.map(category => {
            const randomTask = category.tasks[Math.floor(Math.random() * category.tasks.length)];
            return { ...randomTask, completed: false };
        });
        
        // Add blockchain task
        selectedTasks.push({ ...blockchainTask, completed: false });
        
        // Save to localStorage
        const dailyTasks = {
            date,
            tasks: selectedTasks,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('deathAlleyDailyTasks', JSON.stringify(dailyTasks));
        
        return selectedTasks;
    }

    // Update daily task progress
    updateDailyTaskProgress(taskId, progressIncrement = 1) {
        if (!this.dailyTasks || !this.dailyTasks.tasks) return false;
        
        const task = this.dailyTasks.tasks.find(t => t.id === taskId);
        
        if (task && !task.completed) {
            task.progress = Math.min(task.progress + progressIncrement, task.total);
            
            // Check if task is completed
            if (task.progress >= task.total) {
                task.completed = true;
                // Award DCoins for completing the task
                this.addDCoins(task.reward, 'daily_task');
            }
            
            this.saveProfile();
            
            return { 
                completed: task.completed, 
                progress: task.progress, 
                total: task.total 
            };
        }
        
        return false;
    }

    // Get completed daily tasks count
    getCompletedDailyTasksCount() {
        if (!this.dailyTasks || !this.dailyTasks.tasks) return { completed: 0, total: 0 };
        
        const completed = this.dailyTasks.tasks.filter(task => task.completed).length;
        return { 
            completed, 
            total: this.dailyTasks.tasks.length 
        };
    }

    // Format task name
    formatTaskName(taskId) {
        return taskId.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Update game statistics after a game session
    async updateGameStats(gameStats) {
        if (!gameStats) return;

        try {
            // Update basic stats
            this.stats.battles++;
            if (gameStats.victory) {
                this.stats.victories++;
                // Award victory XP
                await this.addXP(50 * gameStats.level, 'victory');
            }
            
            // Update mode-specific stats
            const gameMode = gameStats.mode || 'normal'; // Default to normal mode if not specified
            if (!this.gameModes[gameMode]) {
                this.gameModes[gameMode] = {
                    levelsCompleted: 0,
                    bestScore: 0,
                    totalKills: 0,
                    levels: {}
                };
            }
            
            // Update mode-specific stats
            if (gameMode === 'normal') {
                // Update normal mode best score
                this.gameModes.normal.bestScore = Math.max(this.gameModes.normal.bestScore, gameStats.score || 0);
                // Update normal mode total kills
                if (gameStats.enemiesDefeated) {
                    this.gameModes.normal.totalKills = (this.gameModes.normal.totalKills || 0) + gameStats.enemiesDefeated;
                }
            }
            
            // Update general stats
            this.stats.totalScore += gameStats.score || 0;
            this.stats.highScore = Math.max(this.stats.highScore, gameStats.score || 0);
            
            // Update enemies defeated - ensure we're not double counting
            const newEnemiesDefeated = gameStats.enemiesDefeated || 0;
            if (newEnemiesDefeated > 0) {
                this.stats.enemiesDefeated = (this.stats.enemiesDefeated || 0) + newEnemiesDefeated;
                // Award XP for enemies defeated (2 XP per enemy)
                await this.addXP(newEnemiesDefeated * 2, 'combat');
                // Update daily task
                this.updateDailyTaskProgress('defeat-enemies', newEnemiesDefeated);
            }
            
            this.stats.deaths += gameStats.deaths || 0;
            this.stats.timePlayed += gameStats.timePlayed || 0;
            this.stats.lastPlayed = new Date().toISOString();

            // Award XP for score milestones
            const scoreXP = Math.floor(gameStats.score / 1000) * 5; // 5 XP per 1000 points
            if (scoreXP > 0) {
                await this.addXP(scoreXP, 'score');
            }

            // Award XP for survival time (1 XP per minute)
            const survivalMinutes = Math.floor(gameStats.timePlayed / (1000 * 60));
            if (survivalMinutes > 0) {
                await this.addXP(survivalMinutes, 'survival');
            }

            // Update remaining daily tasks
            if (gameStats.perfectDashes) {
                this.updateDailyTaskProgress('perfect-dash', gameStats.perfectDashes);
            }
            if (gameStats.killstreaks) {
                this.updateDailyTaskProgress('killstreak', gameStats.killstreaks);
            }
            if (gameStats.criticalHits) {
                this.updateDailyTaskProgress('critical-hits', gameStats.criticalHits);
            }
            if (gameStats.doubleJumps) {
                this.updateDailyTaskProgress('double-jumps', gameStats.doubleJumps);
            }
            if (gameStats.dashDistance) {
                this.updateDailyTaskProgress('dash-distance', gameStats.dashDistance);
            }
            if (gameStats.nearMisses) {
                this.updateDailyTaskProgress('near-misses', gameStats.nearMisses);
            }
            if (gameStats.wavesCleared) {
                this.updateDailyTaskProgress('clear-waves', gameStats.wavesCleared);
            }
            if (gameStats.difficultyIncreases) {
                this.updateDailyTaskProgress('survive-scaling', gameStats.difficultyIncreases);
            }
            if (gameStats.score) {
                this.updateDailyTaskProgress('high-score', gameStats.score);
            }
            if (gameStats.accuracyTime) {
                this.updateDailyTaskProgress('accuracy', gameStats.accuracyTime);
            }
            if (gameStats.spinKills) {
                this.updateDailyTaskProgress('360-shots', gameStats.spinKills);
            }
            if (gameStats.rapidKills) {
                this.updateDailyTaskProgress('rapid-fire', gameStats.rapidKills);
            }

            // Add base DCoins for playing (1 per enemy defeated)
            const baseReward = Math.floor(gameStats.enemiesDefeated || 0);
            if (baseReward > 0) {
                await this.addDCoins(baseReward, 'gameplay');
            }

            // Add bonus DCoins for high scores
            if (gameStats.score >= 10000) {
                await this.addDCoins(100, 'high_score');
            } else if (gameStats.score >= 5000) {
                await this.addDCoins(50, 'high_score');
            }

            // Add bonus DCoins for win streaks
            if (this.stats.victories >= 3) {
                await this.addDCoins(25, 'win_streak');
            }

            // Save updated profile
            await this.saveProfile();

            // Dispatch event for UI updates
            document.dispatchEvent(new CustomEvent('profileUpdated'));

                    return true;
                } catch (error) {
            console.error("Error updating game stats:", error);
            return false;
        }
    }

    // Add DCoins to balance
    async addDCoins(amount, source = 'gameplay') {
        if (!amount || amount <= 0) return false;
        
        try {
            // Update balance
        this.dCoin.balance += amount;
        this.dCoin.totalEarned += amount;
        this.dCoin.lastUpdated = new Date().toISOString();
        
            // Record transaction
        this.dCoin.transactions.push({
                amount,
                source,
            timestamp: new Date().toISOString()
        });
        
            // Save profile
            await this.saveProfile();

            // Dispatch event for UI updates
            document.dispatchEvent(new CustomEvent('profileUpdated'));
        
        return true;
        } catch (error) {
            console.error("Error adding DCoins:", error);
            return false;
        }
    }

    // Update game progress with enhanced tracking
    async updateGameProgress(state) {
        if (!this.initialized) {
            await this.initPromise;
        }

        try {
            // Update basic stats
            this.stats.totalScore += state.score;
            if (state.score > this.stats.highScore) {
                this.stats.highScore = state.score;
            }
            this.stats.timePlayed += state.time;
            this.stats.lastPlayed = new Date().toISOString();

            // Update game mode specific stats
            const mode = state.mode.toLowerCase();
            if (!this.gameModes[mode]) {
                this.gameModes[mode] = {};
            }

            // Update level progress
            if (state.level > this.gameModes[mode].levelsCompleted) {
                this.gameModes[mode].levelsCompleted = state.level;
            }

            // Update best score
            if (state.score > (this.gameModes[mode].bestScore || 0)) {
                this.gameModes[mode].bestScore = state.score;
            }

            // Process achievements
            await this.processAchievements(state.achievements);

            // Process daily tasks
            await this.processDailyTasks(state.dailyTasks);

            // Update DCoin balance based on achievements and tasks
            await this.updateDCoinBalance(state);

            // Save changes
            await this.saveProfile();

            // Notify UI of updates
            this.notifyUIUpdate();

        } catch (error) {
            console.error("Error updating game progress:", error);
        }
    }

    // Process achievements
    async processAchievements(achievements) {
        try {
            const { enemiesDefeated, levelsCompleted, timeAlive, powerUpsCollected } = achievements;

            // Process enemy defeat achievements
            if (enemiesDefeated >= 100) this.unlockAchievement('enemy_slayer_1');
            if (enemiesDefeated >= 500) this.unlockAchievement('enemy_slayer_2');
            if (enemiesDefeated >= 1000) this.unlockAchievement('enemy_slayer_3');

            // Process level completion achievements
            if (levelsCompleted >= 5) this.unlockAchievement('level_master_1');
            if (levelsCompleted >= 10) this.unlockAchievement('level_master_2');
            if (levelsCompleted >= 20) this.unlockAchievement('level_master_3');

            // Process survival achievements
            const survivalTimeHours = timeAlive / (1000 * 60 * 60);
            if (survivalTimeHours >= 1) this.unlockAchievement('survivor_1');
            if (survivalTimeHours >= 5) this.unlockAchievement('survivor_2');
            if (survivalTimeHours >= 10) this.unlockAchievement('survivor_3');

            // Process power-up achievements
            if (powerUpsCollected >= 10) this.unlockAchievement('power_collector_1');
            if (powerUpsCollected >= 50) this.unlockAchievement('power_collector_2');
            if (powerUpsCollected >= 100) this.unlockAchievement('power_collector_3');

        } catch (error) {
            console.error("Error processing achievements:", error);
        }
    }

    // Process daily tasks
    async processDailyTasks(tasks) {
        try {
            const today = new Date().toISOString().split('T')[0];
            if (!this.dailyTasks) {
                this.dailyTasks = {
                    lastUpdate: today,
                    tasks: {},
                    completed: []
                };
            }

            // Reset tasks if it's a new day
            if (this.dailyTasks.lastUpdate !== today) {
                this.dailyTasks = {
                    lastUpdate: today,
                    tasks: {},
                    completed: []
                };
            }

            // Update task progress
            const { killCount, survivalTime, powerUpsUsed, levelsCleared } = tasks;

            // Daily kill count task
            this.updateDailyTask('daily_kills', killCount, 100, 50);

            // Daily survival time task (in minutes)
            this.updateDailyTask('daily_survival', survivalTime / (1000 * 60), 30, 100);

            // Daily power-ups task
            this.updateDailyTask('daily_powerups', powerUpsUsed, 10, 25);

            // Daily levels task
            this.updateDailyTask('daily_levels', levelsCleared, 3, 75);

    } catch (error) {
            console.error("Error processing daily tasks:", error);
        }
    }

    // Update a daily task
    updateDailyTask(taskId, current, target, reward) {
        if (!this.dailyTasks.tasks[taskId]) {
            this.dailyTasks.tasks[taskId] = {
                current: 0,
                target,
                reward,
                completed: false
            };
        }

        const task = this.dailyTasks.tasks[taskId];
        if (!task.completed) {
            task.current = Math.min(current, target);
            if (task.current >= target && !this.dailyTasks.completed.includes(taskId)) {
                task.completed = true;
                this.addDCoins(reward);
            }
        }
    }

    // Update DCoin balance
    async updateDCoinBalance(state) {
        try {
            console.log('Starting DCoin balance update...', {
                currentState: state,
                currentBalance: this.dcoins
            });

            // Base rewards
            const baseRewards = {
                killReward: 1,      // 1 DCoin per kill
                levelReward: 50,    // 50 DCoins per level
                survivalReward: 10  // 10 DCoins per minute survived
            };

            // Calculate rewards
            const kills = Math.floor(state.score / 100); // Assuming 100 points per kill
            const levels = state.level - this.stats.lastLevel;
            const survivalMinutes = Math.floor(state.time / (1000 * 60));

            console.log('Reward calculations:', {
                kills,
                levels,
                survivalMinutes,
                baseRewards
            });

            let totalReward = 0;
            totalReward += kills * baseRewards.killReward;
            totalReward += levels * baseRewards.levelReward;
            totalReward += survivalMinutes * baseRewards.survivalReward;

            // Apply any active boosters
            if (this.boosters && this.boosters.coinMultiplier) {
                console.log('Applying booster multiplier:', this.boosters.coinMultiplier);
                totalReward *= this.boosters.coinMultiplier;
            }

            console.log('Final reward calculation:', {
                totalReward,
                currentBalance: this.dcoins,
                newBalance: this.dcoins + Math.floor(totalReward)
            });

            // Update balance
            await this.addDCoins(Math.floor(totalReward));

            // Update last level for next calculation
            this.stats.lastLevel = state.level;

            console.log('DCoin balance update complete:', {
                finalBalance: this.dcoins,
                lastLevel: this.stats.lastLevel
            });

        } catch (error) {
            console.error("Error updating DCoin balance:", error);
            throw error;
        }
    }

    // Add DCoin balance getter and setter
    get dcoins() {
        // Ensure we're returning a number
        return typeof this._dcoins === 'number' ? this._dcoins : 0;
    }

    set dcoins(value) {
        // Ensure we're setting a number
        this._dcoins = typeof value === 'number' ? value : 0;
        // Trigger any necessary UI updates
        this.updateDCoinDisplay();
    }

    // Helper method to update DCoin display
    updateDCoinDisplay() {
        const dcoinDisplays = document.querySelectorAll('.dcoin-display');
        dcoinDisplays.forEach(display => {
            display.textContent = this.dcoins.toLocaleString();
        });
    }

    // Notify UI of updates
    notifyUIUpdate() {
        const event = new CustomEvent('userProfileUpdated', {
            detail: {
                stats: this.stats,
                achievements: this.achievements,
                dailyTasks: this.dailyTasks,
                dcoins: this.dCoin.balance
            }
        });
        window.dispatchEvent(event);
    }

    // Update game statistics and DCoin balance
    updateStats(statsUpdate) {
        if (!statsUpdate) return;

        // Base DCoin reward for points (1 DCoin per enemy defeated)
        if (statsUpdate.points > 0) {
            const baseReward = Math.floor(statsUpdate.points / 100); // 1 DCoin per 100 points
            if (baseReward > 0) {
                this.addDCoins(baseReward, 'enemy_defeat');
            }
        }

        // High score bonuses
        if (statsUpdate.points >= 10000) {
            this.addDCoins(100, 'high_score_10k');
        } else if (statsUpdate.points >= 5000) {
            this.addDCoins(50, 'high_score_5k');
        }

        // Update game stats
        this.stats = this.stats || {};
        this.stats.lastGameScore = statsUpdate.points || 0;
        this.stats.highScore = Math.max(this.stats.highScore || 0, statsUpdate.points || 0);
        this.stats.lastPlayed = new Date().toISOString();
        
        // Save changes
        this.saveProfile();
    }

    // Achievement management
    unlockAchievement(achievementId) {
        if (!this.achievements) {
            this.achievements = {};
        }

        // If achievement is already unlocked, do nothing
        if (this.achievements[achievementId]?.unlocked) {
            return;
        }

        // Get achievement details
        const achievement = this.getAchievementDetails(achievementId);
        if (!achievement) {
            console.warn(`Unknown achievement: ${achievementId}`);
            return;
        }

        // Unlock the achievement
        this.achievements[achievementId] = {
            unlocked: true,
            unlockedAt: new Date().toISOString(),
            details: achievement
        };

        // Award DCoin reward if specified
        if (achievement.reward) {
            this.addDCoins(achievement.reward, `achievement_${achievementId}`);
        }

        // Save changes
        this.saveProfile();

        // Show achievement notification
        this.showAchievementNotification(achievement);
    }

    getAchievementDetails(achievementId) {
        const achievementData = {
            enemy_slayer_1: {
                title: 'Enemy Slayer I',
                description: 'Defeat 100 enemies',
                reward: 50
            },
            enemy_slayer_2: {
                title: 'Enemy Slayer II',
                description: 'Defeat 500 enemies',
                reward: 100
            },
            enemy_slayer_3: {
                title: 'Enemy Slayer III',
                description: 'Defeat 1000 enemies',
                reward: 200
            },
            level_master_1: {
                title: 'Level Master I',
                description: 'Complete 5 levels',
                reward: 50
            },
            level_master_2: {
                title: 'Level Master II',
                description: 'Complete 10 levels',
                reward: 100
            },
            level_master_3: {
                title: 'Level Master III',
                description: 'Complete 20 levels',
                reward: 200
            },
            survivor_1: {
                title: 'Survivor I',
                description: 'Survive for 1 hour',
                reward: 50
            },
            survivor_2: {
                title: 'Survivor II',
                description: 'Survive for 5 hours',
                reward: 100
            },
            survivor_3: {
                title: 'Survivor III',
                description: 'Survive for 10 hours',
                reward: 200
            },
            power_collector_1: {
                title: 'Power Collector I',
                description: 'Collect 10 power-ups',
                reward: 25
            },
            power_collector_2: {
                title: 'Power Collector II',
                description: 'Collect 50 power-ups',
                reward: 75
            },
            power_collector_3: {
                title: 'Power Collector III',
                description: 'Collect 100 power-ups',
                reward: 150
            }
        };

        return achievementData[achievementId];
    }

    showAchievementNotification(achievement) {
        const event = new CustomEvent('achievementUnlocked', {
            detail: {
                title: achievement.title,
                description: achievement.description,
                reward: achievement.reward
            }
        });
        window.dispatchEvent(event);

        // If the game has a display message function, use it
        if (typeof window.displayMessage === 'function') {
            const message = `Achievement Unlocked: ${achievement.title}\n${achievement.description}`;
            window.displayMessage(message, 'achievement');
        }
    }

    // Synchronize user profile with save systems
    syncUserProfile() {
        console.log("Synchronizing user profile with save systems...");
        
        try {
            // Save profile to localStorage
            this.saveProfile();
            
            // Dispatch profile updated event for integrator to handle
            window.dispatchEvent(new CustomEvent('profileUpdated', {
                detail: { profile: this }
            }));
            
            // If integrator exists, force a sync
            if (window.integrator && typeof window.integrator.syncData === 'function') {
                window.integrator.syncData();
            }
            
            // If saveSystem exists, force a save
            if (window.saveSystem && typeof window.saveSystem.saveAll === 'function') {
                window.saveSystem.saveAll(true);
            }
            
            console.log("User profile synchronized successfully");
            return true;
    } catch (error) {
            console.error("Error synchronizing user profile:", error);
            return false;
        }
    }

    // Update stats from game
    updateGameProgress(gameData) {
        if (!gameData) return;
        
        console.log("Updating game progress:", gameData);
        
        // Update high score if needed
        if (gameData.score > this.stats.highScore) {
            this.stats.highScore = gameData.score;
        }
        
        // Update total score
        this.stats.totalScore += gameData.score || 0;
        
        // Update level progress
        if (gameData.mode === 'normal' && gameData.level) {
            // Ensure we have the levels object
            if (!this.gameModes.normal.levels) {
                this.gameModes.normal.levels = {};
            }
            
            // Cap the level at 50 for normal mode
            const level = Math.min(gameData.level, 50);
            
            // Only update if this level is higher than our current highest level
            if (level > (this.gameModes.normal.levelsCompleted || 0)) {
                this.gameModes.normal.levelsCompleted = level;
                console.log(`New highest level reached: ${level}`);
            }
            
            // Update level score if higher
            if (!this.gameModes.normal.levels[level] || gameData.score > this.gameModes.normal.levels[level]) {
                this.gameModes.normal.levels[level] = gameData.score;
            }
        }
        
        // Save the updated profile
        this.saveProfile();
        
        // Sync with progress system
        this.syncUserProfile();
    }

    // Calculate win rate as percentage
    getWinRate() {
        if (!this.stats || !this.stats.battles || this.stats.battles === 0) {
            return 0;
        }
        return Math.round((this.stats.victories / this.stats.battles) * 100);
    }
    
    // Calculate kill-to-death ratio
    getKDRatio() {
        if (!this.stats || !this.stats.deaths || this.stats.deaths === 0) {
            return 0;
        }
        return this.stats.enemiesDefeated / this.stats.deaths;
    }
    
    // Format time played in hours, minutes, seconds
    getFormattedTimePlayed() {
        if (!this.stats || !this.stats.timePlayed) {
            return "0h 0m";
        }
        
        // Convert ms to hours
        const totalHours = this.stats.timePlayed / (1000 * 60 * 60);
        const hours = Math.floor(totalHours);
        const minutes = Math.floor((totalHours - hours) * 60);
        
        return `${hours}h ${minutes}m`;
    }
    
    // Format time trial time (for time trial records)
    formatTimeTrialTime(milliseconds) {
        if (!milliseconds) return "--:--:--";
        
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
    }

    // Initialize default eligible NFTs
    initDefaultEligibleNFTs() {
        return [
            {
                id: 'rookie-warrior',
                name: 'Rookie Warrior',
                description: 'Certified Death Alley Driver',
                image: 'textures/nfts/rookie-warrior.png',
                rarity: 'Common',
                requirements: ['Complete Level 10', 'Have 20,000 DCoins']
            },
            {
                id: 'veteran-striker',
                name: 'Veteran Striker',
                description: 'Proven survivor of Death Alley',
                image: 'textures/nfts/veteran-striker.png',
                rarity: 'Uncommon',
                requirements: ['Complete Level 20', 'Have 40,000 DCoins']
            },
            {
                id: 'elite-commander',
                name: 'Elite Commander',
                description: 'Expert tactical driver',
                image: 'textures/nfts/elite-commander.png',
                rarity: 'Rare',
                requirements: ['Complete Level 30', 'Have 60,000 DCoins']
            },
            {
                id: 'master-tactician',
                name: 'Master Tactician',
                description: 'Strategic genius of vehicle combat',
                image: 'textures/nfts/master-tactician.png',
                rarity: 'Epic',
                requirements: ['Complete Level 40', 'Have 80,000 DCoins']
            },
            {
                id: 'legendary-champion',
                name: 'Legendary Champion',
                description: 'The ultimate Death Alley legend',
                image: 'textures/nfts/legendary-champion.png',
                rarity: 'Legendary',
                requirements: ['Complete Level 50', 'Have 100,000 DCoins']
            }
        ];
    }

    // Calculate XP needed for next level using exponential scaling
    calculateNextLevelXP(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    // Add XP and handle level ups
    async addXP(amount, source) {
        if (!this.xp) {
            this.xp = {
                current: 0,
                level: 1,
                nextLevelAt: 100,
                totalEarned: 0
            };
        }

        this.xp.current += amount;
        this.xp.totalEarned += amount;

        // Check for level up
        while (this.xp.current >= this.xp.nextLevelAt) {
            this.xp.current -= this.xp.nextLevelAt;
            this.xp.level++;
            this.xp.nextLevelAt = this.calculateNextLevelXP(this.xp.level);

            // Dispatch level up event
            window.dispatchEvent(new CustomEvent('playerLevelUp', {
                detail: {
                    newLevel: this.xp.level,
                    source: source
                }
            }));

            // Award level up bonus
            await this.addDCoins(this.xp.level * 50, 'level_up');
        }

        // Save profile after XP changes
        await this.saveProfile();

        // Dispatch XP update event
        window.dispatchEvent(new CustomEvent('xpUpdated', {
            detail: {
                current: this.xp.current,
                level: this.xp.level,
                nextLevelAt: this.xp.nextLevelAt,
                totalEarned: this.xp.totalEarned,
                source: source
            }
        }));
    }

    // Reset user profile data
    async resetProfile() {
        // Clear local storage
        await StorageManager.clear('userProfile');
        await StorageManager.clear('deathAlleyDailyTasks');
        
        // Reset all properties to default values
        this.stats = {
            battles: 0,
            victories: 0,
            totalScore: 0,
            highScore: 0,
            enemiesDefeated: 0,
            deaths: 0,
            timePlayed: 0,
            lastPlayed: new Date().toISOString(),
            lastLevel: 1
        };
        
        this.gameModes = {
            normal: {
                levelsCompleted: 0,
                bestScore: 0,
                totalKills: 0,
                levels: {}
            },
            timeTrial: {
                bestTimes: [null, null, null],
                checkpointsHit: 0,
                attempts: 0,
                completions: 0
            },
            obstacle: {
                obstaclesCleared: 0,
                longestRun: 0,
                boostRampsUsed: 0
            },
            survival: {
                highestWave: 0,
                totalWaves: 0,
                bossesDefeated: 0
            }
        };
        
        this.dCoin = {
            balance: 0,
            totalEarned: 0,
            lastUpdated: new Date().toISOString(),
            transactions: []
        };
        
        this.xp = {
            current: 0,
            level: 1,
            nextLevelAt: 100,
            totalEarned: 0
        };
        
        // Reinitialize achievements, badges, and NFTs
        this.achievements = this.initDefaultAchievements();
        this.badges = this.initDefaultBadges();
        this.nfts = {
            minted: [],
            eligible: this.initDefaultEligibleNFTs()
        };
        
        // Save the reset profile
        await this.saveProfile();
        
        // Notify UI of updates
        this.notifyUIUpdate();
        
        console.log("User profile has been reset to default values");
    }
}

// Create userProfile instance
const userProfile = new UserProfile();

// Export both the instance and the class
export { userProfile, UserProfile };
