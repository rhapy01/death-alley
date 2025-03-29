// script.js
// Main entry point that initializes all systems and integrates them

import { userProfile } from './user.js';
import { initGame } from './game.js';
import saveSystem from './saveSystem.js';
import progressSystem from './progressSystem.js';
import integrator from './integrator.js';
import { createUpgradeUI, TANK_COMPONENTS, TANK_UPGRADE } from './tankUpgrade.js';
import TankComponentManager from './tankComponentManager.js';

// Make userProfile globally available
window.userProfile = userProfile;

// Initialize all systems in the correct order
async function initAll() {
    try {
        console.log('Starting initialization sequence...');
        
        // Initialize save system first
        if (window.saveSystem) {
            await window.saveSystem.initialize();
            console.log('Save system initialized');
        }
        
        // Wait for user profile to be ready
        if (window.userProfile) {
            await window.userProfile.initPromise;
            console.log('User profile initialized');
        } else {
            console.warn('User profile initPromise not available, continuing...');
        }
        
        // Initialize progress system
        if (window.progressSystem) {
            await window.progressSystem.initialize();
            console.log('Progress system initialized');
        }
        
        // Initialize system integrator
        if (window.integrator) {
            await window.integrator.initialize();
            console.log('System integrator initialized');
        }
        
        // Initialize game
        try {
            await initGame();
            console.log('Game initialized');
        } catch (gameError) {
            console.error('Error initializing game:', gameError);
            // Try to initialize game in fallback mode
            try {
                await initGame(true); // Pass true for fallback mode
                console.log('Game initialized in fallback mode');
            } catch (fallbackError) {
                console.error('Fallback initialization failed:', fallbackError);
                showErrorMessage('Game initialization failed. Please refresh the page or contact support.');
            }
        }
        
        // Setup notification system
        setupNotifications();
        
        // Make all systems globally available for debugging
        window.saveSystem = saveSystem;
        window.progressSystem = progressSystem;
        window.integrator = integrator;
        
        console.log('All systems initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        
        // Try to initialize the game even if some systems failed
        try {
            await initGame();
            console.warn('Game initialized in fallback mode');
        } catch (gameError) {
            console.error('Critical error: Game failed to initialize:', gameError);
            showErrorMessage('Failed to initialize game. Please refresh the page.');
        }
    }
}

// Function to handle progress notifications
function setupNotifications() {
    window.addEventListener('progressNotification', (event) => {
        const { message, type, timestamp } = event.detail;
        showNotification(message, type);
    });
}

// Function to show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Set notification title based on type
    let title = '';
    switch (type) {
        case 'achievement':
            title = 'Achievement Unlocked!';
            break;
        case 'badge':
            title = 'Badge Earned!';
            break;
        case 'task':
            title = 'Daily Task Completed!';
            break;
        case 'nft':
            title = 'New NFT Available!';
            break;
        default:
            title = 'Notification';
    }
    
    // Create notification content
    notification.innerHTML = `
        <div class="notification-title ${type}">${title}</div>
        <div class="notification-message">${message}</div>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Show error message when something goes wrong
function showErrorMessage(message) {
    const errorBox = document.createElement('div');
    errorBox.style.position = 'fixed';
    errorBox.style.top = '50%';
    errorBox.style.left = '50%';
    errorBox.style.transform = 'translate(-50%, -50%)';
    errorBox.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    errorBox.style.color = '#f44336';
    errorBox.style.padding = '20px';
    errorBox.style.borderRadius = '5px';
    errorBox.style.maxWidth = '80%';
    errorBox.style.textAlign = 'center';
    errorBox.style.zIndex = '9999';
    errorBox.style.fontFamily = "'Chakra Petch', sans-serif";
    errorBox.style.boxShadow = '0 0 20px rgba(244, 67, 54, 0.5)';
    errorBox.style.border = '1px solid #f44336';
    
    errorBox.innerHTML = `
        <h3 style="margin-top: 0; color: #f44336;">Error</h3>
        <p>${message}</p>
        <button style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Reload Page</button>
    `;
    
    // Add reload functionality to button
    errorBox.querySelector('button').addEventListener('click', () => {
        window.location.reload();
    });
    
    document.body.appendChild(errorBox);
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Make global references available
    window.userProfile = userProfile;
    window.saveSystem = saveSystem;
    window.progressSystem = progressSystem;
    window.integrator = integrator;
    
    // Initialize all systems
    initAll();
});

// Prevent context menu on right-click for canvas elements
document.addEventListener('contextmenu', function(event) {
    if (event.target.tagName.toLowerCase() === 'canvas') {
        event.preventDefault();
        return false;
    }
});

// Add auto-save on window unload event
window.addEventListener('beforeunload', () => {
    if (window.saveSystem) {
        window.saveSystem.saveAll();
    }
});

// Export the init function for direct use
export { initAll };

class Game {
    constructor() {
        // ... existing initialization ...
        
        // Initialize tank component manager
        this.tank.componentManager = new TankComponentManager(this.tank);
        
        // Initialize upgrade UI
        this.upgradeUI = createUpgradeUI(this, this.tank);
        
        // Setup upgrade event handlers
        this.setupUpgradeHandlers();
    }
    
    setupUpgradeHandlers() {
        const performUpgradeBtn = document.getElementById('perform-upgrade');
        if (performUpgradeBtn) {
            performUpgradeBtn.addEventListener('click', () => {
                const upgradeCost = calculateUpgradeCost(this.tank.level);
                if (this.tank.dcoins >= upgradeCost) {
                    this.tank.dcoins -= upgradeCost;
                    this.tank.level++;
                    this.upgradeUI.updateUI(this.tank);
                    this.showNotification('Tank Upgraded!', `Your tank is now level ${this.tank.level}`, 'achievement');
                }
            });
        }

        // Add purchase component handler to window
        window.purchaseComponent = (componentType) => {
            if (this.tank.componentManager.purchaseComponent(componentType)) {
                this.upgradeUI.updateUI(this.tank);
                this.showNotification('Component Purchased!', 
                    `${TANK_COMPONENTS[componentType].name} has been added to your tank`, 
                    'achievement');
            }
        };
    }
    
    update(deltaTime) {
        // ... existing update code ...
        
        // Update shield regeneration
        if (this.tank.componentManager) {
            this.tank.componentManager.updateShield(deltaTime);
        }
    }
    
    // Modify damage handling to use component manager
    handleTankDamage(damage) {
        if (this.tank.componentManager) {
            damage = this.tank.componentManager.processDamage(damage);
        }
        // ... rest of damage handling ...
    }
    
    // Add save/load functionality for components
    saveGame() {
        const saveData = {
            // ... existing save data ...
            components: this.tank.componentManager.save()
        };
        // ... save handling ...
    }
    
    loadGame(saveData) {
        // ... existing load code ...
        if (saveData.components && this.tank.componentManager) {
            this.tank.componentManager.load(saveData.components);
        }
    }
} 