// Progress Tracker System
// Monitors game events and updates player achievements, badges, and daily tasks

class ProgressTracker {
    constructor() {
        this.initialized = false;
        this.userProfile = null;
        this.gameStats = {
            currentSession: {
                startTime: null,
                enemiesDefeated: 0,
                bossesSurvived: 0,
                distanceTraveled: 0,
                checkpointsHit: 0,
                powerUpsCollected: 0,
                shotsFired: 0,
                shotsHit: 0,
                nearMisses: 0,
                timesAtTopSpeed: 0,
                topSpeedDuration: 0,
                wavesCompleted: 0
            },
            // Tracking for the current game run only (reset on restart/game over)
            currentGame: {
                mode: null,
                level: 1,
                startTime: null,
                perfectAccuracy: true,
                damageTaken: 0,
                enemiesDefeatedInRow: 0,
                lastEnemyDefeatTime: 0,
                maxCombo: 0
            }
        };
        
        // Timers and intervals
        this.saveInterval = null;
        this.achievementCheckInterval = null;
    }
    
    // Initialize the progress tracker
    async initialize(userProfile) {
        if (this.initialized) return;
        
        console.log("Initializing Progress Tracker...");
        this.userProfile = userProfile;
        
        // Start the session
        this.startSession();
        
        // Set up intervals for regular checks and saves
        this.saveInterval = setInterval(() => this.saveProgress(), 30000); // Save every 30 seconds
        this.achievementCheckInterval = setInterval(() => this.checkAllAchievements(), 10000); // Check achievements every 10 seconds
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        console.log("Progress Tracker initialized successfully");
    }
    
    // Set up event listeners for game events
    setupEventListeners() {
        // Game events to track
        window.addEventListener('enemyDefeated', (e) => this.onEnemyDefeated(e.detail));
        window.addEventListener('bossDefeated', (e) => this.onBossDefeated(e.detail));
        window.addEventListener('levelCompleted', (e) => this.onLevelCompleted(e.detail));
        window.addEventListener('checkpointHit', (e) => this.onCheckpointHit(e.detail));
        window.addEventListener('powerUpCollected', (e) => this.onPowerUpCollected(e.detail));
        window.addEventListener('playerDamaged', (e) => this.onPlayerDamaged(e.detail));
        window.addEventListener('shotFired', () => this.onShotFired());
        window.addEventListener('shotHit', () => this.onShotHit());
        window.addEventListener('nearMiss', () => this.onNearMiss());
        window.addEventListener('topSpeedReached', () => this.onTopSpeedReached());
        window.addEventListener('gameOver', () => this.onGameOver());
        window.addEventListener('gameCompleted', (e) => this.onGameCompleted(e.detail));
        window.addEventListener('waveCompleted', (e) => this.onWaveCompleted(e.detail));
        
        console.log("Progress Tracker event listeners set up");
    }
    
    // Start a new game session
    startSession() {
        this.gameStats.currentSession.startTime = Date.now();
        console.log("New game session started at:", new Date(this.gameStats.currentSession.startTime).toLocaleString());
    }
    
    // Start tracking a new game
    startGame(mode, level) {
        this.gameStats.currentGame = {
            mode: mode,
            level: level,
            startTime: Date.now(),
            perfectAccuracy: true,
            damageTaken: 0,
            enemiesDefeatedInRow: 0,
            lastEnemyDefeatTime: 0,
            maxCombo: 0
        };
        
        console.log(`New game started: Mode=${mode}, Level=${level}`);
    }
    
    // EVENT HANDLERS
    
