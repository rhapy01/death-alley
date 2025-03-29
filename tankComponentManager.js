// Tank Component Manager
import { TANK_COMPONENTS } from './tankUpgrade.js';

class TankComponentManager {
    constructor(tank) {
        this.tank = tank;
        this.components = {};
        
        // Initialize components
        Object.keys(TANK_COMPONENTS).forEach(type => {
            this.components[type] = {
                active: false,
                level: 0
            };
        });
        this.shield = { current: 0, max: 0, regenRate: 0 };
    }

    // Purchase a new component
    purchaseComponent(componentType) {
        console.log('Starting component purchase...', {
            componentType,
            tank: {
                dcoins: this.tank.dcoins,
                level: this.tank.level
            }
        });

        const component = TANK_COMPONENTS[componentType];
        if (!component) {
            console.error('Invalid component type:', componentType);
            return false;
        }

        // Sync dcoins before purchase
        if (typeof window.syncTankDCoins === 'function') {
            window.syncTankDCoins(this.tank);
        }

        const currentDCoins = Number(this.tank.dcoins) || 0;
        const componentCost = Number(component.cost);

        console.log('Purchase balance check:', {
            currentDCoins,
            componentCost,
            hasEnough: currentDCoins >= componentCost
        });

        if (currentDCoins >= componentCost && !this.components[componentType].active) {
            // Update both tank and profile dcoins
            this.tank.dcoins = currentDCoins - componentCost;
            if (window.userProfile && window.userProfile.dCoin) {
                window.userProfile.dCoin.balance = this.tank.dcoins;
                if (typeof window.userProfile.saveProfile === 'function') {
                    window.userProfile.saveProfile();
                }
            }

            this.components[componentType].active = true;
            this.components[componentType].level = 1;
            this.applyComponentEffects(componentType);

            console.log('Component purchase complete:', {
                componentType,
                newBalance: this.tank.dcoins
            });

            return true;
        }

        console.log('Component purchase failed:', {
            insufficientFunds: currentDCoins < componentCost,
            alreadyActive: this.components[componentType].active
        });

        return false;
    }

    // Upgrade an existing component
    upgradeComponent(componentType) {
        console.log('Starting component upgrade process...', {
            componentType,
            tank: {
                dcoins: this.tank.dcoins,
                level: this.tank.level
            }
        });

        const component = this.components[componentType];
        if (!component || !component.active) {
            console.error('Component upgrade failed: Component not found or not active', {
                componentType,
                found: !!component,
                active: component?.active
            });
            return false;
        }

        // Sync dcoins before upgrade
        if (typeof window.syncTankDCoins === 'function') {
            window.syncTankDCoins(this.tank);
        }

        const upgradeCost = this.calculateComponentUpgradeCost(componentType);
        console.log('Component upgrade cost calculation:', {
            componentType,
            currentLevel: component.level,
            maxLevel: TANK_COMPONENTS[componentType].maxLevel,
            calculatedCost: upgradeCost,
            currentDCoins: this.tank.dcoins
        });

        if (component.level >= TANK_COMPONENTS[componentType].maxLevel) {
            console.log('Component at max level:', {
                componentType,
                currentLevel: component.level,
                maxLevel: TANK_COMPONENTS[componentType].maxLevel
            });
            return false;
        }

        const currentDCoins = Number(this.tank.dcoins) || 0;
        const requiredDCoins = Number(upgradeCost);

        console.log('Component upgrade balance check:', {
            currentDCoins,
            requiredDCoins,
            hasEnough: currentDCoins >= requiredDCoins
        });

        if (currentDCoins >= requiredDCoins) {
            console.log('Performing component upgrade:', {
                componentType,
                oldLevel: component.level,
                newLevel: component.level + 1,
                oldBalance: currentDCoins,
                newBalance: currentDCoins - requiredDCoins
            });

            // Update both tank and profile dcoins
            this.tank.dcoins = currentDCoins - requiredDCoins;
            if (window.userProfile && window.userProfile.dCoin) {
                window.userProfile.dCoin.balance = this.tank.dcoins;
                if (typeof window.userProfile.saveProfile === 'function') {
                    window.userProfile.saveProfile();
                }
            }

            component.level++;
            this.applyComponentEffects(componentType);

            console.log('Component upgrade complete. New state:', {
                componentType,
                level: component.level,
                tankDCoins: this.tank.dcoins
            });

            return true;
        } else {
            console.log('Insufficient dcoins for component upgrade:', {
                current: currentDCoins,
                needed: requiredDCoins,
                difference: requiredDCoins - currentDCoins
            });
            return false;
        }
    }

