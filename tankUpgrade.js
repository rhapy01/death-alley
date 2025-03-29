// Tank Components and Upgrade System

// Tank Components Configuration
const TANK_COMPONENTS = {
    REINFORCED_ARMOR: {
        name: "Reinforced Armor",
        description: "Increases tank's health and damage resistance",
        cost: 5000,
        unlockLevel: 10,
        maxLevel: 20,
        baseEffect: 10, // 10% damage reduction per level
        effect: (level) => ({
            healthBonus: level * 50,
            damageReduction: level * 10
        })
    },
    ENHANCED_CANNON: {
        name: "Enhanced Cannon",
        description: "Increases damage output and reload speed",
        cost: 5000,
        unlockLevel: 20,
        maxLevel: 20,
        baseEffect: 15, // 15% damage increase per level
        effect: (level) => ({
            damageBonus: level * 15,
            reloadSpeedBonus: level * 5
        })
    },
    POWER_CORE: {
        name: "Power Core",
        description: "Improves speed and maneuverability",
        cost: 5000,
        unlockLevel: 30,
        maxLevel: 20,
        baseEffect: 8, // 8% speed increase per level
        effect: (level) => ({
            speedBonus: level * 8,
            turnSpeedBonus: level * 5
        })
    },
    SHIELD_GENERATOR: {
        name: "Shield Generator",
        description: "Provides energy shield and regeneration",
        cost: 5000,
        unlockLevel: 40,
        maxLevel: 20,
        baseEffect: 20, // 20 shield points per level
        effect: (level) => ({
            shieldCapacity: level * 20,
            shieldRegenRate: level * 2
        })
    },
    TARGETING_SYSTEM: {
        name: "Targeting System",
        description: "Enhances accuracy and critical hit chance",
        cost: 5000,
        unlockLevel: 50,
        maxLevel: 20,
        baseEffect: 5, // 5% accuracy increase per level
        effect: (level) => ({
            accuracyBonus: level * 5,
            criticalHitChance: level * 2
        })
    }
};

// Tank Upgrade Configuration
const TANK_UPGRADE = {
    baseUpgradeCost: 2000,
    costMultiplier: 1.2, // 20% increase per level
    maxLevel: 50
};

// Calculate upgrade cost based on current level
function calculateUpgradeCost(currentLevel) {
    return Math.round(TANK_UPGRADE.baseUpgradeCost * Math.pow(TANK_UPGRADE.costMultiplier, currentLevel));
}

// Calculate component upgrade cost based on component type and current level
function calculateComponentUpgradeCost(componentType) {
    const component = TANK_COMPONENTS[componentType];
    const currentLevel = window.tank?.componentManager?.components[componentType]?.level || 0;
    
    // Base cost increases by 50% per level
    const baseCost = component.cost;
    const multiplier = 1.5; // 50% increase per level
    
    return Math.round(baseCost * Math.pow(multiplier, currentLevel));
}

// Check if component is unlocked
function isComponentUnlocked(componentType, tankLevel) {
    return tankLevel >= TANK_COMPONENTS[componentType].unlockLevel;
}

// Get available components for current tank level
function getAvailableComponents(tankLevel) {
    return Object.entries(TANK_COMPONENTS)
        .filter(([_, component]) => tankLevel >= component.unlockLevel)
        .map(([key, component]) => ({
            type: key,
            ...component
        }));
}

