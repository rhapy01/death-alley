// ProgressSystem.js
// Unified system for tracking achievements, badges, daily tasks, and NFTs with shared data

import saveSystem from './saveSystem.js';

class ProgressSystem {
    constructor() {
        this.achievements = {};
        this.badges = {};
        this.dailyTasks = {};
        this.nfts = {
            minted: [],
            eligible: []
        };
        this.stats = {
            // General stats
            enemiesDefeated: 0,
            distanceTraveled: 0,
            timePlayed: 0,
            highScore: 0,
            
            // Combat stats
            criticalHits: 0,
            shotsFired: 0,
            shotsHit: 0,
            accuracy: 0,
            
            // Game mode stats
            normalLevelsCompleted: 0,
            timeTrialBestTimes: {},
            obstacleCourseRuns: 0,
            obstaclesCleared: 0
        };
        
        this.eventListeners = {};
        this.initialized = false;
    }
    
    // Alias for initialize() to maintain compatibility
    async init() {
        return this.initialize();
    }
    
    // Initialize the progress system
    async initialize() {
        if (this.initialized) return;
        
        // Ensure saveSystem is initialized
        if (!saveSystem.initialized) {
            await saveSystem.init();
        }
        
        // Load saved data from SaveSystem
        await this.loadAllData();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check for daily tasks reset
        this.checkDailyTasksReset();
        
        this.initialized = true;
        console.log('ProgressSystem initialized');
    }
    
    async loadAllData() {
        try {
            // Load achievements
            const achievements = saveSystem.load('deathAlleyAchievements');
            if (achievements) this.achievements = achievements;
            else this.initDefaultAchievements();
            
            // Load badges
            const badges = saveSystem.load('deathAlleyBadges');
            if (badges) this.badges = badges;
            else this.initDefaultBadges();
            
            // Load daily tasks
            const dailyTasks = saveSystem.load('deathAlleyDailyTasks');
            if (dailyTasks) this.dailyTasks = dailyTasks;
            else this.initDailyTasks();
            
            // Load NFTs
            const nfts = saveSystem.load('deathAlleyNFTs');
            if (nfts) this.nfts = nfts;
            
            // Load stats
            const stats = saveSystem.load('deathAlleyStats');
            if (stats) this.stats = { ...this.stats, ...stats };
            
            console.log('All progress data loaded');
        } catch (error) {
            console.error('Error loading progress data:', error);
            
            // Initialize with defaults if loading fails
            this.initDefaultAchievements();
            this.initDefaultBadges();
            this.initDailyTasks();
        }
    }
    
    setupEventListeners() {
        // Listen for game events that affect progress
        this.addEventListener('enemyDefeated', this.onEnemyDefeated.bind(this));
        this.addEventListener('levelCompleted', this.onLevelCompleted.bind(this));
        this.addEventListener('powerUpCollected', this.onPowerUpCollected.bind(this));
        this.addEventListener('distanceTraveled', this.onDistanceTraveled.bind(this));
        this.addEventListener('obstacleCleared', this.onObstacleCleared.bind(this));
        this.addEventListener('checkpointReached', this.onCheckpointReached.bind(this));
        
        // Listen for GameStateManager updates
        window.addEventListener('gameStateUpdated', (event) => {
            if (event.detail && event.detail.stats) {
                this.updateStats(event.detail.stats);
            }
        });
    }
    
    // Register event listener
    addEventListener(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }
    
