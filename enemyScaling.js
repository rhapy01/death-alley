// Enemy Power Scaling Configuration

export const ENEMY_POWER_CONFIG = {
    // Base multipliers (2x power)
    BASE_MULTIPLIERS: {
        HEALTH: 2.0,      // Double base health
        DAMAGE: 2.0,      // Double base damage
        SPEED: 1.5,       // 50% increase in speed
        ARMOR: 1.5,       // 50% increase in armor
        ACCURACY: 1.2     // 20% increase in accuracy
    },

    // Level scaling factors (increased progression)
    LEVEL_SCALING: {
        HEALTH_PER_LEVEL: 0.15,    // 15% health increase per level
        DAMAGE_PER_LEVEL: 0.15,    // 15% damage increase per level
        SPEED_PER_LEVEL: 0.08,     // 8% speed increase per level
        ARMOR_PER_LEVEL: 0.1,      // 10% armor increase per level
        ACCURACY_PER_LEVEL: 0.05   // 5% accuracy increase per level
    },

    // Boss multipliers (relative to normal enemies)
    BOSS_MULTIPLIERS: {
        HEALTH: 5.0,      // 5x health
        DAMAGE: 3.0,      // 3x damage
        SPEED: 1.2,       // 20% faster
        ARMOR: 2.0,       // 2x armor
        ACCURACY: 1.5     // 50% more accurate
    },

    // Special enemy type modifiers
    ENEMY_TYPE_MODIFIERS: {
        FAST: {
            HEALTH: 0.7,    // -30% health
            DAMAGE: 0.8,    // -20% damage
            SPEED: 2.0,     // 2x speed
            ARMOR: 0.6,     // -40% armor
            ACCURACY: 1.1   // +10% accuracy
        },
        HEAVY: {
            HEALTH: 2.5,    // 2.5x health
            DAMAGE: 1.5,    // +50% damage
            SPEED: 0.7,     // -30% speed
            ARMOR: 2.0,     // 2x armor
            ACCURACY: 0.9   // -10% accuracy
        },
        ELITE: {
            HEALTH: 2.0,    // 2x health
            DAMAGE: 2.0,    // 2x damage
            SPEED: 1.3,     // +30% speed
            ARMOR: 1.5,     // +50% armor
            ACCURACY: 1.2   // +20% accuracy
        }
    },

    // Calculate total enemy stats based on level and type
    calculateEnemyStats: function(baseStats, level, enemyType = 'normal') {
        // Start with base stats
        let stats = { ...baseStats };
        
        // Apply base multipliers
        Object.keys(this.BASE_MULTIPLIERS).forEach(stat => {
            if (stats[stat.toLowerCase()]) {
                stats[stat.toLowerCase()] *= this.BASE_MULTIPLIERS[stat];
            }
        });
        
        // Apply level scaling
        Object.keys(this.LEVEL_SCALING).forEach(stat => {
            const baseStat = stat.split('_PER_LEVEL')[0].toLowerCase();
            if (stats[baseStat]) {
                stats[baseStat] *= (1 + this.LEVEL_SCALING[stat] * level);
            }
        });
        
        // Apply enemy type modifiers if not normal
        if (enemyType !== 'normal' && this.ENEMY_TYPE_MODIFIERS[enemyType.toUpperCase()]) {
            const typeModifiers = this.ENEMY_TYPE_MODIFIERS[enemyType.toUpperCase()];
            Object.keys(typeModifiers).forEach(stat => {
                if (stats[stat.toLowerCase()]) {
                    stats[stat.toLowerCase()] *= typeModifiers[stat];
                }
            });
        }
        
        // Round all stats to prevent floating point issues
        Object.keys(stats).forEach(stat => {
            stats[stat] = Math.round(stats[stat] * 100) / 100;
        });
        
        return stats;
    },

    // Calculate boss stats based on level
    calculateBossStats: function(baseStats, level) {
        // First calculate normal enemy stats for this level
        let stats = this.calculateEnemyStats(baseStats, level);
        
        // Then apply boss multipliers
        Object.keys(this.BOSS_MULTIPLIERS).forEach(stat => {
            if (stats[stat.toLowerCase()]) {
                stats[stat.toLowerCase()] *= this.BOSS_MULTIPLIERS[stat];
            }
        });
        
        // Round all stats
        Object.keys(stats).forEach(stat => {
            stats[stat] = Math.round(stats[stat] * 100) / 100;
        });
        
        return stats;
    }
};

// Example usage:
/*
const baseEnemyStats = {
    health: 100,
    damage: 10,
    speed: 5,
    armor: 5,
    accuracy: 0.8
};

// Get level 5 normal enemy stats
const level5Enemy = ENEMY_POWER_CONFIG.calculateEnemyStats(baseEnemyStats, 5);

// Get level 5 elite enemy stats
const level5Elite = ENEMY_POWER_CONFIG.calculateEnemyStats(baseEnemyStats, 5, 'elite');

// Get level 5 boss stats
const level5Boss = ENEMY_POWER_CONFIG.calculateBossStats(baseEnemyStats, 5);
*/ 