// Create upgrade UI elements
export function createUpgradeUI(scene, tank) {
    const container = document.createElement('div');
    container.id = 'tank-upgrade-container';
    container.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 10px;
        color: white;
        z-index: 1000;
        display: none;
    `;

    // Add close button at the top right
    const closeButton = document.createElement('button');
    closeButton.className = 'close-upgrade-btn';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => toggleUpgradeMenu(container);

    // Create upgrade button
    const upgradeBtn = document.createElement('button');
    upgradeBtn.id = 'tank-upgrade-btn';
    upgradeBtn.className = 'game-btn';
    upgradeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background: linear-gradient(to bottom, #4CAF50, #45a049);
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    `;
    upgradeBtn.textContent = 'Tank Upgrade';
    upgradeBtn.onclick = () => toggleUpgradeMenu(container);

    // Create components section
    const componentsSection = document.createElement('div');
    componentsSection.id = 'components-section';
    componentsSection.innerHTML = `
        <h3>Tank Components</h3>
        <div id="components-list"></div>
    `;

    // Create upgrade section
    const upgradeSection = document.createElement('div');
    upgradeSection.id = 'upgrade-section';
    upgradeSection.innerHTML = `
        <h3>Tank Level: <span id="tank-level">1</span></h3>
        <p>Next upgrade cost: <span id="upgrade-cost">2000</span> DCoins</p>
        <button id="perform-upgrade" class="game-btn">Upgrade Tank</button>
    `;

    // Add event listener for tank upgrade button
    upgradeSection.querySelector('#perform-upgrade').addEventListener('click', () => {
        if (tank) {
            performTankUpgrade(tank);
            updateUpgradeUI(tank);
        } else {
            showNotification('Error', 'Tank not initialized', 'error');
        }
    });

    // Add close button as first child
    container.appendChild(closeButton);
    container.appendChild(componentsSection);
    container.appendChild(upgradeSection);
    document.body.appendChild(upgradeBtn);
    document.body.appendChild(container);

    // Add event listener for ESC key to close modal
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && container.style.display === 'block') {
            toggleUpgradeMenu(container);
        }
    });

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .game-btn {
            background: linear-gradient(to bottom, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 5px;
            padding: 10px 20px;
            margin: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .game-btn:hover {
            background: linear-gradient(to bottom, #45a049, #4CAF50);
            transform: translateY(-2px);
        }
        .game-btn:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
        }
        .component-item {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #444;
            border-radius: 5px;
            background: rgba(0, 0, 0, 0.5);
        }
        .component-locked {
            opacity: 0.5;
            background: rgba(255, 0, 0, 0.1);
        }
        .close-upgrade-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            color: #fff;
            font-size: 24px;
            cursor: pointer;
            padding: 5px 10px;
            line-height: 1;
            transition: all 0.3s ease;
        }
        .close-upgrade-btn:hover {
            color: #ff4444;
            transform: scale(1.1);
        }
        #tank-upgrade-container {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            min-width: 300px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            padding-top: 40px; /* Space for close button */
        }
    `;
    document.head.appendChild(style);

    return {
        container,
        upgradeBtn,
        updateUI: updateUpgradeUI
    };
}

// Toggle upgrade menu visibility
function toggleUpgradeMenu(container) {
    const isVisible = container.style.display === 'block';
    container.style.display = isVisible ? 'none' : 'block';
}

// Update upgrade UI with current stats
function updateUpgradeUI(tank) {
    const tankLevel = document.getElementById('tank-level');
    const upgradeCost = document.getElementById('upgrade-cost');
    const componentsList = document.getElementById('components-list');

    if (tankLevel) tankLevel.textContent = tank.level;
    if (upgradeCost) upgradeCost.textContent = calculateUpgradeCost(tank.level);

    if (componentsList) {
        componentsList.innerHTML = '';
        const availableComponents = getAvailableComponents(tank.level);

        Object.entries(TANK_COMPONENTS).forEach(([type, component]) => {
            const isUnlocked = isComponentUnlocked(type, tank.level);
            const componentDiv = document.createElement('div');
            componentDiv.className = `component-item ${isUnlocked ? '' : 'component-locked'}`;
            
            const currentLevel = tank.componentManager.components[type].level;
            const upgradeCost = calculateComponentUpgradeCost(type);
            
            componentDiv.innerHTML = `
                <h4>${component.name} ${isUnlocked ? `(Level ${currentLevel})` : '(Locked)'}</h4>
                <p>${component.description}</p>
                <p>Unlocks at Tank Level ${component.unlockLevel}</p>
                ${isUnlocked ? `
                    ${currentLevel === 0 ? `
                        <p>Cost: ${component.cost} DCoins</p>
                        <button class="game-btn" onclick="purchaseComponent('${type}')"
                                ${tank.dcoins < component.cost ? 'disabled' : ''}>
                            Purchase
                        </button>
                    ` : `
                        <p>Upgrade Cost: ${upgradeCost} DCoins</p>
                        <button class="game-btn" onclick="upgradeComponent('${type}')"
                                ${currentLevel >= component.maxLevel || tank.dcoins < upgradeCost ? 'disabled' : ''}>
                            Upgrade to Level ${currentLevel + 1}
                        </button>
                    `}
                ` : ''}
            `;
            componentsList.appendChild(componentDiv);
        });
    }
}

// Notification system for tank upgrades
function showNotification(title, message, type = 'info') {
    const modal = document.createElement('div');
    modal.className = 'upgrade-notification-modal';
    modal.innerHTML = `
        <div class="notification-content ${type}">
            <h3>${title}</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.parentElement.remove()" class="notification-btn ${type}">
                ${type === 'error' ? 'Try Again' : 'OK'}
            </button>
        </div>
    `;
    document.body.appendChild(modal);

    // Add styles if they don't exist
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .upgrade-notification-modal {
                position: fixed;
                bottom: 20px;  /* Changed from top: 0 to bottom: 20px */
                left: 50%;
                transform: translateX(-50%);
                background: transparent;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                animation: slideUp 0.3s ease-out;
            }
            @keyframes slideUp {
                from {
                    transform: translate(-50%, 100%);
                    opacity: 0;
                }
                to {
                    transform: translate(-50%, 0);
                    opacity: 1;
                }
            }
            .notification-content {
                background: #2a2a2a;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                border: 2px solid;
            }
            .notification-content.success {
                border-color: #4CAF50;
                background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);
            }
            .notification-content.error {
                border-color: #f44336;
                background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);
            }
            .notification-content.info {
                border-color: #2196F3;
                background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);
            }
            .notification-content h3 {
                margin: 0 0 15px 0;
                color: white;
                font-size: 18px;
            }
            .notification-content p {
                margin: 0 0 20px 0;
                color: #ddd;
                font-size: 16px;
            }
            .notification-btn {
                border: none;
                padding: 10px 30px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s;
                color: white;
                text-transform: uppercase;
                font-weight: bold;
            }
            .notification-btn.success {
                background: linear-gradient(to bottom, #4CAF50, #45a049);
            }
            .notification-btn.error {
                background: linear-gradient(to bottom, #f44336, #d32f2f);
            }
            .notification-btn.info {
                background: linear-gradient(to bottom, #2196F3, #1976D2);
            }
            .notification-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            .notification-btn:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (modal && modal.parentElement) {
            modal.style.animation = 'slideDown 0.3s ease-in forwards';
            setTimeout(() => modal.remove(), 300);
        }
    }, 3000);
}

// Update the purchase component function
window.purchaseComponent = (componentType) => {
    const component = TANK_COMPONENTS[componentType];
    const tank = window.tank;

    if (!tank) {
        showNotification('Error', 'Tank not initialized', 'error');
        return false;
    }

    if (tank.dcoins < component.cost) {
        showNotification(
            'Not Enough DCoins!',
            `You need ${component.cost - tank.dcoins} more DCoins to purchase ${component.name}`,
            'error'
        );
        return false;
    }

    if (tank.level < component.unlockLevel) {
        showNotification(
            'Level Required',
            `Reach level ${component.unlockLevel} to unlock ${component.name}`,
            'error'
        );
        return false;
    }

    // If all checks pass, purchase the component
    tank.dcoins -= component.cost;
    tank.componentManager.purchaseComponent(componentType);
    
    showNotification(
        'Purchase Complete!',
        `${component.name} has been added to your tank`,
        'success'
    );
    return true;
};

// Update the upgrade component function
window.upgradeComponent = (componentType) => {
    const component = TANK_COMPONENTS[componentType];
    const tank = window.tank;
    const currentLevel = tank.componentManager.components[componentType].level;
    const upgradeCost = calculateUpgradeCost(currentLevel);

    if (!tank) {
        showNotification('Error', 'Tank not initialized', 'error');
        return false;
    }

    if (currentLevel >= component.maxLevel) {
        showNotification(
            'Maximum Level Reached',
            `${component.name} is fully upgraded`,
            'info'
        );
        return false;
    }

    if (tank.dcoins < upgradeCost) {
        showNotification(
            'Not Enough DCoins!',
            `You need ${upgradeCost - tank.dcoins} more DCoins to upgrade ${component.name}`,
            'error'
        );
        return false;
    }

    // If all checks pass, upgrade the component
    tank.dcoins -= upgradeCost;
    tank.componentManager.upgradeComponent(componentType);
    
    showNotification(
        'Upgrade Complete!',
        `${component.name} upgraded to level ${currentLevel + 1}`,
        'success'
    );
    return true;
};

// Add synchronization function
function syncTankDCoins(tank) {
    if (!tank) return;
    
    // Get dcoins from user profile if available
    if (window.userProfile && window.userProfile.dCoin) {
        // Ensure we're working with numbers
        const profileBalance = Number(window.userProfile.dCoin.balance) || 0;
        tank.dcoins = profileBalance;
        
        console.log('Synchronized tank dcoins with profile:', {
            profileBalance,
            tankDCoins: tank.dcoins
        });
    } else {
        // Initialize if not available
        tank.dcoins = tank.dcoins || 0;
        console.log('Initialized tank dcoins:', tank.dcoins);
    }
}

// Update the tank upgrade function
function performTankUpgrade(tank) {
    console.log('Starting tank upgrade process...');
    
    if (!tank) {
        console.error('Tank not initialized');
        showNotification('Error', 'Tank not initialized', 'error');
        return false;
    }

    // Sync dcoins before upgrade
    syncTankDCoins(tank);
    
    console.log('Tank state after sync:', {
        level: tank.level || 1,
        dcoins: tank.dcoins,
        maxLevel: TANK_UPGRADE.maxLevel
    });

    const upgradeCost = calculateUpgradeCost(tank.level || 1);
    console.log('Upgrade cost calculation:', {
        currentLevel: tank.level || 1,
        calculatedCost: upgradeCost,
        baseUpgradeCost: TANK_UPGRADE.baseUpgradeCost,
        costMultiplier: TANK_UPGRADE.costMultiplier
    });

    if (!tank.level) tank.level = 1;

    if (tank.level >= TANK_UPGRADE.maxLevel) {
        console.log('Maximum level reached:', tank.level);
        showNotification(
            'Maximum Level Reached',
            `Your tank is fully upgraded`,
            'info'
        );
        return false;
    }

    // Convert values to numbers for comparison
    const currentDCoins = Number(tank.dcoins) || 0;
    const requiredDCoins = Number(upgradeCost);

    console.log('Balance check:', {
        currentDCoins,
        requiredDCoins,
        hasEnough: currentDCoins >= requiredDCoins
    });

    if (currentDCoins < requiredDCoins) {
        console.log('Insufficient dcoins:', {
            current: currentDCoins,
            needed: requiredDCoins,
            difference: requiredDCoins - currentDCoins
        });
        showNotification(
            'Not Enough DCoins!',
            `You need ${requiredDCoins - currentDCoins} more DCoins to upgrade your tank`,
            'error'
        );
        return false;
    }

    // If all checks pass, upgrade the tank
    console.log('Performing upgrade:', {
        oldLevel: tank.level,
        newLevel: tank.level + 1,
        oldBalance: currentDCoins,
        newBalance: currentDCoins - requiredDCoins
    });

    // Update both tank and profile dcoins
    tank.dcoins = currentDCoins - requiredDCoins;
    if (window.userProfile && window.userProfile.dCoin) {
        window.userProfile.dCoin.balance = tank.dcoins;
        if (typeof window.userProfile.saveProfile === 'function') {
            window.userProfile.saveProfile();
        }
    }

    tank.level++;
    
    showNotification(
        'Upgrade Complete!',
        `Tank upgraded to level ${tank.level}`,
        'success'
    );
    
    console.log('Upgrade complete. New tank state:', {
        level: tank.level,
        dcoins: tank.dcoins
    });

    return true;
}

// Export functions for use in main game
export {
    TANK_COMPONENTS,
    TANK_UPGRADE,
    calculateUpgradeCost,
    calculateComponentUpgradeCost,
    isComponentUnlocked,
    getAvailableComponents,
    syncTankDCoins
}; 