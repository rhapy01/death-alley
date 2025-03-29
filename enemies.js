import { createTank } from './tank.js';
import { createProjectile } from './combat.js';
import { LEVEL_LENGTH, ALLEY_WIDTH, CHECKPOINT_POSITIONS } from './environment.js';

// Match the constants from tank.js
const LANE_CENTERS = [-15, 0, 15];
const LANE_WIDTH = 8;
const HALF_TANK_WIDTH = 1.5;

export function spawnEnemies(scene, enemies, tank, level = 1, gameMode = 'normal', difficultyMultiplier = 1) {
    // Scale difficulty based on level while maintaining constant enemy count
    const difficultySettings = {
        1: { total: 23, normalEnemies: 20, bosses: 3, megaBossCount: 3, hasMegaBoss: true, bossHealth: 400 },
        2: { total: 23, normalEnemies: 20, bosses: 3, megaBossCount: 3, hasMegaBoss: true, bossHealth: 600 },
        3: { total: 23, normalEnemies: 20, bosses: 3, megaBossCount: 3, hasMegaBoss: true, bossHealth: 800 }
    };
    
    // Adjust settings based on game mode
    let levelSettings = { ...difficultySettings[level] } || { ...difficultySettings[1] };
    
    // Apply difficulty multiplier to boss health
    if (levelSettings.hasMegaBoss) {
        levelSettings.bossHealth = Math.floor(levelSettings.bossHealth * difficultyMultiplier);
    }
    
    // Time Trial mode has strategic enemy placement but not required for progression
    if (gameMode === 'time_trial') {
        // Keep 80% of enemies for challenge but make them optional
        levelSettings.normalEnemies = Math.floor(levelSettings.normalEnemies * 0.8);
        levelSettings.bosses = Math.floor(levelSettings.bosses * 0.8);
        levelSettings.hasMegaBoss = false; // No mega bosses in time trial
        levelSettings.total = levelSettings.normalEnemies + levelSettings.bosses;
        
        console.log(`Time Trial Mode Level ${level}: Spawning ${levelSettings.total} optional enemies for strategic elimination`);
    }
    // Survival mode uses wave-based spawning with constant enemy count
    else if (gameMode === 'survival') {
        // Maintain constant enemy count but increase difficulty
        levelSettings.total = 20; // Fixed number of enemies
        levelSettings.hasBoss = (level % 3 === 0); // Boss every 3rd wave
        levelSettings.bossHealth = level * 200; // Boss health scales with wave number
        
        console.log(`Survival Mode Wave ${level}: Spawning ${levelSettings.total} enemies with increased difficulty, boss: ${levelSettings.hasBoss}`);
        
        // Define spawn zones within the alley
        const spawnZones = [
            { minRadius: 20, maxRadius: 40, count: Math.ceil(levelSettings.total * 0.3) },   // Close zone
            { minRadius: 40, maxRadius: 60, count: Math.ceil(levelSettings.total * 0.4) },   // Mid zone
            { minRadius: 60, maxRadius: 80, count: Math.ceil(levelSettings.total * 0.3) }    // Far zone
        ];
        
        let enemiesSpawned = 0;
        const usedPositions = [];
        
        // Spawn enemies in each zone
        for (const zone of spawnZones) {
            const enemiesInZone = zone.count;
            
            for (let i = 0; i < enemiesInZone; i++) {
                // Calculate spawn position within the alley
                    const angle = Math.random() * Math.PI * 2;
                    const radius = zone.minRadius + Math.random() * (zone.maxRadius - zone.minRadius);
                    
                let xPos = tank.position.x + Math.cos(angle) * radius;
                let zPos = tank.position.z + Math.sin(angle) * radius;
                
                // Ensure spawn position is within alley boundaries
                const halfAlleyWidth = ALLEY_WIDTH / 2;
                xPos = Math.max(-halfAlleyWidth + 2, Math.min(halfAlleyWidth - 2, xPos));
                
                // Create enemy with enhanced attributes
                const enemy = createEnemy(scene, enemies, false, zPos, xPos, level, difficultyMultiplier);
                
                if (enemy) {
                    enemiesSpawned++;
                    usedPositions.push({ x: xPos, z: zPos });
                    
                    // Enhanced survival mode attributes
                    enemy.health *= 1.2; // 20% more health
                    enemy.speed *= 1.3;  // 30% faster
                    enemy.chaseRange = 100 + (level * 10); // Increased chase range with level
                    enemy.shootInterval *= 0.8; // 20% faster shooting
                }
            }
        }
        
        // Spawn boss if needed
    if (levelSettings.hasBoss) {
            const bossAngle = Math.random() * Math.PI * 2;
            const bossRadius = 50; // Fixed boss spawn distance
            
            let bossXPos = tank.position.x + Math.cos(bossAngle) * bossRadius;
            let bossZPos = tank.position.z + Math.sin(bossAngle) * bossRadius;
        
            // Ensure boss spawns within alley
            bossXPos = Math.max(-halfAlleyWidth + 5, Math.min(halfAlleyWidth - 5, bossXPos));
            
            const boss = createEnemy(scene, enemies, true, bossZPos, bossXPos, level, difficultyMultiplier);
            if (boss) {
                enemiesSpawned++;
                boss.health = levelSettings.bossHealth;
                boss.speed *= 1.2;
                boss.chaseRange = 150;
                boss.shootInterval *= 0.7;
            }
        }
        
        return enemiesSpawned;
    }
    // Normal mode uses default values
    
    console.log(`Spawning enemies for level ${level} in ${gameMode} mode: ${levelSettings.total} enemies, boss: ${levelSettings.hasBoss}`);
    
    // Clear any existing enemies if there are any
    if (enemies.length > 0) {
        console.log(`Clearing ${enemies.length} existing enemies before spawning new ones`);
        enemies.forEach(enemy => {
            if (enemy) {
                // Properly dispose of materials and geometries
                enemy.traverse(child => {
                    if (child.isMesh) {
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(material => material.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                    }
                });
                
                // Remove from scene
                if (enemy.parent) {
                    scene.remove(enemy);
                }
                
                // Clear any special effects
                if (enemy.userData.shield) {
                    enemy.userData.shield.material.dispose();
                    enemy.userData.shield.geometry.dispose();
                }
                if (enemy.userData.fireAura) {
                    enemy.userData.fireAura.material.dispose();
                    enemy.userData.fireAura.geometry.dispose();
                }
            }
        });
        enemies.length = 0;
    }
    
    // Force a garbage collection hint
    if (window.gc) window.gc();
    
    // In Time Trial mode, position enemies strategically near checkpoints and difficult sections
    if (gameMode === 'time_trial') {
        // Spawn enemies near checkpoints and along the racing path
        for (let i = 0; i < levelSettings.total; i++) {
            // Position some enemies near checkpoints and others along the path
            let position;
            if (i < CHECKPOINT_POSITIONS.length) {
                // Place enemy near checkpoint with slight offset
                const checkpointZ = CHECKPOINT_POSITIONS[i];
                position = {
                    x: (Math.random() * ALLEY_WIDTH * 1.5) - (ALLEY_WIDTH * 0.75), // Random x position within 75% of alley width
                    z: checkpointZ + (Math.random() * 20 - 10) // Slight z offset from checkpoint
                };
            } else {
                // Place remaining enemies along the racing path
                position = {
                    x: (Math.random() * ALLEY_WIDTH * 2) - ALLEY_WIDTH,
                    z: -(Math.random() * LEVEL_LENGTH)
                };
            }
            createEnemy(scene, enemies, false, position.z, position.x, level, difficultyMultiplier);
        }
    }
    // Normal mode enemy spawning
    else {
        for (let i = 0; i < levelSettings.total; i++) {
            const xPos = (Math.random() * ALLEY_WIDTH * 2) - ALLEY_WIDTH;
            const zPos = -(Math.random() * LEVEL_LENGTH);
            createEnemy(scene, enemies, false, zPos, xPos, level, difficultyMultiplier);
        }
        
        // Spawn boss if needed
        if (levelSettings.hasBoss) {
            const bossX = 0;
            const bossZ = -(LEVEL_LENGTH * 0.8);
            const boss = createEnemy(scene, enemies, true, bossZ, bossX, level, difficultyMultiplier);
            if (boss) {
                boss.health = levelSettings.bossHealth;
            }
        }
    }
    
    // Spawn Mega Bosses at gate if needed
    if (levelSettings.hasMegaBoss) {
        // Gate is at the end of the 1000m alley, Mega Bosses 1m before it
        const gatePosition = -999; // This puts them 1m from the 1000m end
        const megaBossPositions = [
            { x: -ALLEY_WIDTH/4, z: gatePosition }, // Left Mega Boss
            { x: 0, z: gatePosition },              // Center Mega Boss
            { x: ALLEY_WIDTH/4, z: gatePosition }   // Right Mega Boss
        ];

        // Spawn all three Mega Bosses
        megaBossPositions.forEach((pos, index) => {
            const megaBoss = createEnemy(scene, enemies, 'megaboss', pos.z, pos.x, level, difficultyMultiplier);
            if (megaBoss) {
                // Increased power for Mega Bosses
                megaBoss.health = levelSettings.bossHealth * 4.0; // Even more health
                megaBoss.scale.set(1.5, 1.5, 1.5); // Maintain reduced size
                megaBoss.speed = 0.75; // Reduced speed by 50% (from 1.5)
                
                // Apply enhanced visual appearance with more enticing colors
                megaBoss.traverse(child => {
                    if (child.isMesh) {
                        if (child.name === 'wheel') {
                            child.material = new THREE.MeshPhongMaterial({
                                color: 0xff00ff, // Bright magenta
                                emissive: 0xff00ff,
                                emissiveIntensity: 1.0, // Maximum glow
                                shininess: 150,
                                metalness: 1.0
                            });
                        } else {
                            // Create a gradient-like effect with different parts
                            const isMainBody = child === megaBoss.body;
                            child.material = new THREE.MeshPhongMaterial({
                                color: isMainBody ? 0x000000 : 0x4B0082, // Black body, Indigo details
                                emissive: isMainBody ? 0x4B0082 : 0x8A2BE2, // Indigo/BlueViolet glow
                                emissiveIntensity: isMainBody ? 0.9 : 0.8,
                                shininess: 200,
                                metalness: 1.0,
                                specular: 0xffffff
                            });
                        }
                    }
                });
                
                // Enhanced Mega Boss specific properties
                megaBoss.isMegaBoss = true;
                megaBoss.fixedPosition = true;
                megaBoss.shootInterval = 300; // Even faster shooting (0.3 seconds)
                megaBoss.currentBehavior = 'fixed';
                megaBoss.megaBossIndex = index;
                megaBoss.originalPosition = { x: pos.x, z: pos.z };
                megaBoss.projectileDamage = 4.0; // Increased damage
            }
        });
    }
    
    return enemies.length;
}

export function createEnemy(scene, enemies, isBoss, zPos, xPos, level = 1, difficultyMultiplier = 1) {
    const enemy = createTank(scene);
    enemy.position.x = xPos;
    enemy.position.z = zPos;
    
    // Enhanced scale system for different tank types
    const normalScale = 1.2; // Slightly larger normal tanks
    const bossScale = level === 3 ? 2.5 : 2.0; // Bigger regular bosses
    const megaBossScale = 4.0; // Mega bosses are 4x normal size
    
    if (isBoss === 'megaboss') {
        enemy.scale.set(megaBossScale, megaBossScale, megaBossScale);
    } else {
        enemy.scale.set(
            isBoss ? bossScale : normalScale,
            isBoss ? bossScale : normalScale,
            isBoss ? bossScale : normalScale
        );
    }
    
    // Enhanced color schemes for different tank types
    const normalTankColors = {
        body: {
            primary: [
                0x00ff88, // Neon Turquoise
                0xff3366, // Hot Pink
                0x4422ff, // Electric Blue
                0xffcc00, // Golden Yellow
                0x00ffff  // Cyan
            ],
            secondary: [
                0x003366, // Deep Blue
                0x660033, // Deep Red
                0x006633, // Forest Green
                0x333399, // Royal Blue
                0x993366  // Burgundy
            ]
        },
        details: {
            primary: [
                0xffff00, // Yellow
                0xff00ff, // Magenta
                0x00ffff, // Cyan
                0xff3366, // Pink
                0x33ff33  // Lime
            ]
        }
    };

    const bossColors = {
        1: {
            primary: 0xff0033,    // Bright Red
            secondary: 0x990000,  // Dark Red
            details: 0xffcc00     // Gold
        },
        2: {
            primary: 0x00ffff,    // Cyan
            secondary: 0x0066cc,  // Deep Blue
            details: 0xff00ff     // Magenta
        },
        3: {
            primary: 0xff6600,    // Orange
            secondary: 0xcc3300,  // Dark Orange
            details: 0xffff00     // Yellow
        }
    };

    const megaBossColors = {
        body: {
            primary: 0x000000,    // Pure Black
            secondary: 0x4B0082,  // Indigo
            glow: 0x8A2BE2       // BlueViolet
        },
        wheels: {
            primary: 0xff00ff,    // Bright Magenta
            glow: 0xff66ff       // Light Magenta
        },
        details: {
            primary: 0x9400D3,    // Dark Violet
            glow: 0x800080       // Purple
        }
    };

    // Apply enhanced materials based on tank type
    if (isBoss === 'megaboss') {
    enemy.traverse(child => {
            if (child.isMesh) {
                if (child.name === 'wheel') {
            child.material = new THREE.MeshPhongMaterial({ 
                        color: megaBossColors.wheels.primary,
                        emissive: megaBossColors.wheels.glow,
                        emissiveIntensity: 1.0,
                        shininess: 200,
                        metalness: 1.0,
                        specular: 0xffffff
                    });
                } else if (child === enemy.body) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: megaBossColors.body.primary,
                        emissive: megaBossColors.body.glow,
                        emissiveIntensity: 0.9,
                        shininess: 300,
                        metalness: 1.0,
                        specular: 0xffffff
                    });
                } else {
                    child.material = new THREE.MeshPhongMaterial({
                        color: megaBossColors.details.primary,
                        emissive: megaBossColors.details.glow,
                        emissiveIntensity: 0.8,
                        shininess: 250,
                        metalness: 1.0,
                        specular: 0xffffff
                    });
                }
            }
        });
    } else if (isBoss) {
        const bossColor = bossColors[level] || bossColors[1];
        enemy.traverse(child => {
            if (child.isMesh) {
                if (child === enemy.body) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: bossColor.primary,
                        emissive: bossColor.secondary,
                        emissiveIntensity: 0.7,
                        shininess: 150,
                        metalness: 0.8,
                        specular: 0xffffff
                    });
                } else {
                    child.material = new THREE.MeshPhongMaterial({
                        color: bossColor.details,
                        emissive: bossColor.primary,
                        emissiveIntensity: 0.5,
                        shininess: 120,
                        metalness: 0.6,
                        specular: 0xffffff
                    });
                }
            }
        });
    } else {
        // Normal tanks get random but coordinated color schemes
        const primaryIndex = Math.floor(Math.random() * normalTankColors.body.primary.length);
        const primaryColor = normalTankColors.body.primary[primaryIndex];
        const secondaryColor = normalTankColors.body.secondary[primaryIndex];
        const detailColor = normalTankColors.details.primary[primaryIndex];

        enemy.traverse(child => {
            if (child.isMesh) {
                if (child === enemy.body) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: primaryColor,
                        emissive: secondaryColor,
                        emissiveIntensity: 0.4,
                        shininess: 100,
                        metalness: 0.5,
        specular: 0xffffff
    });
                } else {
                    child.material = new THREE.MeshPhongMaterial({
                        color: detailColor,
                        emissive: primaryColor,
                        emissiveIntensity: 0.3,
                        shininess: 80,
                        metalness: 0.4,
                        specular: 0xffffff
                    });
                }
            }
        });
    }
    
    // Balanced health scaling based on level and difficulty multiplier
    const baseHealth = isBoss ? 400 : 100;
    const healthMultiplier = (1 + (level - 1) * 0.5) * difficultyMultiplier;
    enemy.health = Math.floor(baseHealth * healthMultiplier * 2); // Double the final health
    
    // Balanced speed scaling based on level and difficulty
    const baseSpeed = isBoss ? 0.2 : 0.3; // Reduced base speed by 50%
    const speedMultiplier = (1 + (level - 1) * 0.2) * Math.sqrt(difficultyMultiplier); // Square root for more balanced speed scaling
    enemy.speed = baseSpeed * speedMultiplier; // Removed the *2 multiplier to reduce speed
    
    // Ensure speed doesn't exceed reasonable limits
    const maxSpeed = isBoss ? 0.5 : 0.6; // Reduced max speed by 50%
    enemy.speed = Math.min(enemy.speed, maxSpeed);
    
    enemy.lastShot = 0;
    
    // Balanced shooting interval scaling with difficulty
    const baseShootInterval = isBoss ? 1000 : 1500; // Faster base shooting
    const shootIntervalMultiplier = (1 - (level - 1) * 0.15) / Math.sqrt(difficultyMultiplier);
    enemy.shootInterval = Math.max(300, Math.floor(baseShootInterval * shootIntervalMultiplier)); // Faster minimum interval
    
    // Double damage for all enemies
    enemy.projectileDamage = isBoss ? 2.0 : 1.0; // Base damage doubled
    
    // Balanced chase range scaling with difficulty
    const baseChaseRange = 50;
    const chaseRangeMultiplier = (1 + (level - 1) * 0.3) * Math.sqrt(difficultyMultiplier);
    enemy.chaseRange = Math.floor(baseChaseRange * chaseRangeMultiplier);
    enemy.chaseRange = Math.min(enemy.chaseRange, 100); // Cap chase range
    
    // Update behavior probabilities based on difficulty
    const difficultyFactor = Math.min(1, (difficultyMultiplier - 1) * 0.5); // Caps at 100% increase
    
    // Update the behavior initialization section with balanced behavior scaling
    if (isBoss) {
        // Bosses have different behavior probabilities based on level and difficulty
        const r = Math.random();
        if (level === 3) {
            // Level 3 bosses are more aggressive but still balanced
            if (r < (0.4 + difficultyFactor * 0.2)) {
            enemy.currentBehavior = 'charge';
            } else if (r < (0.6 + difficultyFactor * 0.2)) {
            enemy.currentBehavior = 'circle';
            } else if (r < (0.8 + difficultyFactor * 0.1)) {
            enemy.currentBehavior = 'strafe';
        } else {
            enemy.currentBehavior = 'retreat';
        }
        } else if (level === 2) {
            // Level 2 bosses are more tactical
            if (r < (0.3 + difficultyFactor * 0.2)) {
                enemy.currentBehavior = 'charge';
            } else if (r < (0.5 + difficultyFactor * 0.2)) {
                enemy.currentBehavior = 'circle';
            } else if (r < (0.7 + difficultyFactor * 0.1)) {
                enemy.currentBehavior = 'strafe';
    } else {
                enemy.currentBehavior = 'retreat';
            }
        } else {
            // Level 1 bosses have balanced behavior
            if (r < (0.25 + difficultyFactor * 0.15)) {
                enemy.currentBehavior = 'charge';
            } else if (r < (0.45 + difficultyFactor * 0.15)) {
                enemy.currentBehavior = 'circle';
            } else if (r < (0.65 + difficultyFactor * 0.1)) {
                enemy.currentBehavior = 'strafe';
            } else {
                enemy.currentBehavior = 'retreat';
            }
        }
    } else {
        // Regular enemies - balanced behavior based on level and difficulty
        const behaviors = ['approach', 'circle', 'strafe', 'retreat'];
        const chargeChance = level === 3 ? 0.4 : level === 2 ? 0.3 : 0.2;
        const scaledChargeChance = chargeChance + difficultyFactor * 0.2;
        
        enemy.currentBehavior = Math.random() < scaledChargeChance ? 
            'charge' : behaviors[Math.floor(Math.random() * behaviors.length)];
    }
    
    // Set initial behavior parameters with balanced scaling
    switch (enemy.currentBehavior) {
        case 'circle':
            enemy.circleRadius = 10 + Math.random() * 5;
            enemy.circleSpeed = (0.01 + Math.random() * 0.02) * (1 + (level - 1) * 0.1) * Math.sqrt(difficultyMultiplier);
            enemy.circleOffset = Math.random() * Math.PI * 2;
            break;
        case 'strafe':
            enemy.strafeDir = Math.random() > 0.5 ? 1 : -1;
            enemy.strafeDuration = (1000 + Math.random() * 2000) * (1 - (level - 1) * 0.05) / Math.sqrt(difficultyMultiplier);
            enemy.strafeEndTime = Date.now() + enemy.strafeDuration;
            break;
        case 'charge':
            enemy.chargeSpeed = isBoss ? enemy.speed * 1.5 : enemy.speed * 1.3; // Reduced charge speed multipliers
            enemy.chargeDuration = (1500 + Math.random() * 1000) * (1 - (level - 1) * 0.05) / Math.sqrt(difficultyMultiplier);
            enemy.chargeEndTime = Date.now() + enemy.chargeDuration;
            break;
        case 'retreat':
            enemy.retreatDuration = (1000 + Math.random() * 1500) * (1 - (level - 1) * 0.05) / Math.sqrt(difficultyMultiplier);
            enemy.retreatEndTime = Date.now() + enemy.retreatDuration;
            break;
    }
    
    // Set behavior change timing based on difficulty
    enemy.behaviorChangeTime = Date.now() + (1000 + Math.random() * 2000) * (1 - (level - 1) * 0.05) / Math.sqrt(difficultyMultiplier);
    
    // Base parameters for any behavior
    enemy.direction = Math.random() < 0.5 ? 1 : -1;
    enemy.patternTimer = 0;
    enemy.userData.box = new THREE.Box3().setFromObject(enemy);
    enemy.userData.level = level;
    enemy.userData.difficultyMultiplier = difficultyMultiplier;
    
    // Store original color for effects based on tank type
    if (isBoss === 'megaboss') {
        enemy.userData.originalColor = megaBossColors.body.primary;
    } else if (isBoss) {
        const bossColor = bossColors[level] || bossColors[1];
        enemy.userData.originalColor = bossColor.primary;
    } else {
        const primaryIndex = Math.floor(Math.random() * normalTankColors.body.primary.length);
        enemy.userData.originalColor = normalTankColors.body.primary[primaryIndex];
    }
    
    enemies.push(enemy);
    return enemy;
}