    // Handle enemy defeated event
    onEnemyDefeated(data) {
        const enemyType = data.type || 'generic';
        const points = data.points || 0;
        
        // Update session stats
        this.gameStats.currentSession.enemiesDefeated++;
        
        // Update current game stats for combos
        const now = Date.now();
        if (now - this.gameStats.currentGame.lastEnemyDefeatTime < 5000) { // 5 seconds for combo
            this.gameStats.currentGame.enemiesDefeatedInRow++;
        } else {
            this.gameStats.currentGame.enemiesDefeatedInRow = 1;
        }
        
        // Update max combo
        if (this.gameStats.currentGame.enemiesDefeatedInRow > this.gameStats.currentGame.maxCombo) {
            this.gameStats.currentGame.maxCombo = this.gameStats.currentGame.enemiesDefeatedInRow;
        }
        
        this.gameStats.currentGame.lastEnemyDefeatTime = now;
        
        // Update user profile - use single counter for all modes
        if (this.userProfile) {
            // Update total enemies defeated counter
            this.userProfile.stats.enemiesDefeated = (this.userProfile.stats.enemiesDefeated || 0) + 1;
            this.userProfile.stats.totalScore = (this.userProfile.stats.totalScore || 0) + points;
            
            // Check for achievement progress
            this.updateAchievementProgress('first-blood', 1, 1);
            this.updateAchievementProgress('vehicular-manslaughter', 1, 50);
            this.updateAchievementProgress('destruction-derby', 1, 200);
            
            // Check for combo achievements
            if (this.gameStats.currentGame.enemiesDefeatedInRow >= 10) {
                this.updateAchievementProgress('combo-king', 1, 1);
            }
            
            // Check for daily tasks
            this.updateDailyTaskProgress('defeat-enemies', 1);
            
            // Save progress
            this.saveProgress();
        }
        
        console.log(`Enemy defeated: ${enemyType}, total: ${this.gameStats.currentSession.enemiesDefeated}`);
    }
    
    // Handle boss defeated event
    onBossDefeated(data) {
        const bossType = data.type || 'generic';
        
        // Update session stats
        this.gameStats.currentSession.bossesSurvived++;
        
        // Update user profile
        if (this.userProfile) {
            // Update stats
            if (this.userProfile.gameModes?.survival) {
                this.userProfile.gameModes.survival.bossesDefeated = (this.userProfile.gameModes.survival.bossesDefeated || 0) + 1;
            }
            
            // Check for achievement progress
            this.updateAchievementProgress('boss-slayer', 1, 5);
            
            // Check if boss was defeated without damage
            if (this.gameStats.currentGame.damageTaken === 0) {
                this.unlockBadge('boss-hunter');
            }
            
            // Save progress
            this.saveProgress();
        }
        
        console.log(`Boss defeated: ${bossType}, total: ${this.gameStats.currentSession.bossesSurvived}`);
    }
    
    // Handle level completed event
    onLevelCompleted(data) {
        const level = Math.min(data.level || 1, 50); // Cap at level 50
        const score = data.score || 0;
        const time = data.time || 0;
        
        // Update user profile
        if (this.userProfile) {
            // Update stats
            this.userProfile.stats.battles = (this.userProfile.stats.battles || 0) + 1;
            this.userProfile.stats.victories = (this.userProfile.stats.victories || 0) + 1;
            
            if (score > (this.userProfile.stats.highScore || 0)) {
                this.userProfile.stats.highScore = score;
            }
            
            // Update game mode stats - only update if current level is higher than recorded
            if (this.gameStats.currentGame.mode === 'normal' && this.userProfile.gameModes?.normal) {
                const currentHighestLevel = this.userProfile.gameModes.normal.levelsCompleted || 0;
                if (level > currentHighestLevel) {
                    this.userProfile.gameModes.normal.levelsCompleted = level;
                    console.log(`New highest level reached: ${level}`);
                }
                
                if (score > (this.userProfile.gameModes.normal.bestScore || 0)) {
                    this.userProfile.gameModes.normal.bestScore = score;
                }
            }
            
            // Check for level-based achievements - only trigger if it's a new highest level
            if (level > (this.userProfile.gameModes?.normal?.levelsCompleted || 0)) {
                if (level >= 10) {
                    this.updateAchievementProgress('road-warrior', 1, 1);
                }
                if (level >= 25) {
                    this.updateAchievementProgress('highway-to-hell', 1, 1);
                }
                if (level >= 50) {
                    this.updateAchievementProgress('death-alley-master', 1, 1);
                }
            }
            
            // Check for perfect run
            if (this.gameStats.currentGame.perfectAccuracy) {
                this.updateAchievementProgress('perfect-run', 1, 1);
            }
            
            // Check for no damage achievement
            if (this.gameStats.currentGame.damageTaken === 0) {
                this.updateAchievementProgress('untouchable', 1, 1);
            }
            
            // Check for daily tasks
            if (this.gameStats.currentGame.mode === 'time-trial') {
                this.updateDailyTaskProgress('complete-trial', 1);
            }
            
            // Update level mastery badges
            if (this.gameStats.currentGame.perfectAccuracy && score > 10000) {
                if (level >= 10) {
                    this.unlockBadge('level1-master');
                }
                if (level >= 25) {
                    this.unlockBadge('level2-master');
                }
                if (level >= 50) {
                    this.unlockBadge('level3-master');
                }
            }
            
            // Save progress
            this.saveProgress();
        }
        
        console.log(`Level ${level} completed with score: ${score}, time: ${time}ms`);
    }
    
