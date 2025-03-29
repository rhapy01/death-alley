// integrations.js
// This file integrates the user profile system with the SaveSystem and ProgressSystem

import { userProfile } from './user.js';
import saveSystem from './saveSystem.js';
import progressSystem from './progressSystem.js';

class SystemIntegrator {
    constructor() {
        this.initialized = false;
    }
    
    async init() {
        if (this.initialized) return;
        
        console.log('Initializing system integrator...');
        
        // Wait for both systems to initialize
        await Promise.all([
            new Promise(resolve => {
                if (userProfile.initialized) {
                    resolve();
                } else if (userProfile.initPromise) {
                    userProfile.initPromise.then(resolve);
                } else {
                    // If neither is available, just continue
                    resolve();
                }
            }),
            new Promise(resolve => {
                if (progressSystem.initialized) {
                    resolve();
                } else {
                    // Add a listener for when progress system initializes
                    const checkInterval = setInterval(() => {
                        if (progressSystem.initialized) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        console.warn('Progress system initialization timed out');
                        resolve();
                    }, 5000);
                }
            })
        ]);
        
        // Set up event listeners for synchronization
        this.setupEventListeners();
        
        // Sync data between systems
        this.syncData();
        
        this.initialized = true;
        console.log('System integrator initialized');
    }
    
    setupEventListeners() {
        // Listen for profile updates
        window.addEventListener('profileUpdated', () => {
            this.syncUserProfileToProgressSystem();
        });
        
        // Listen for achievement unlocks
        window.addEventListener('achievementUnlocked', (event) => {
            if (event.detail && event.detail.achievement) {
                this.updateUserProfileAchievement(event.detail.achievement);
            }
        });
        
        // Listen for badge unlocks
        window.addEventListener('badgeUnlocked', (event) => {
            if (event.detail && event.detail.badge) {
                this.updateUserProfileBadge(event.detail.badge);
            }
        });
        
        // Listen for task completions
        window.addEventListener('taskCompleted', (event) => {
            if (event.detail && event.detail.task) {
                this.updateUserProfileTask(event.detail.task);
            }
        });
        
        // Listen for NFT minting
        window.addEventListener('nftMinted', (event) => {
            if (event.detail) {
                this.updateUserProfileNFT(event.detail);
            }
        });
    }
    
    // Sync data between user profile and progress system
    syncData() {
        // Sync from user profile to progress system
        this.syncUserProfileToProgressSystem();
        
        // Sync from progress system to user profile
        this.syncProgressSystemToUserProfile();
    }
    
    // Update user profile with progress system data
    syncProgressSystemToUserProfile() {
        if (!userProfile || !userProfile.initialized) return;
        
        console.log('Syncing progress system data to user profile...');
        
        try {
            // Sync achievements
            const unlockedAchievements = progressSystem.getUnlockedAchievements();
            if (unlockedAchievements && unlockedAchievements.length > 0) {
                unlockedAchievements.forEach(achievement => {
                    this.updateUserProfileAchievement(achievement);
                });
            }
            
            // Sync badges
            const unlockedBadges = progressSystem.getUnlockedBadges();
            if (unlockedBadges && unlockedBadges.length > 0) {
                unlockedBadges.forEach(badge => {
                    this.updateUserProfileBadge(badge);
                });
            }
            
            // Sync NFTs
            const mintedNFTs = progressSystem.getMintedNFTs();
            if (mintedNFTs && mintedNFTs.length > 0) {
                mintedNFTs.forEach(nft => {
                    this.updateUserProfileNFT(nft);
                });
            }
            
            // Save user profile
            userProfile.saveProfile();
            
        } catch (error) {
            console.error('Error syncing progress system to user profile:', error);
        }
    }
    
    // Update progress system with user profile data
    syncUserProfileToProgressSystem() {
        if (!userProfile || !userProfile.initialized) return;
        
        console.log('Syncing user profile data to progress system...');
        
        try {
            // Sync stats if available
            if (userProfile.stats) {
                progressSystem.updateStats({
                    enemiesDefeated: userProfile.stats.enemiesDefeated || 0,
                    highScore: userProfile.stats.highScore || 0,
                    normalLevelsCompleted: userProfile.gameModes?.normal?.levelsCompleted || 0,
                    obstaclesCleared: userProfile.gameModes?.obstacle?.obstaclesCleared || 0
                });
            }
            
            // Save progress system data
            saveSystem.saveAll(true);
            
        } catch (error) {
            console.error('Error syncing user profile to progress system:', error);
        }
    }
    
    // Update user profile with an unlocked achievement
    updateUserProfileAchievement(achievement) {
        if (!userProfile || !userProfile.initialized) return;
        
        try {
            // Find matching achievement in user profile
            const userAchievement = userProfile.achievements?.find(a => a.id === achievement.id);
            
            if (userAchievement) {
                userAchievement.unlocked = true;
                userAchievement.progress = achievement.total || userAchievement.total;
                userAchievement.unlockDate = achievement.unlockDate || new Date().toISOString();
                
                if (typeof userProfile.saveProfile === 'function') {
                    userProfile.saveProfile();
                }
            }
        } catch (error) {
            console.error('Error updating user profile achievement:', error);
        }
    }
    
    // Update user profile with an unlocked badge
    updateUserProfileBadge(badge) {
        if (!userProfile || !userProfile.initialized) return;
        
        try {
            // Find matching badge in user profile
            const userBadge = userProfile.badges?.find(b => b.id === badge.id);
            
            if (userBadge) {
                userBadge.unlocked = true;
                userBadge.unlockDate = badge.unlockDate || new Date().toISOString();
                
                if (typeof userProfile.saveProfile === 'function') {
                    userProfile.saveProfile();
                }
            }
        } catch (error) {
            console.error('Error updating user profile badge:', error);
        }
    }
    
    // Update user profile with a completed task
    updateUserProfileTask(task) {
        if (!userProfile || !userProfile.initialized) return;
        
        try {
            // Call the user profile method to update task progress
            if (typeof userProfile.updateDailyTaskProgress === 'function') {
                userProfile.updateDailyTaskProgress(task.id, task.total);
            }
        } catch (error) {
            console.error('Error updating user profile task:', error);
        }
    }
    
    // Update user profile with a minted NFT
    updateUserProfileNFT(nft) {
        if (!userProfile || !userProfile.initialized) return;
        
        try {
            if (typeof userProfile.mintAchievement === 'function' && nft.type === 'achievement') {
                userProfile.mintAchievement(nft.id);
            } else if (typeof userProfile.mintBadge === 'function' && nft.type === 'badge') {
                userProfile.mintBadge(nft.id);
            }
        } catch (error) {
            console.error('Error updating user profile NFT:', error);
        }
    }
}

// Create a singleton instance
const integrator = new SystemIntegrator();

// Export the singleton
export default integrator; 