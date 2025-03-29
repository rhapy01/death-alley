// System Integrator
// Connects all the game systems together

class SystemIntegrator {
    constructor() {
        this.initialized = false;
        this.userProfile = null;
        this.saveSystem = null;
        this.progressTracker = null;
    }
    
    // Initialize the integrator
    initialize() {
        if (this.initialized) return;
        
        console.log("Initializing System Integrator...");
        
        // Get references to systems
        this.userProfile = window.userProfile;
        this.saveSystem = window.saveSystem;
        this.progressTracker = window.progressTracker;
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        console.log("System Integrator initialized successfully");
    }
    
    // Set up event listeners to coordinate between systems
    setupEventListeners() {
        // Listen for profile updates
        window.addEventListener('profileUpdated', () => {
            this.syncSystems();
        });
        
        // Listen for save events
        window.addEventListener('saveCompleted', () => {
            console.log("Save completed, checking for sync needs");
            this.checkSyncNeeds();
        });
        
        // Listen for game events that might require synchronization
        window.addEventListener('gameCompleted', () => {
            this.forceSyncAll();
        });
        
        window.addEventListener('gameOver', () => {
            this.forceSyncAll();
        });
        
        // Listen for achievement/badge events
        window.addEventListener('achievementUnlocked', (e) => {
            if (this.userProfile) {
                this.userProfile.saveProfile();
            }
        });
        
        window.addEventListener('badgeEarned', (e) => {
            if (this.userProfile) {
                this.userProfile.saveProfile();
            }
        });
        
        console.log("System Integrator event listeners set up");
    }
    
    // Sync all systems
    syncSystems() {
        if (!this.initialized) return;
        
        console.log("Syncing all systems...");
        
        // Sync user profile
        if (this.userProfile && this.userProfile.initialized) {
            console.log("Syncing user profile");
            this.userProfile.saveProfile();
        }
        
        // Sync save system
        if (this.saveSystem && this.saveSystem.initialized) {
            console.log("Syncing save system");
            this.saveSystem.saveAll();
        }
        
        console.log("All systems synced");
    }
    
    // Check if sync is needed and perform if necessary
    checkSyncNeeds() {
        // Check user profile last save time
        const profileLastSaved = this.userProfile?.lastSaveTime || 0;
        const saveSystemLastSaved = this.saveSystem?.lastSaveTime || 0;
        
        // If profile was saved more than 30 seconds ago, sync
        if (Date.now() - profileLastSaved > 30000) {
            console.log("Profile sync needed (last saved >30s ago)");
            if (this.userProfile && this.userProfile.initialized) {
                this.userProfile.saveProfile();
            }
        }
        
        // If save system was saved more than 60 seconds ago, sync
        if (Date.now() - saveSystemLastSaved > 60000) {
            console.log("Save system sync needed (last saved >60s ago)");
            if (this.saveSystem && this.saveSystem.initialized) {
                this.saveSystem.saveAll();
            }
        }
    }
    
    // Force sync of all systems immediately
    forceSyncAll() {
        console.log("Forcing sync of all systems");
        
        // First save user profile
        if (this.userProfile && this.userProfile.initialized) {
            this.userProfile.saveProfile();
        }
        
        // Then use save system to save everything
        if (this.saveSystem && this.saveSystem.initialized) {
            this.saveSystem.saveAll();
        }
        
        console.log("Force sync completed");
    }
    
    // Handle errors in any system
    handleSystemError(system, error) {
        console.error(`Error in ${system}:`, error);
        
        // Try to recover by forcing sync
        this.forceSyncAll();
        
        // Dispatch error event for UI handling
        window.dispatchEvent(new CustomEvent('systemError', {
            detail: {
                system: system,
                error: error.message || 'Unknown error',
                timestamp: Date.now()
            }
        }));
    }
}

// Export singleton instance
export const integrator = new SystemIntegrator();
export default integrator; 