    // Handle checkpoint hit event
    onCheckpointHit(data) {
        const checkpointId = data.id || 0;
        
        // Update session stats
        this.gameStats.currentSession.checkpointsHit++;
        
        // Update user profile
        if (this.userProfile && this.userProfile.gameModes?.timeTrial) {
            this.userProfile.gameModes.timeTrial.checkpointsHit = (this.userProfile.gameModes.timeTrial.checkpointsHit || 0) + 1;
            
            // Check for daily tasks
            this.updateDailyTaskProgress('checkpoints', 1);
            
            // Save progress
            this.saveProgress();
        }
        
        console.log(`Checkpoint hit: ${checkpointId}, total: ${this.gameStats.currentSession.checkpointsHit}`);
    }
    
    // Handle power-up collected event
    onPowerUpCollected(data) {
        const powerUpType = data.type || 'generic';
        
        // Update session stats
        this.gameStats.currentSession.powerUpsCollected++;
        
        // Update user profile
        if (this.userProfile) {
            // Check for achievement progress
            this.updateAchievementProgress('collector', 1, 1000);
            
            // Check for daily tasks
            this.updateDailyTaskProgress('collect-powerups', 1);
            
            // Save progress
            this.saveProgress();
        }
        
        console.log(`Power-up collected: ${powerUpType}, total: ${this.gameStats.currentSession.powerUpsCollected}`);
    }
    
    // Handle player damaged event
    onPlayerDamaged(data) {
        const damage = data.damage || 0;
        
        // Update current game stats
        this.gameStats.currentGame.damageTaken += damage;
        
        console.log(`Player damaged: ${damage}, total damage taken: ${this.gameStats.currentGame.damageTaken}`);
    }
    
    // Handle shot fired event
    onShotFired() {
        // Update session stats
        this.gameStats.currentSession.shotsFired++;
        
        console.log(`Shot fired, total: ${this.gameStats.currentSession.shotsFired}`);
    }
    
    // Handle shot hit event
    onShotHit() {
        // Update session stats
        this.gameStats.currentSession.shotsHit++;
        
        // Calculate accuracy
        const accuracy = this.gameStats.currentSession.shotsFired > 0 
            ? this.gameStats.currentSession.shotsHit / this.gameStats.currentSession.shotsFired 
            : 0;
            
        // Check for accuracy achievements
        if (accuracy < 1.0) {
            this.gameStats.currentGame.perfectAccuracy = false;
        }
        
        // Check for precision achievement
        if (accuracy >= 0.85 && this.gameStats.currentSession.shotsFired > 20) {
            this.updateAchievementProgress('precision', 1, 1);
        }
        
        console.log(`Shot hit, total: ${this.gameStats.currentSession.shotsHit}, accuracy: ${Math.round(accuracy * 100)}%`);
    }
    