export function updateEnemies(enemies, tank, scene, delta, projectiles) {
    // Skip update if game is restarting or paused
    if (window.isGameRestarting || window.isGamePaused) return;
    
    const now = Date.now();
    
    // Check if projectiles was passed or undefined, and ensure it's defined for enemy shots
    if (!projectiles && window.projectiles) {
        projectiles = window.projectiles;
    }
    
    // Process each enemy
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Skip if enemy doesn't exist
        if (!enemy) {
            enemies.splice(i, 1);
            continue;
        }
        
        // If enemy health is zero or less, remove it efficiently
        if (enemy.health <= 0) {
            // Dispose of resources
            enemy.traverse(child => {
                if (child.isMesh) {
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                }
            });
            
            // Clear special effects
            if (enemy.userData.shield) {
                enemy.userData.shield.material.dispose();
                enemy.userData.shield.geometry.dispose();
            }
            if (enemy.userData.fireAura) {
                enemy.userData.fireAura.material.dispose();
                enemy.userData.fireAura.geometry.dispose();
            }
            
            scene.remove(enemy);
            enemies.splice(i, 1);
            continue;
        }
        
        // Basic distance check
        const distance = enemy.position.distanceTo(tank.position);
        
        // Check if enemy is in visible range
        const distanceToPlayer = tank.position.distanceTo(enemy.position);
        const isVisibleToPlayer = distanceToPlayer < 80;
        
        // Skip updates for off-screen enemies unless they're bosses
        const isBoss = enemy.scale.x > 1.2;
        
        if (!isVisibleToPlayer && !isBoss) {
            // Only update position for distant enemies to save performance
            if (Math.random() < 0.1) { // 10% chance per frame to move closer
                enemy.position.z += (tank.position.z - enemy.position.z) > 0 ? enemy.speed : -enemy.speed;
            }
            continue;
        }
        
        // Check for behavior change time
        if (now > enemy.behaviorChangeTime) {
            changeBehavior(enemy, tank);
        }
        
        // Handle special boss abilities from survival mode
        if (isBoss) {
            // Check for special attack if boss has one
            if (enemy.userData.specialAttack && now - enemy.userData.lastSpecialAttack > enemy.userData.specialAttackCooldown) {
                // Execute special attack
                switch (enemy.userData.specialAttack) {
                    case 'teleport':
                        performTeleport(enemy, tank, scene);
                        break;
                    case 'multishot':
                        performMultishot(enemy, tank, scene, projectiles);
                        break;
                }
                enemy.userData.lastSpecialAttack = now;
            }
            
            // Create shield pulsing effect if boss has shield
            if (enemy.userData.shield) {
                enemy.userData.shield.material.opacity = 0.3 + Math.sin(now / 200) * 0.1;
                enemy.userData.shield.material.emissiveIntensity = 0.5 + Math.sin(now / 300) * 0.2;
                
                // Scale shield with time
                const scale = 0.9 + Math.sin(now / 500) * 0.1;
                enemy.userData.shield.scale.set(scale, scale, scale);
            }
            
            // Create fire aura pulsing effect if boss has fire aura
            if (enemy.userData.fireAura) {
                enemy.userData.fireAura.material.opacity = 0.6 + Math.sin(now / 200) * 0.2;
                enemy.userData.fireAura.material.emissiveIntensity = 0.7 + Math.sin(now / 150) * 0.3;
                
                // Scale fire aura with time
                const scale = 0.9 + Math.sin(now / 300) * 0.2;
                enemy.userData.fireAura.scale.set(scale, scale, scale);
            }
        }
        
        // Special handling for Mega Boss
        if (enemy.isMegaBoss) {
            if (enemy.currentBehavior === 'fixed') {
                // Only rotate to face the player
                const dirToPlayer = new THREE.Vector3().subVectors(tank.position, enemy.position).normalize();
                enemy.rotation.y = Math.atan2(dirToPlayer.x, dirToPlayer.z);
                
                // Strictly maintain position 1m from gate
                enemy.position.x = enemy.originalPosition.x;
                enemy.position.z = -999; // Ensure exactly 1m from end
                
                // Enhanced shooting pattern for Mega Boss
                if (now - enemy.lastShot > enemy.shootInterval) {
                    const dirToPlayer = new THREE.Vector3().subVectors(tank.position, enemy.position).normalize();
                    
                    // Main shot
                    const shotOrigin = enemy.position.clone().add(new THREE.Vector3(0, 1.5, 0));
                    const mainProjectile = createProjectile(scene, shotOrigin, dirToPlayer, true);
                    mainProjectile.damage = enemy.projectileDamage; // Apply enhanced damage
                    
                    // Enhanced spread pattern based on Mega Boss position
                    const spreadAngles = enemy.megaBossIndex === 1 ? 
                        [-Math.PI/6, -Math.PI/12, Math.PI/12, Math.PI/6] : // Center boss has 5 shots
                        [-Math.PI/6, Math.PI/6]; // Side bosses have 3 shots
                    
                    spreadAngles.forEach(angle => {
                        const spreadDir = dirToPlayer.clone();
                        const rotMatrix = new THREE.Matrix4().makeRotationY(angle);
                        spreadDir.applyMatrix4(rotMatrix);
                        
                        const sideProjectile = createProjectile(scene, shotOrigin, spreadDir, true);
                        sideProjectile.damage = enemy.projectileDamage; // Apply enhanced damage
                        
                        if (Array.isArray(projectiles)) {
                            projectiles.push(sideProjectile);
                        } else if (Array.isArray(window.projectiles)) {
                            window.projectiles.push(sideProjectile);
                        }
                    });
                    
                    if (Array.isArray(projectiles)) {
                        projectiles.push(mainProjectile);
                    } else if (Array.isArray(window.projectiles)) {
                        window.projectiles.push(mainProjectile);
                    }
                    
                    enemy.lastShot = now;
                }
                continue; // Skip regular enemy behavior
            }
        }
        
        // Execute enemy behavior
        switch (enemy.currentBehavior) {
            case 'approach':
                // Move directly toward the player
                const approachDir = new THREE.Vector3().subVectors(tank.position, enemy.position).normalize();
                const newApproachPos = enemy.position.clone().add(approachDir.multiplyScalar(enemy.speed));
                enemy.position.copy(ensureWithinBoundaries(newApproachPos));
                // Rotate to face the direction of movement
                enemy.rotation.y = Math.atan2(approachDir.x, approachDir.z);
                break;
            
            case 'circle':
                // Move in a circle around the player
                const angle = now * enemy.circleSpeed + enemy.circleOffset;
                const circleX = Math.cos(angle) * enemy.circleRadius;
                const circleZ = Math.sin(angle) * enemy.circleRadius;
                
                // Get target position in world space, relative to player
                const targetCirclePos = new THREE.Vector3(
                    tank.position.x + circleX,
                    enemy.position.y,
                    tank.position.z + circleZ
                );
                
                // Move toward the circle position
                const circleDir = new THREE.Vector3().subVectors(targetCirclePos, enemy.position).normalize();
                const newCirclePos = enemy.position.clone().add(circleDir.multiplyScalar(enemy.speed));
                enemy.position.copy(ensureWithinBoundaries(newCirclePos));
                
                // Rotate to face the player, not the circle path
                const faceDir = new THREE.Vector3().subVectors(tank.position, enemy.position).normalize();
                enemy.rotation.y = Math.atan2(faceDir.x, faceDir.z);
                break;
            
            case 'strafe':
                // Check if strafing time is over
                if (now > enemy.strafeEndTime) {
                    changeBehavior(enemy, tank);
                    break;
                }
                
                // Get direction to player
                const strafeToPlayer = new THREE.Vector3().subVectors(tank.position, enemy.position).normalize();
                // Get perpendicular direction for strafing (cross with up vector)
                const strafePerp = new THREE.Vector3().crossVectors(strafeToPlayer, new THREE.Vector3(0, 1, 0)).normalize();
                strafePerp.multiplyScalar(enemy.strafeDir); // Apply strafe direction (left or right)
                
                // Combine a bit of forward movement with sideways movement
                const combinedStrafeDir = new THREE.Vector3()
                    .addVectors(strafeToPlayer.multiplyScalar(0.3), strafePerp.multiplyScalar(0.7))
                .normalize();
            
                const newStrafePos = enemy.position.clone().add(combinedStrafeDir.multiplyScalar(enemy.speed));
                enemy.position.copy(ensureWithinBoundaries(newStrafePos));
                // Face the player while strafing
                enemy.rotation.y = Math.atan2(strafeToPlayer.x, strafeToPlayer.z);
                break;
            
            case 'charge':
                // Check if charge time is over
                if (now > enemy.chargeEndTime) {
                    changeBehavior(enemy, tank);
                    break;
                }
                
                // Directly charge at the player's position with increased speed
                const chargeDir = new THREE.Vector3().subVectors(tank.position, enemy.position).normalize();
                const newChargePos = enemy.position.clone().add(chargeDir.multiplyScalar(enemy.chargeSpeed));
                enemy.position.copy(ensureWithinBoundaries(newChargePos));
                enemy.rotation.y = Math.atan2(chargeDir.x, chargeDir.z);
                break;
            
            case 'retreat':
                // Check if retreat time is over
                if (now > enemy.retreatEndTime) {
                    changeBehavior(enemy, tank);
                    break;
                }
                
                // Move away from the player
                const retreatDir = new THREE.Vector3().subVectors(enemy.position, tank.position).normalize();
                const newRetreatPos = enemy.position.clone().add(retreatDir.multiplyScalar(enemy.speed * 0.7));
                enemy.position.copy(ensureWithinBoundaries(newRetreatPos));
                // Still face the player while retreating
                enemy.rotation.y = Math.atan2(-retreatDir.x, -retreatDir.z);
                break;
            
            default:
                // Default to approach behavior if none is set
                const defaultDir = new THREE.Vector3().subVectors(tank.position, enemy.position).normalize();
                const newDefaultPos = enemy.position.clone().add(defaultDir.multiplyScalar(enemy.speed));
                enemy.position.copy(ensureWithinBoundaries(newDefaultPos));
                enemy.rotation.y = Math.atan2(defaultDir.x, defaultDir.z);
        }
        
        // Firing logic
        if (now - enemy.lastShot > enemy.shootInterval && distance < enemy.chaseRange) {
            // Get orientation to player
            const dirToPlayer = new THREE.Vector3();
            dirToPlayer.subVectors(tank.position, enemy.position).normalize();
            
            // Set turret rotation to face the player
            const targetRotation = Math.atan2(dirToPlayer.x, dirToPlayer.z);
            enemy.turret.rotation.y = targetRotation;
            
            // Determine if clear line of sight for shooting
            const raycaster = new THREE.Raycaster();
            raycaster.set(
                enemy.position.clone().add(new THREE.Vector3(0, 1, 0)),
                dirToPlayer
            );
            
            // Only shoot if player is in front of the enemy
            const angleToPlayer = Math.abs(targetRotation - enemy.rotation.y);
            const hasLineOfSight = angleToPlayer < Math.PI / 2 || angleToPlayer > Math.PI * 1.5;
            
            if (hasLineOfSight) {
                // Determine shot origin position
                const barrelTip = new THREE.Vector3(0, 0.5, -2).applyQuaternion(enemy.turret.quaternion);
                const shotOrigin = enemy.position.clone().add(new THREE.Vector3(0, 1.0, 0)).add(barrelTip);
                
                // Create projectile - log for debugging
                console.log("Enemy firing projectile", {
                    position: shotOrigin.toArray(),
                    direction: dirToPlayer.toArray(),
                    isEnemy: true
                });
                
                // Create projectile and ensure it's added to the global/window projectiles array
                const projectile = createProjectile(scene, shotOrigin, dirToPlayer, true);
                
                // Make sure we have a valid projectiles array - try both passed parameter and global
                if (Array.isArray(projectiles)) {
                    projectiles.push(projectile);
                } else if (Array.isArray(window.projectiles)) {
                    window.projectiles.push(projectile);
                }
                
                // Special handling for boss multishot in survival high waves
                if (isBoss && enemy.userData.level >= 3 && Math.random() < 0.3) {
                    // Create additional projectiles at angles
                    const angles = [Math.PI/8, -Math.PI/8, Math.PI/16, -Math.PI/16];
                    
                    // Only use 2 additional shots for regular boss, 4 for higher waves
                    const additionalShots = enemy.userData.wave >= 10 ? 4 : 2;
                    
                    for (let j = 0; j < additionalShots; j++) {
                        const angle = angles[j];
                        const spreadDir = new THREE.Vector3(dirToPlayer.x, dirToPlayer.y, dirToPlayer.z);
                        
                        // Rotate direction around Y axis
                        const rotMatrix = new THREE.Matrix4().makeRotationY(angle);
                        spreadDir.applyMatrix4(rotMatrix);
                        
                        const spreadProjectile = createProjectile(scene, shotOrigin, spreadDir, true);
                        
                        // Make sure we have a valid projectiles array - try both passed parameter and global
                        if (Array.isArray(projectiles)) {
                            projectiles.push(spreadProjectile);
                        } else if (Array.isArray(window.projectiles)) {
                            window.projectiles.push(spreadProjectile);
                        }
                    }
                }
                
                enemy.lastShot = now;
            }
        }
        
        // Updated box for collision
        enemy.userData.box.setFromObject(enemy);
    }
}

