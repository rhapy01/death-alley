// Enemy Power Configuration

export const ENEMY_POWER = {
    // Double all base stats
    BASE_MULTIPLIER: 2.0,
    
    // Increase level scaling
    LEVEL_SCALING: {
        HEALTH: 0.15,     // 15% health increase per level (up from 10%)
        DAMAGE: 0.15,     // 15% damage increase per level (up from 10%)
        SPEED: 0.08,      // 8% speed increase per level (up from 5%)
    },
    
    // Boss multipliers (relative to normal enemies)
    BOSS_MULTIPLIER: 3.0,
    
    // Calculate enemy stats for a given level
    calculateStats: function(baseStats, level) {
        return {
            health: Math.round(baseStats.health * this.BASE_MULTIPLIER * (1 + this.LEVEL_SCALING.HEALTH * level)),
            damage: Math.round(baseStats.damage * this.BASE_MULTIPLIER * (1 + this.LEVEL_SCALING.DAMAGE * level)),
            speed: Math.round(baseStats.speed * this.BASE_MULTIPLIER * (1 + this.LEVEL_SCALING.SPEED * level))
        };
    },
    
    // Calculate boss stats for a given level
    calculateBossStats: function(baseStats, level) {
        const normalStats = this.calculateStats(baseStats, level);
        return {
            health: Math.round(normalStats.health * this.BOSS_MULTIPLIER),
            damage: Math.round(normalStats.damage * this.BOSS_MULTIPLIER),
            speed: Math.round(normalStats.speed * 1.5) // Bosses are 50% faster
        };
    }
}; 