    // Handle near miss event
    onNearMiss() {
        // Update session stats
        this.gameStats.currentSession.nearMisses++;
        
        // Update user profile
        if (this.userProfile) {
            // Check for achievement progress
            this.updateAchievementProgress('daredevil', 1, 50);
            
            // Check for daily tasks
            this.updateDailyTaskProgress('near-misses', 1);
            
            // Save progress
            this.saveProgress();
        }
        
        console.log(`Near miss, total: ${this.gameStats.currentSession.nearMisses}`);
    }
    
    // Handle top speed reached event
    onTopSpeedReached() {
        // Update session stats
        this.gameStats.currentSession.timesAtTopSpeed++;
        
        // Start tracking top speed duration
        const topSpeedInterval = setInterval(() => {
            this.gameStats.currentSession.topSpeedDuration++;
            
            // Check for speed demon achievement
            if (this.gameStats.currentSession.topSpeedDuration >= 10) {
                this.updateAchievementProgress('speed-demon', 1, 1);
                
                // Check for speed demon badge at 30 seconds
                if (this.gameStats.currentSession.topSpeedDuration >= 30) {
                    this.unlockBadge('speed-demon');
                }
            }
        }, 1000);
        
        // Add event listener to clear interval when speed drops
        const topSpeedEndHandler = () => {
            clearInterval(topSpeedInterval);
            window.removeEventListener('topSpeedEnded', topSpeedEndHandler);
            console.log(`Top speed duration: ${this.gameStats.currentSession.topSpeedDuration}s`);
        };
        
        window.addEventListener('topSpeedEnded', topSpeedEndHandler);
        
        console.log(`Top speed reached, times: ${this.gameStats.currentSession.timesAtTopSpeed}`);
    }
    
    // Handle wave completed event
    onWaveCompleted(data) {
        const wave = data.wave || 1;
        const enemiesDefeated = data.enemiesDefeated || 0;
        
        // Update session stats
        this.gameStats.currentSession.wavesCompleted++;
        
        // Update user profile
        if (this.userProfile && this.userProfile.gameModes?.survival) {
            // Update survival mode stats
            this.userProfile.gameModes.survival.totalWaves = (this.userProfile.gameModes.survival.totalWaves || 0) + 1;
            
            if (wave > (this.userProfile.gameModes.survival.highestWave || 0)) {
                this.userProfile.gameModes.survival.highestWave = wave;
            }
            
            // Check for wave master achievement
            this.updateAchievementProgress('wave-master', 1, 10);
            
            // Check for survival elite badge at wave 20
            if (wave >= 20) {
                this.unlockBadge('survival-elite');
            }
            
            // Check for daily tasks
            this.updateDailyTaskProgress('clear-waves', 1);
            
            // Save progress
            this.saveProgress();
        }
        
        console.log(`Wave ${wave} completed, total waves: ${this.gameStats.currentSession.wavesCompleted}`);
    }
    
    // Handle game over event
    onGameOver() {
        // Calculate session time
        const sessionDuration = Date.now() - this.gameStats.currentSession.startTime;
        
        // Update user profile
        if (this.userProfile) {
            // Update time played
            this.userProfile.stats.timePlayed = (this.userProfile.stats.timePlayed || 0) + sessionDuration;
            
            // Check for veteran achievement (10 hours played)
            if (this.userProfile.stats.timePlayed >= 36000000) { // 10 hours in ms
                this.updateAchievementProgress('veteran', 1, 1);
                this.unlockBadge('veteran');
            }
            
            // Update last played
            this.userProfile.stats.lastPlayed = new Date().toISOString();
            
            // Save progress
            this.saveProgress();
        }
        
        console.log(`Game over, session duration: ${Math.round(sessionDuration / 1000)}s`);
    }
    