// Helper function to create teleport visual effect
function createTeleportEffect(scene, startPos, endPos) {
    // Create particles from start to end position
    const particleCount = 50;
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.8,
        transparent: true,
        opacity: 0.8
    });
    
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const t = i / particleCount;
        positions[i * 3] = startPos.x + (endPos.x - startPos.x) * t;
        positions[i * 3 + 1] = 1 + Math.random() * 2; // Slight height variation
        positions[i * 3 + 2] = startPos.z + (endPos.z - startPos.z) * t;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Remove particles after animation
    setTimeout(() => {
        scene.remove(particles);
    }, 1000);
}

// Add these new functions for the survival mode boss abilities
function performTeleport(boss, tank, scene) {
    // Store original position for effect
    const originalPos = boss.position.clone();
    
    // Calculate new position: behind player or to the side
    const behindPlayer = Math.random() < 0.6; // 60% chance to teleport behind
    
    let newPos;
    if (behindPlayer) {
        // Get position behind player (opposite to player's facing direction)
        const playerDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(tank.quaternion);
        newPos = tank.position.clone().add(playerDirection.multiplyScalar(20));
        
        // Add some randomness
        newPos.x += (Math.random() - 0.5) * 10;
    } else {
        // Get position to the side of player
        const side = Math.random() < 0.5 ? 1 : -1;
        const playerRight = new THREE.Vector3(1, 0, 0).applyQuaternion(tank.quaternion);
        newPos = tank.position.clone().add(playerRight.multiplyScalar(side * 15)); // Reduced from 25 to avoid walls
        
        // Add some forward/backward randomness
        const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(tank.quaternion);
        newPos.add(playerForward.multiplyScalar((Math.random() - 0.5) * 10));
    }
    
    // Ensure minimum height
    newPos.y = 1.0;
    
    // Ensure the boss stays within the alley boundaries
    newPos = ensureWithinBoundaries(newPos);
    
    // Create teleport effect
    createTeleportEffect(scene, originalPos, newPos);
    
    // Update boss position
    boss.position.copy(newPos);
    
    // Make boss face the player
    const dirToPlayer = new THREE.Vector3().subVectors(tank.position, boss.position).normalize();
    boss.rotation.y = Math.atan2(dirToPlayer.x, dirToPlayer.z);
    
    return newPos;
}