    // Trigger event
    triggerEvent(eventName, data) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${eventName} event handler:`, error);
                }
            });
        }
    }
    
    // Initialize default achievements
    initDefaultAchievements() {
        this.achievements = {
            // Progression achievements
            'road-warrior': { id: 'road-warrior', title: 'Road Warrior', description: 'Complete Level 1', progress: 0, total: 1, unlocked: false, reward: 50 },
            'highway-to-hell': { id: 'highway-to-hell', title: 'Highway to Hell', description: 'Complete Level 2', progress: 0, total: 1, unlocked: false, reward: 75 },
            'death-alley-master': { id: 'death-alley-master', title: 'Death Alley Master', description: 'Complete Level 3', progress: 0, total: 1, unlocked: false, reward: 100 },
            
            // Combat achievements
            'first-blood': { id: 'first-blood', title: 'First Blood', description: 'Defeat your first enemy', progress: 0, total: 1, unlocked: false, reward: 25 },
            'vehicular-manslaughter': { id: 'vehicular-manslaughter', title: 'Vehicular Manslaughter', description: 'Defeat 50 enemies', progress: 0, total: 50, unlocked: false, reward: 100 },
            'destruction-derby': { id: 'destruction-derby', title: 'Destruction Derby', description: 'Defeat 200 enemies', progress: 0, total: 200, unlocked: false, reward: 250 },
            
            // Time Trial achievements
            'speed-demon': { id: 'speed-demon', title: 'Speed Demon', description: 'Complete Time Trial under 1:30', progress: 0, total: 1, unlocked: false, reward: 100 },
            'checkpoint-hunter': { id: 'checkpoint-hunter', title: 'Checkpoint Hunter', description: 'Hit all checkpoints in Time Trial', progress: 0, total: 1, unlocked: false, reward: 75 },
            
            // Obstacle achievements
            'obstacle-master': { id: 'obstacle-master', title: 'Obstacle Master', description: 'Clear 100 obstacles', progress: 0, total: 100, unlocked: false, reward: 100 },
            'marathon-runner': { id: 'marathon-runner', title: 'Marathon Runner', description: 'Travel 5000m in obstacles', progress: 0, total: 5000, unlocked: false, reward: 150 }
        };
        
        saveSystem.save('deathAlleyAchievements', this.achievements);
    }
    
    // Initialize default badges
    initDefaultBadges() {
        this.badges = {
            // Level mastery badges
            'level1-master': { id: 'level1-master', title: 'Level 1 Master', description: 'Perfect score on Level 1', unlocked: false, icon: 'badges/level1-master.png' },
            'level2-master': { id: 'level2-master', title: 'Level 2 Master', description: 'Perfect score on Level 2', unlocked: false, icon: 'badges/level2-master.png' },
            'level3-master': { id: 'level3-master', title: 'Level 3 Master', description: 'Perfect score on Level 3', unlocked: false, icon: 'badges/level3-master.png' },
            
            // Combat badges
            'marksman': { id: 'marksman', title: 'Marksman', description: 'Defeat 10 enemies without missing', unlocked: false, icon: 'badges/marksman.png' },
            'exterminator': { id: 'exterminator', title: 'Exterminator', description: 'Defeat 5 enemies in 10 seconds', unlocked: false, icon: 'badges/exterminator.png' },
            
            // Special badges
            'untouchable': { id: 'untouchable', title: 'Untouchable', description: 'Complete level without damage', unlocked: false, icon: 'badges/untouchable.png' },
            'blockchain-pioneer': { id: 'blockchain-pioneer', title: 'Blockchain Pioneer', description: 'Mint your first NFT', unlocked: false, icon: 'badges/blockchain.png' }
        };
        
        saveSystem.save('deathAlleyBadges', this.badges);
    }
    
    // Initialize daily tasks
    initDailyTasks() {
        const today = new Date().toISOString().split('T')[0];
        
        this.dailyTasks = {
            date: today,
            tasks: this.generateDailyTasks(),
            lastUpdated: new Date().toISOString()
        };
        
        saveSystem.save('deathAlleyDailyTasks', this.dailyTasks);
    }
    
    // Generate random daily tasks
    generateDailyTasks() {
        // Task categories
        const taskCategories = [
            {
                name: 'combat',
                tasks: [
                    { id: 'defeat-enemies', title: 'Road Rage', description: 'Defeat 15 enemies', progress: 0, total: 15, reward: 100 },
                    { id: 'headshots', title: 'Critical Hit', description: 'Land 10 critical hits', progress: 0, total: 10, reward: 100 }
                ]
            },
            {
                name: 'driving',
                tasks: [
                    { id: 'distance', title: 'Road Warrior', description: 'Drive 2000 meters', progress: 0, total: 2000, reward: 100 },
                    { id: 'drift', title: 'Drift King', description: 'Perform 10 drifts', progress: 0, total: 10, reward: 100 }
                ]
            },
            {
                name: 'obstacle',
                tasks: [
                    { id: 'clear-obstacles', title: 'Obstacle Course', description: 'Clear 30 obstacles', progress: 0, total: 30, reward: 100 },
                    { id: 'boost-ramps', title: 'Ramp Jumper', description: 'Use 5 boost ramps', progress: 0, total: 5, reward: 100 }
                ]
            }
        ];
        
        // Always include blockchain check-in task
        const blockchainTask = { 
            id: 'blockchain-checkin', 
            title: 'Blockchain Check-in', 
            description: 'Connect wallet for daily reward', 
            progress: 0, 
            total: 1, 
            reward: 100, 
            isBlockchain: true 
        };
        
        // Random selection logic
        const selectedTasks = [];
        
        // Select one task from each category
        taskCategories.forEach(category => {
            const randomTask = category.tasks[Math.floor(Math.random() * category.tasks.length)];
            selectedTasks.push({ ...randomTask, completed: false });
        });
        
        // Add blockchain task
        selectedTasks.push({ ...blockchainTask, completed: false });
        
        return selectedTasks;
    }
    
    // Check if daily tasks need to be reset
    checkDailyTasksReset() {
        const today = new Date().toISOString().split('T')[0];
        
        if (this.dailyTasks.date !== today) {
            console.log('Resetting daily tasks for new day');
            this.initDailyTasks();
        }
    }
    
    // Update daily task progress
    updateDailyTaskProgress(taskId, progress) {
        if (!this.dailyTasks || !this.dailyTasks.tasks) return false;
        
        const task = this.dailyTasks.tasks.find(t => t.id === taskId);
        
        if (task && !task.completed) {
            task.progress = Math.min(task.progress + progress, task.total);
            
            // Check if task is completed
            if (task.progress >= task.total) {
                task.completed = true;
                
                // Emit task completed event
                window.dispatchEvent(new CustomEvent('taskCompleted', {
                    detail: { task: task }
                }));
                
                // Add DCoin for task completion
                if (typeof window.userProfile?.addDCoins === 'function') {
                    window.userProfile.addDCoins(task.reward, 'daily_task');
                }
            }
            
            // Save updated tasks
            saveSystem.save('deathAlleyDailyTasks', this.dailyTasks);
            
            return {
                completed: task.completed,
                progress: task.progress,
                total: task.total
            };
        }
        
        return false;
    }
    
    // Update achievement progress
    updateAchievementProgress(achievementId, progress) {
        if (!this.achievements[achievementId]) return false;
        
        const achievement = this.achievements[achievementId];
        
        if (!achievement.unlocked) {
            achievement.progress = Math.min(achievement.progress + progress, achievement.total);
            
            // Check if achievement is completed
            if (achievement.progress >= achievement.total) {
                achievement.unlocked = true;
                achievement.unlockDate = new Date().toISOString();
                
                // Emit achievement unlocked event
                window.dispatchEvent(new CustomEvent('achievementUnlocked', {
                    detail: { achievement: achievement }
                }));
                
                // Add DCoin for achievement completion
                if (typeof window.userProfile?.addDCoins === 'function') {
                    window.userProfile.addDCoins(achievement.reward, 'achievement');
                }
                
                // Check for completionist badge
                this.checkCompletionist();
            }
            
            // Save updated achievements
            saveSystem.save('deathAlleyAchievements', this.achievements);
            
            return {
                unlocked: achievement.unlocked,
                progress: achievement.progress,
                total: achievement.total
            };
        }
        
        return false;
    }
    
    // Update stats
    updateStats(newStats) {
        // Update each stat that's provided
        Object.keys(newStats).forEach(key => {
            if (this.stats.hasOwnProperty(key)) {
                // For numerical values, take the max or add, depending on the stat type
                if (typeof newStats[key] === 'number') {
                    // These stats should use the max value
                    if (['highScore', 'accuracy'].includes(key)) {
                        this.stats[key] = Math.max(this.stats[key], newStats[key]);
                    }
                    // These are cumulative stats
                    else {
                        this.stats[key] += newStats[key];
                    }
                } 
                // For objects (like timeTrialBestTimes), merge them
                else if (typeof newStats[key] === 'object' && newStats[key] !== null) {
                    this.stats[key] = { ...this.stats[key], ...newStats[key] };
                }
                // For any other type, just replace
                else {
                    this.stats[key] = newStats[key];
                }
            }
        });
        
        // Save updated stats
        saveSystem.save('deathAlleyStats', this.stats);
        
        // Check achievements that depend on stats
        this.checkStatBasedAchievements();
    }
    
    // Check achievements based on stats
    checkStatBasedAchievements() {
        // Check enemy defeat achievements
        this.updateAchievementProgress('first-blood', Math.min(1, this.stats.enemiesDefeated));
        this.updateAchievementProgress('vehicular-manslaughter', this.stats.enemiesDefeated);
        this.updateAchievementProgress('destruction-derby', this.stats.enemiesDefeated);
        
        // Check distance achievement
        this.updateAchievementProgress('marathon-runner', this.stats.distanceTraveled);
        
        // Check obstacle achievement
        this.updateAchievementProgress('obstacle-master', this.stats.obstaclesCleared);
        
        // Check level completion achievements
        if (this.stats.normalLevelsCompleted >= 1) {
            this.updateAchievementProgress('road-warrior', 1);
        }
        if (this.stats.normalLevelsCompleted >= 2) {
            this.updateAchievementProgress('highway-to-hell', 1);
        }
        if (this.stats.normalLevelsCompleted >= 3) {
            this.updateAchievementProgress('death-alley-master', 1);
        }
    }
    
    // Check for completionist badge
    checkCompletionist() {
        const allAchievementsUnlocked = Object.values(this.achievements)
            .every(achievement => achievement.unlocked);
            
        if (allAchievementsUnlocked) {
            this.unlockBadge('completionist');
        }
    }
    
    // Unlock a badge
    unlockBadge(badgeId) {
        if (!this.badges[badgeId]) return false;
        
        const badge = this.badges[badgeId];
        
        if (!badge.unlocked) {
            badge.unlocked = true;
            badge.unlockDate = new Date().toISOString();
            
            // Emit badge unlocked event
            window.dispatchEvent(new CustomEvent('badgeUnlocked', {
                detail: { badge: badge }
            }));
            
            // Save updated badges
            saveSystem.save('deathAlleyBadges', this.badges);
            
            return true;
        }
        
        return false;
    }
    
    // Mark item as minted NFT
    markAsMinted(type, id) {
        if (type === 'achievement') {
            if (this.achievements[id]) {
                this.achievements[id].minted = true;
                saveSystem.save('deathAlleyAchievements', this.achievements);
            }
        } else if (type === 'badge') {
            if (this.badges[id]) {
                this.badges[id].minted = true;
                saveSystem.save('deathAlleyBadges', this.badges);
            }
        }
        
        // Add to minted NFTs list
        this.nfts.minted.push({
            id,
            type,
            mintDate: new Date().toISOString()
        });
        
        // Save NFT data
        saveSystem.save('deathAlleyNFTs', this.nfts);
        
        // Unlock blockchain pioneer badge if this is the first mint
        if (this.nfts.minted.length === 1) {
            this.unlockBadge('blockchain-pioneer');
        }
        
        return true;
    }
    
    // Event handlers for different game events
    onEnemyDefeated(data) {
        // Update stats
        this.updateStats({ 
            enemiesDefeated: 1,
            score: data.score || 0
        });
        
        // Update daily task
        this.updateDailyTaskProgress('defeat-enemies', 1);
        
        // Check for critical hit
        if (data.isCritical) {
            this.updateDailyTaskProgress('headshots', 1);
            this.updateStats({ criticalHits: 1 });
        }
    }
    
    onLevelCompleted(data) {
        const { level, gameMode, perfectRun, score } = data;
        
        // Update stats based on game mode
        if (gameMode === 'normal') {
            this.updateStats({ 
                normalLevelsCompleted: 1
            });
            
            // Check for perfect run badge
            if (perfectRun) {
                this.unlockBadge(`level${level}-master`);
            }
        } 
        else if (gameMode === 'time_trial') {
            // Update best time if better than previous
            const newBestTimes = {};
            if (!this.stats.timeTrialBestTimes[level] || data.time < this.stats.timeTrialBestTimes[level]) {
                newBestTimes[level] = data.time;
                this.updateStats({ timeTrialBestTimes: newBestTimes });
                
                // Check for speed demon achievement
                if (data.time < 90000) { // 1:30 in milliseconds
                    this.updateAchievementProgress('speed-demon', 1);
                }
            }
        }
        
        // Check for untouchable badge if no damage was taken
        if (data.damageTaken === 0) {
            this.unlockBadge('untouchable');
        }
    }
    
    onPowerUpCollected(data) {
        // Update daily task
        this.updateDailyTaskProgress('collect-powerups', 1);
    }
    
    onDistanceTraveled(data) {
        // Update stats
        this.updateStats({ 
            distanceTraveled: data.distance || 0
        });
        
        // Update daily task
        this.updateDailyTaskProgress('distance', data.distance || 0);
    }
    
    onObstacleCleared(data) {
        // Update stats
        this.updateStats({ 
            obstaclesCleared: 1
        });
        
        // Update daily task
        this.updateDailyTaskProgress('clear-obstacles', 1);
        
        // Check for boost ramp
        if (data.isRamp) {
            this.updateDailyTaskProgress('boost-ramps', 1);
        }
    }
    
    onCheckpointReached(data) {
        // Update daily task for checkpoints
        this.updateDailyTaskProgress('checkpoints', 1);
        
        // Check for checkpoint hunter achievement
        if (data.isAllCheckpoints) {
            this.updateAchievementProgress('checkpoint-hunter', 1);
        }
    }
    
    // Get currently active daily tasks
    getDailyTasks() {
        this.checkDailyTasksReset();
        return this.dailyTasks.tasks;
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
    
    // Get unlocked achievements
    getUnlockedAchievements() {
        return Object.values(this.achievements).filter(a => a.unlocked);
    }
    
    // Get unlocked badges
    getUnlockedBadges() {
        return Object.values(this.badges).filter(b => b.unlocked);
    }
    
    // Get minted NFTs
    getMintedNFTs() {
        return this.nfts.minted;
    }
    
    // Get achievement progress
    getAchievementProgress(achievementId) {
        if (!this.achievements[achievementId]) return null;
        
        const achievement = this.achievements[achievementId];
        return {
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            progress: achievement.progress,
            total: achievement.total,
            unlocked: achievement.unlocked,
            percentage: Math.floor((achievement.progress / achievement.total) * 100)
        };
    }
}

// Create and export a singleton instance
export const progressSystem = new ProgressSystem();
export default progressSystem; 