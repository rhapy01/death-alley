export function createProjectile(scene, startPos, direction, isEnemy, attackBoost = 1) {
    // Ensure direction is a THREE.Vector3
    const dirVector = direction instanceof THREE.Vector3 ? direction.clone() : new THREE.Vector3(direction.x || 0, direction.y || 0, direction.z || 0);
    
    // Debug log with safe access
    console.log('Creating projectile:', { 
        isEnemy, 
        startPos: startPos instanceof THREE.Vector3 ? startPos : 'Invalid position',
        direction: dirVector 
    });
    
    // Create a new direction vector and normalize it
    const projectileDirection = dirVector.normalize();
    
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    const material = new THREE.MeshPhongMaterial({ 
        color: isEnemy ? 0xff6600 : 0x00ff00,
        emissive: isEnemy ? 0xff6600 : 0x00ff00,
        emissiveIntensity: 0.5
    });
    const projectile = new THREE.Mesh(geometry, material);
    projectile.position.copy(startPos);
    
    // Store userData for consistent handling
    projectile.userData = {
        direction: projectileDirection,
        isEnemy: isEnemy,
        damage: isEnemy ? 10 : 15 * attackBoost,
        lifetime: 0 // Track lifetime for expiration
    };
    
    // Create a larger collision box for better hit detection
    const boxSize = new THREE.Vector3(0.6, 0.6, 0.6);
    projectile.userData.box = new THREE.Box3().setFromCenterAndSize(projectile.position, boxSize);
    
    scene.add(projectile);
    
    // Return the projectile instead of pushing it to an array
    return projectile;
}

export function updateCombat(projectiles, enemies, scene, tank, updateStats, displayMessage) {
    if (!tank || !projectiles || !enemies) return;
    
    const tankBox = new THREE.Box3().setFromObject(tank);
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        if (!proj) continue;
        
        // Update projectile box
        proj.userData.box = new THREE.Box3().setFromObject(proj);
        
        // Check for enemy hits (player projectiles hitting enemies)
        if (!proj.userData.isEnemy) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (!enemy) continue;
                
                const enemyBox = new THREE.Box3().setFromObject(enemy);
                
                if (proj.userData.box.intersectsBox(enemyBox)) {
                    // Enemy hit logic
                    const damage = proj.userData.damage || 15;
                    enemy.health -= damage;
                    
                    if (enemy.health <= 0) {
                        // Enemy destroyed
                        scene.remove(enemy);
                        enemies.splice(j, 1);
                        
                        // Update score (5 points for regular, 25 for bosses)
                        const scoreValue = enemy.scale.x > 1 ? 25 : 5;
                        
                        // Update stats with score and enemy defeat
                        updateStats(0, scoreValue);
                        
                        // Dispatch enemy defeated event
                        window.dispatchEvent(new CustomEvent('enemyDefeated', {
                            detail: {
                                isBoss: enemy.scale.x > 1,
                                points: scoreValue
                            }
                        }));
                    }
                    
                    // Remove projectile
                    scene.remove(proj);
                    projectiles.splice(i, 1);
                    break;
                }
            }
        } else {
            // Check for player hit (enemy projectiles hitting player)
            if (proj.userData.box.intersectsBox(tankBox)) {
                // Player hit logic
                const damage = proj.userData.damage || 10;
                updateStats(damage, 0);
                
                // Remove projectile
                scene.remove(proj);
                projectiles.splice(i, 1);
            }
        }
    }
}

// Handle collision between projectile and tank
function handleTankHit(projectile, tank, updateStats, displayMessage) {
    // Calculate damage based on projectile type and any active buffs
    let damage = 10; // Base damage
    
    // Apply damage reduction from power-ups if any
    if (tank.userData.damageReduction) {
        damage *= (1 - tank.userData.damageReduction);
    }
    
    // Update stats with damage taken
    updateStats(damage, 0);
    
    // Remove the projectile
    projectile.parent.remove(projectile);
    
    // Visual feedback
    if (tank.material) {
        tank.material.color.setHex(0xff0000);
        setTimeout(() => {
            tank.material.color.setHex(0x00ff00);
        }, 100);
    }
}