function performMultishot(boss, tank, scene, projectiles) {
    // Make sure we have access to a projectiles array
    if (!projectiles && window.projectiles) {
        projectiles = window.projectiles;
    }
    
    // Get direction to player
    const dirToPlayer = new THREE.Vector3().subVectors(tank.position, boss.position).normalize();
    
    // Set turret rotation
    const targetRotation = Math.atan2(dirToPlayer.x, dirToPlayer.z);
    boss.turret.rotation.y = targetRotation;
    
    // Determine boss wave level (for scaling difficulty)
    const wave = boss.userData.wave || 3;
    
    // Determine how many projectiles based on wave
    let numProjectiles = 8;
    if (wave >= 15) numProjectiles = 16;
    else if (wave >= 10) numProjectiles = 12;
    
    // Spread projectiles in a circular pattern
    for (let i = 0; i < numProjectiles; i++) {
        const angle = (i / numProjectiles) * Math.PI * 2;
        
        // Create direction based on angle
        const direction = new THREE.Vector3(
            Math.sin(angle), 
            0, 
            Math.cos(angle)
        );
        
        // Determine shot origin
        const barrelTip = new THREE.Vector3(0, 0.5, -2).applyQuaternion(boss.turret.quaternion);
        const shotOrigin = boss.position.clone().add(new THREE.Vector3(0, 1.0, 0)).add(barrelTip);
        
        // Create projectile
        const projectile = createProjectile(scene, shotOrigin, direction, true);
        
        // Make sure we have a valid projectiles array - try both passed parameter and global
        if (Array.isArray(projectiles)) {
            projectiles.push(projectile);
        } else if (Array.isArray(window.projectiles)) {
            window.projectiles.push(projectile);
        }
    }
    
    // Create visual effect - energy explosion
    const explosionGeometry = new THREE.SphereGeometry(1, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff, 
        transparent: true,
        opacity: 0.8
    });
    
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(boss.position);
    explosion.position.y += 1;
    scene.add(explosion);
    
    // Animate explosion
    const expandAnimation = () => {
        explosion.scale.multiplyScalar(1.2);
        explosion.material.opacity *= 0.9;
        
        if (explosion.material.opacity > 0.05) {
            requestAnimationFrame(expandAnimation);
        } else {
            scene.remove(explosion);
        }
    };
    
    expandAnimation();
}