    // Calculate upgrade cost for a component
    calculateComponentUpgradeCost(componentType) {
        const basePrice = TANK_COMPONENTS[componentType].cost;
        const currentLevel = this.components[componentType].level;
        const cost = Math.round(basePrice * (1 + (currentLevel * 0.5)));
        
        console.log('Component upgrade cost calculation:', {
            componentType,
            basePrice,
            currentLevel,
            calculatedCost: cost
        });
        
        return cost;
    }

    // Apply component effects
    applyComponentEffects(componentType) {
        const component = this.components[componentType];
        if (!component.active) return;

        const effects = TANK_COMPONENTS[componentType].effect(component.level);

        switch (componentType) {
            case 'REINFORCED_ARMOR':
                this.tank.maxHealth += effects.healthBonus;
                this.tank.damageReduction = effects.damageReduction;
                break;

            case 'ENHANCED_CANNON':
                this.tank.damageMultiplier = 1 + (effects.damageBonus / 100);
                this.tank.reloadSpeedMultiplier = 1 + (effects.reloadSpeedBonus / 100);
                break;

            case 'POWER_CORE':
                this.tank.speedMultiplier = 1 + (effects.speedBonus / 100);
                this.tank.turnSpeedMultiplier = 1 + (effects.turnSpeedBonus / 100);
                break;

            case 'SHIELD_GENERATOR':
                this.shield.max = effects.shieldCapacity;
                this.shield.current = this.shield.max;
                this.shield.regenRate = effects.shieldRegenRate;
                break;

            case 'TARGETING_SYSTEM':
                this.tank.accuracyBonus = effects.accuracyBonus;
                this.tank.criticalHitChance = effects.criticalHitChance;
                break;
        }
    }

    // Update shield regeneration
    updateShield(deltaTime) {
        if (this.components.SHIELD_GENERATOR.active && this.shield.current < this.shield.max) {
            this.shield.current = Math.min(
                this.shield.max,
                this.shield.current + (this.shield.regenRate * deltaTime)
            );
        }
    }

    // Handle incoming damage with shield and armor
    processDamage(damage) {
        let remainingDamage = damage;

        // Shield absorption
        if (this.components.SHIELD_GENERATOR.active && this.shield.current > 0) {
            const shieldDamage = Math.min(remainingDamage, this.shield.current);
            this.shield.current -= shieldDamage;
            remainingDamage -= shieldDamage;
        }

        // Armor damage reduction
        if (this.components.REINFORCED_ARMOR.active) {
            remainingDamage *= (1 - (this.tank.damageReduction / 100));
        }

        return Math.max(0, remainingDamage);
    }

    // Get component stats for UI display
    getComponentStats(componentType) {
        const component = this.components[componentType];
        if (!component.active) return null;

        const effects = TANK_COMPONENTS[componentType].effect(component.level);
        return {
            level: component.level,
            maxLevel: TANK_COMPONENTS[componentType].maxLevel,
            effects: effects
        };
    }

    // Save component state
    save() {
        return {
            components: this.components,
            shield: this.shield
        };
    }

    // Load component state
    load(data) {
        if (data.components) {
            this.components = data.components;
            Object.keys(this.components).forEach(componentType => {
                if (this.components[componentType].active) {
                    this.applyComponentEffects(componentType);
                }
            });
        }
        if (data.shield) {
            this.shield = data.shield;
        }
    }
}

export default TankComponentManager; 