    // Handle game completed event
    onGameCompleted(data) {
        const score = data.score || 0;
        const level = data.level || 1;
        
        // Calculate session time
        const sessionDuration = Date.now() - this.gameStats.currentSession.startTime;
        
        // Update user profile
        if (this.userProfile) {
            // Update stats
            this.userProfile.stats.timePlayed = (this.userProfile.stats.timePlayed || 0) + sessionDuration;
            this.userProfile.stats.lastPlayed = new Date().toISOString();
            this.userProfile.stats.lastLevel = level;
            
            // Check for level-based achievements - only trigger if it's a new highest level
            if (level > (this.userProfile.gameModes?.normal?.levelsCompleted || 0)) {
                if (level >= 10) {
                    this.updateAchievementProgress('road-warrior', 1, 1);
                }
                if (level >= 25) {
                    this.updateAchievementProgress('highway-to-hell', 1, 1);
                }
                if (level >= 50) {
                    this.updateAchievementProgress('death-alley-master', 1, 1);
                }
            }
            
            // Check for perfect run
            if (this.gameStats.currentGame.perfectAccuracy) {
                this.updateAchievementProgress('perfect-run', 1, 1);
            }
            
            // Check for no damage achievement
            if (this.gameStats.currentGame.damageTaken === 0) {
                this.updateAchievementProgress('untouchable', 1, 1);
            }
            
            // Check for daily tasks
            if (this.gameStats.currentGame.mode === 'time-trial') {
                this.updateDailyTaskProgress('complete-trial', 1);
            }
            
            // Update level mastery badges
            if (this.gameStats.currentGame.perfectAccuracy && score > 10000) {
                if (level >= 10) {
                    this.unlockBadge('level1-master');
                }
                if (level >= 25) {
                    this.unlockBadge('level2-master');
                }
                if (level >= 50) {
                    this.unlockBadge('level3-master');
                }
            }
            
            // Save progress
            this.saveProgress();
        }
        
        console.log(`Game completed with score: ${score}, level: ${level}`);
    }
    
    // PROGRESS HELPERS
    
    // Update achievement progress
    updateAchievementProgress(achievementId, increment, total) {
        if (!this.userProfile || !this.userProfile.achievements) return;
        
        const achievement = this.userProfile.achievements.find(a => a.id === achievementId);
        if (!achievement) return;
        
        // Skip if already unlocked
        if (achievement.unlocked) return;
        
        // Update progress
        achievement.progress = Math.min(achievement.total, (achievement.progress || 0) + increment);
        
        // Check if completed
        if (achievement.progress >= achievement.total) {
            achievement.unlocked = true;
            achievement.unlockDate = new Date().toISOString();
            
            // Show notification
            this.showNotification(`Achievement Unlocked: ${achievement.title}`, 'achievement');
            
            console.log(`Achievement unlocked: ${achievement.title}`);
            
            // Check if all achievements are unlocked for completionist badge
            const allAchievements = this.userProfile.achievements.every(a => a.unlocked);
            if (allAchievements) {
                this.unlockBadge('completionist');
            }
        }
    }
    
    // Unlock a badge
    unlockBadge(badgeId) {
        if (!this.userProfile || !this.userProfile.badges) return;
        
        const badge = this.userProfile.badges.find(b => b.id === badgeId);
        if (!badge || badge.unlocked) return;
        
        // Unlock the badge
        badge.unlocked = true;
        badge.unlockDate = new Date().toISOString();
        
        // Show notification
        this.showNotification(`Badge Unlocked: ${badge.title || badge.name}`, 'badge');
        
        console.log(`Badge unlocked: ${badge.title || badge.name}`);
        
        // Check if all badges are unlocked for ultimate champion badge
        const allRegularBadges = this.userProfile.badges
            .filter(b => b.id !== 'ultimate-champion')
            .every(b => b.unlocked);
            
        if (allRegularBadges) {
            // Find ultimate champion badge
            const ultimateBadge = this.userProfile.badges.find(b => b.id === 'ultimate-champion');
            if (ultimateBadge && !ultimateBadge.unlocked) {
                ultimateBadge.unlocked = true;
                ultimateBadge.unlockDate = new Date().toISOString();
                
                console.log('Ultimate Champion badge unlocked!');
            }
        }
    }
    