// Add this function to fix the ReferenceError
function changeBehavior(enemy, tank) {
    // Set the next behavior change time (between 2-5 seconds)
    enemy.behaviorChangeTime = Date.now() + 2000 + Math.random() * 3000;
    
    // Get difficulty values from enemy's userData
    const level = enemy.userData.level || 1;
    const difficultyMultiplier = enemy.userData.difficultyMultiplier || 1;
    const isBoss = enemy.scale.x > 1.2;
    
    // Define a random behavior pattern based on enemy type and position
    const behaviors = isBoss ? 
        ['circle', 'charge', 'strafe', 'retreat'] : 
        ['approach', 'circle', 'strafe', 'retreat'];
    
    // For bosses, weight the behaviors differently
    let newBehavior;
    if (isBoss) {
        // Bosses are more likely to charge the player
        const r = Math.random();
        if (r < 0.4) {
            newBehavior = 'charge';
        } else if (r < 0.6) {
            newBehavior = 'circle';
        } else if (r < 0.8) {
            newBehavior = 'strafe';
        } else {
            newBehavior = 'retreat';
        }
    } else {
        // Regular enemies have equal chance for each behavior
        newBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
    }
    
    // Store the chosen behavior
    enemy.currentBehavior = newBehavior;
    
    // Set behavior-specific parameters
    switch (newBehavior) {
        case 'approach':
            // Move directly toward the player
            enemy.circleRadius = 0;
            enemy.circleSpeed = 0;
            enemy.circleOffset = 0;
            break;
            
        case 'circle':
            // Circle around the player
            enemy.circleRadius = 10 + Math.random() * 5;
            enemy.circleSpeed = (0.01 + Math.random() * 0.02) * (1 + (level - 1) * 0.1) * Math.sqrt(difficultyMultiplier);
            enemy.circleOffset = Math.random() * Math.PI * 2;
            break;
            
        case 'strafe':
            // Move sideways relative to the player
            enemy.strafeDir = Math.random() > 0.5 ? 1 : -1;
            enemy.strafeDuration = (1000 + Math.random() * 2000) * (1 - (level - 1) * 0.05) / Math.sqrt(difficultyMultiplier);
            enemy.strafeEndTime = Date.now() + enemy.strafeDuration;
            break;
            
        case 'charge':
            // Charge directly at the player (bosses only)
            enemy.chargeSpeed = isBoss ? enemy.speed * 1.5 : enemy.speed * 1.3;
            enemy.chargeDuration = (1500 + Math.random() * 1000) * (1 - (level - 1) * 0.05) / Math.sqrt(difficultyMultiplier);
            enemy.chargeEndTime = Date.now() + enemy.chargeDuration;
            break;
            
        case 'retreat':
            // Move away from the player temporarily
            enemy.retreatDuration = (1000 + Math.random() * 1500) * (1 - (level - 1) * 0.05) / Math.sqrt(difficultyMultiplier);
            enemy.retreatEndTime = Date.now() + enemy.retreatDuration;
            break;
    }
    
    // If this is a boss in survival mode and has special abilities, maybe activate one
    if (isBoss && enemy.userData.specialAttack && Math.random() < 0.3) { // 30% chance on behavior change
        // Reset the cooldown timer to allow special attack on next check
        enemy.userData.lastSpecialAttack = Date.now() - enemy.userData.specialAttackCooldown;
    }
}

// Add this helper function before updateEnemies
function ensureWithinBoundaries(position) {
    // Always keep enemies within alley boundaries
    const halfAlleyWidth = ALLEY_WIDTH / 2;
    const wallOffset = 1;
    
    if (position.x > halfAlleyWidth - wallOffset) {
        position.x = halfAlleyWidth - wallOffset;
    } else if (position.x < -halfAlleyWidth + wallOffset) {
        position.x = -halfAlleyWidth + wallOffset;
    }
    
    return position;
}