    // Update daily task progress
    updateDailyTaskProgress(taskId, increment) {
        if (!this.userProfile || !this.userProfile.dailyTasks || !this.userProfile.dailyTasks.tasks) return;
        
        // Find the task either by direct access or in the array
        let task;
        if (Array.isArray(this.userProfile.dailyTasks.tasks)) {
            task = this.userProfile.dailyTasks.tasks.find(t => t.id === taskId);
        } else {
            task = this.userProfile.dailyTasks.tasks[taskId];
        }
        
        if (!task || task.completed) return;
        
        // Update progress
        task.progress = (task.progress || 0) + increment;
        task.current = (task.current || 0) + increment;
        
        // Check if completed
        if (task.progress >= (task.total || task.target)) {
            task.completed = true;
            
            console.log(`Daily task completed: ${task.title || taskId}`);
        }
    }
    
    // Save progress to user profile
    saveProgress() {
        if (!this.userProfile || !this.userProfile.saveProfile) return;
        
        // Update last played time
        this.userProfile.stats.lastPlayed = new Date().toISOString();
        
        // Save profile
        this.userProfile.saveProfile();
        
        console.log("Progress saved to user profile");
    }
    
    // Show a notification to the player
    showNotification(message, type) {
        // Dispatch a notification event for the UI to handle
        const event = new CustomEvent('progressNotification', {
            detail: {
                message: message,
                type: type || 'info',
                timestamp: Date.now()
            }
        });
        
        window.dispatchEvent(event);
        
        console.log(`Notification: ${message} (${type})`);
    }
    
    // Clean up on game end
    cleanup() {
        // Clear intervals
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        
        if (this.achievementCheckInterval) {
            clearInterval(this.achievementCheckInterval);
        }
        
        console.log("Progress Tracker cleaned up");
    }

    // Add the missing checkAllAchievements method
    async checkAllAchievements() {
        if (!this.userProfile || !this.userProfile.achievements) {
            return;
        }

        try {
            // Check level-based achievements
            const playerLevel = this.userProfile.xp?.level || 1;
            if (playerLevel >= 10) this.updateAchievementProgress('rookie-warrior', 1, 1);
            if (playerLevel >= 20) this.updateAchievementProgress('veteran-striker', 1, 1);
            if (playerLevel >= 30) this.updateAchievementProgress('elite-commander', 1, 1);
            if (playerLevel >= 40) this.updateAchievementProgress('master-tactician', 1, 1);
            if (playerLevel >= 50) this.updateAchievementProgress('legendary-champion', 1, 1);

            // Check score-based achievements
            const totalScore = this.userProfile.stats?.totalScore || 0;
            if (totalScore >= 10000) this.updateAchievementProgress('score-hunter', 1, 1);
            if (totalScore >= 50000) this.updateAchievementProgress('score-master', 1, 1);
            if (totalScore >= 100000) this.updateAchievementProgress('score-legend', 1, 1);

            // Check enemies defeated achievements
            const enemiesDefeated = this.userProfile.stats?.enemiesDefeated || 0;
            if (enemiesDefeated >= 100) this.updateAchievementProgress('enemy-slayer', 1, 1);
            if (enemiesDefeated >= 500) this.updateAchievementProgress('enemy-destroyer', 1, 1);
            if (enemiesDefeated >= 1000) this.updateAchievementProgress('enemy-annihilator', 1, 1);

            // Check game completion achievements
            const gamesCompleted = this.userProfile.stats?.victories || 0;
            if (gamesCompleted >= 10) this.updateAchievementProgress('dedicated-player', 1, 1);
            if (gamesCompleted >= 50) this.updateAchievementProgress('veteran-player', 1, 1);
            if (gamesCompleted >= 100) this.updateAchievementProgress('elite-player', 1, 1);

            // Check daily tasks completion achievements
            const dailyTasksCompleted = this.userProfile.stats?.dailyTasksCompleted || 0;
            if (dailyTasksCompleted >= 7) this.updateAchievementProgress('weekly-warrior', 1, 1);
            if (dailyTasksCompleted >= 30) this.updateAchievementProgress('monthly-master', 1, 1);

            console.log('Achievement check completed');
        } catch (error) {
            console.error('Error checking achievements:', error);
        }
    }
}

// Create and export a singleton instance
export const progressTracker = new ProgressTracker();
export default progressTracker; 