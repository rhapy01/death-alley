// Randomized Obstacle Gauntlet for Time Trial mode
import { ALLEY_WIDTH, LEVEL_LENGTH } from './environment.js';
import { recordObstacleCollision, recordBoostRamp } from './replay.js';

const obstacles = [];
const OBSTACLE_TYPES = {
    BARRIER: 'barrier',      // Static barrier that blocks part of the lane
    MOVING_WALL: 'moving',   // Wall that moves side to side
    GATE: 'gate',            // Narrow passage to drive through
    RAMP: 'ramp',            // Ramp that launches the tank when driven over
    SPINNER: 'spinner'       // Rotating obstacle that requires timing to pass
};

// Spawn a randomized set of obstacles for the current level
export function spawnObstacles(scene, level, gameMode) {
    // Allow obstacles in both Normal and Time Trial modes
    // Clear any existing obstacles
    clearObstacles(scene);
    
    // Determine number of obstacles based on level and mode
    let baseCount, levelMultiplier;
    
    if (gameMode === 'time_trial') {
        // Time Trial mode has more obstacles for additional challenge
        baseCount = 5;
        levelMultiplier = level;
    } else {
        // Normal mode has fewer obstacles to allow focus on combat
        baseCount = 3;
        levelMultiplier = level;
    }
    
    const count = baseCount * levelMultiplier;
    
    console.log(`Spawning ${count} obstacles for level ${level} in ${gameMode} mode`);
    
    // Create obstacle patterns based on level difficulty
    for (let i = 0; i < count; i++) {
        // Calculate position - spread obstacles throughout the level
        // Avoid placing obstacles at the very beginning or end of the level
        const segmentLength = (LEVEL_LENGTH - 200) / count;
        const zPosition = -100 - (i * segmentLength) - (Math.random() * (segmentLength * 0.6));
        
        // Select random obstacle type with weighted probability
        const obstacleType = selectRandomObstacleType(level, gameMode);
        
        // Generate specific obstacle based on type
        const obstacle = createObstacle(scene, obstacleType, zPosition, level);
        if (obstacle) {
            obstacles.push(obstacle);
        }
    }
    
    return obstacles;
}

// Select a random obstacle type with weighted probability based on level and game mode
function selectRandomObstacleType(level, gameMode) {
    let weights;
    
    if (gameMode === 'time_trial') {
        // Time Trial mode has more difficult obstacles
        weights = {
            [OBSTACLE_TYPES.BARRIER]: 5 - Math.min(3, level-1),     // More common in early levels
            [OBSTACLE_TYPES.MOVING_WALL]: Math.min(5, level),       // More common in later levels
            [OBSTACLE_TYPES.GATE]: 3,                               // Consistent difficulty
            [OBSTACLE_TYPES.RAMP]: Math.min(4, level),              // Increases with level
            [OBSTACLE_TYPES.SPINNER]: Math.min(4, level)            // Increases with level
        };
    } else {
        // Normal mode has more forgiving obstacle distribution
        weights = {
            [OBSTACLE_TYPES.BARRIER]: 5,                           // More static barriers
            [OBSTACLE_TYPES.MOVING_WALL]: Math.max(1, level - 1),  // Fewer moving walls until higher levels
            [OBSTACLE_TYPES.GATE]: 3,                              // Consistent gates
            [OBSTACLE_TYPES.RAMP]: Math.min(5, level + 1),         // More boost ramps to help with combat
            [OBSTACLE_TYPES.SPINNER]: Math.min(2, level - 1)       // Fewer spinners until higher levels
        };
    }
    
    // Calculate total weight
    let totalWeight = 0;
    for (const type in weights) {
        totalWeight += weights[type];
    }
    
    // Random selection based on weights
    let random = Math.random() * totalWeight;
    for (const type in weights) {
        if (random < weights[type]) {
            return type;
        }
        random -= weights[type];
    }
    
    // Default fallback
    return OBSTACLE_TYPES.BARRIER;
}

// Create a specific obstacle based on type and position
function createObstacle(scene, type, zPosition, level) {
    // Random x position within the alley
    // Avoid edges to prevent getting stuck
    const laneWidth = ALLEY_WIDTH / 3;
    const lanes = [-laneWidth, 0, laneWidth];
    const xOffset = (Math.random() - 0.5) * 5; // Small randomization within lane
    const xPosition = lanes[Math.floor(Math.random() * lanes.length)] + xOffset;
    
    // Create the obstacle based on type
    let obstacle;
    
    switch (type) {
        case OBSTACLE_TYPES.BARRIER:
            obstacle = createBarrier(scene, xPosition, zPosition, level);
            break;
            
        case OBSTACLE_TYPES.MOVING_WALL:
            obstacle = createMovingWall(scene, xPosition, zPosition, level);
            break;
            
        case OBSTACLE_TYPES.GATE:
            obstacle = createGate(scene, xPosition, zPosition, level);
            break;
            
        case OBSTACLE_TYPES.RAMP:
            obstacle = createRamp(scene, xPosition, zPosition, level);
            break;
            
        case OBSTACLE_TYPES.SPINNER:
            obstacle = createSpinner(scene, xPosition, zPosition, level);
            break;
            
        default:
            console.warn(`Unknown obstacle type: ${type}`);
            return null;
    }
    
    if (obstacle) {
        obstacle.userData.type = type;
        obstacle.userData.isObstacle = true;
        obstacle.userData.level = level;
        
        // Create and initialize the bounding box
        obstacle.userData.box = new THREE.Box3();
        obstacle.userData.box.setFromObject(obstacle);
        
        scene.add(obstacle);
    }
    
    return obstacle;
}

// Create a static barrier obstacle
function createBarrier(scene, xPosition, zPosition, level) {
    const group = new THREE.Group();
    
    // Randomize barrier size based on level
    const width = 4 + Math.random() * (level * 0.5);
    const height = 2 + Math.random() * level;
    
    // Create barrier geometry
    const geometry = new THREE.BoxGeometry(width, height, 2);
    const material = new THREE.MeshPhongMaterial({
        color: 0xff3300,
        emissive: 0x441100,
        emissiveIntensity: 0.3,
        specular: 0x111111
    });
    
    const barrier = new THREE.Mesh(geometry, material);
    
    // Add warning stripes
    const stripeGeometry = new THREE.PlaneGeometry(width, height);
    const stripeTexture = createStripeTexture();
    const stripeMaterial = new THREE.MeshBasicMaterial({
        map: stripeTexture,
        transparent: true,
        opacity: 0.7
    });
    
    const stripes = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripes.position.z = 1.1;
    
    // Position the barrier
    group.position.set(xPosition, height/2, zPosition);
    group.add(barrier);
    group.add(stripes);
    
    // Add collision handlers
    group.userData.onCollision = (tank) => {
        // Reduce tank velocity significantly
        tank.userData.velocity *= 0.3;
        
        // Play collision sound
        playCollisionSound();
    };
    
    return group;
}

// Create a moving wall obstacle
function createMovingWall(scene, xPosition, zPosition, level) {
    const group = new THREE.Group();
    
    // Create wall geometry
    const width = 3 + (level * 0.5);
    const height = 3 + (level * 0.3);
    const geometry = new THREE.BoxGeometry(width, height, 1.5);
    
    // Create glowing material for moving walls
    const material = new THREE.MeshPhongMaterial({
        color: 0x00aaff,
        emissive: 0x0033aa,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    
    const wall = new THREE.Mesh(geometry, material);
    group.add(wall);
    
    // Position the wall
    group.position.set(xPosition, height/2, zPosition);
    
    // Add movement pattern data
    group.userData.moveData = {
        centerX: xPosition,
        moveSpeed: 0.05 + (level * 0.02),
        moveRange: 10 + (level * 2),
        moveDirection: 1,
        movePhase: Math.random() * Math.PI * 2 // Random starting phase
    };
    
    // Add collision handler
    group.userData.onCollision = (tank) => {
        // Significant impact on velocity
        tank.userData.velocity *= 0.2;
        
        // Add push effect in the direction the wall was moving
        const pushDirection = group.userData.moveData.moveDirection;
        tank.position.x += pushDirection * 0.5;
        
        // Play collision sound
        playCollisionSound();
    };
    
    // Add update function
    group.userData.update = (delta) => {
        // Sinusoidal movement pattern
        const moveData = group.userData.moveData;
        moveData.movePhase += moveData.moveSpeed;
        
        const newX = moveData.centerX + Math.sin(moveData.movePhase) * moveData.moveRange;
        group.position.x = newX;
        
        // Determine movement direction for collision physics
        moveData.moveDirection = Math.cos(moveData.movePhase) > 0 ? 1 : -1;
        
        // Update collision box
        if (group.userData.box) {
            group.userData.box.setFromObject(group);
        }
    };
    
    return group;
}

// Create a narrow gate to pass through
function createGate(scene, xPosition, zPosition, level) {
    const group = new THREE.Group();
    
    // Narrow gate width based on level
    const gateWidth = 8 - (level * 0.6);
    const wallWidth = (ALLEY_WIDTH - gateWidth) / 2;
    const height = 4;
    
    // Create left and right gate parts
    const wallGeometry = new THREE.BoxGeometry(wallWidth, height, 2);
    const wallMaterial = new THREE.MeshPhongMaterial({
        color: 0xffaa00,
        emissive: 0x663300,
        emissiveIntensity: 0.3
    });
    
    // Left wall
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.x = -(ALLEY_WIDTH/4 + gateWidth/4);
    group.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.x = (ALLEY_WIDTH/4 + gateWidth/4);
    group.add(rightWall);
    
    // Add top bar connecting the walls
    const topBarGeometry = new THREE.BoxGeometry(ALLEY_WIDTH, 0.5, 2);
    const topBar = new THREE.Mesh(topBarGeometry, wallMaterial);
    topBar.position.y = height;
    group.add(topBar);
    
    // Position the gate - center it in the alley
    group.position.set(0, height/2, zPosition);
    
    // Add collision handler
    group.userData.onCollision = (tank) => {
        // Check if collision is with the walls, not the gate opening
        const tankWidth = 3.0; // Match HALF_TANK_WIDTH from tank.js
        
        // Calculate tank position relative to gate center
        const relativeX = tank.position.x - group.position.x;
        
        // Check if tank is outside the gate opening
        if (Math.abs(relativeX) > gateWidth/2 - tankWidth) {
            // Collision with wall - reduce velocity
            tank.userData.velocity *= 0.3;
            
            // Play collision sound
            playCollisionSound();
            
            return true;
        }
        
        // No collision with walls, just going through the gate
        return false;
    };
    
    return group;
}

// Create a ramp that launches the tank when driven over
function createRamp(scene, xPosition, zPosition, level) {
    const group = new THREE.Group();
    
    // Create ramp geometry
    const width = 6;
    const length = 8;
    const height = 2 + (level * 0.3);
    
    // Create a custom geometry for the ramp
    const rampGeometry = new THREE.BufferGeometry();
    
    // Define vertices for a ramp shape
    const vertices = new Float32Array([
        // front face (triangles)
        -width/2, 0, length/2,
        width/2, 0, length/2,
        width/2, height, -length/2,
        
        -width/2, 0, length/2,
        width/2, height, -length/2,
        -width/2, height, -length/2,
        
        // top face
        -width/2, height, -length/2,
        width/2, height, -length/2,
        width/2, 0, -length/2,
        
        -width/2, height, -length/2,
        width/2, 0, -length/2,
        -width/2, 0, -length/2,
        
        // left face
        -width/2, 0, length/2,
        -width/2, height, -length/2,
        -width/2, 0, -length/2,
        
        // right face
        width/2, 0, length/2,
        width/2, 0, -length/2,
        width/2, height, -length/2,
        
        // bottom face
        -width/2, 0, length/2,
        -width/2, 0, -length/2,
        width/2, 0, -length/2,
        
        -width/2, 0, length/2,
        width/2, 0, -length/2,
        width/2, 0, length/2
    ]);
    
    // Compute normals automatically
    rampGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    rampGeometry.computeVertexNormals();
    
    // Create material with direction indication
    const rampMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x006600,
        emissiveIntensity: 0.3,
        shininess: 60
    });
    
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    group.add(ramp);
    
    // Add arrow indicator on top of ramp
    const arrowGeometry = new THREE.ConeGeometry(1, 2, 8);
    const arrowMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0x666600,
        emissiveIntensity: 0.5
    });
    
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, height + 1, -length/4);
    group.add(arrow);
    
    // Position the ramp
    group.position.set(xPosition, 0, zPosition);
    
    // Add special interaction for ramp
    group.userData.onCollision = (tank) => {
        // Check if tank is on the ramp (vs. hitting the side)
        const tankPos = tank.position.clone();
        const rampPos = group.position.clone();
        const diffZ = Math.abs(tankPos.z - rampPos.z);
        
        // If z is close enough and x is within ramp width
        if (diffZ < length/2 && Math.abs(tankPos.x - rampPos.x) < width/2) {
            // Calculate boost based on current speed and direction
            const currentSpeed = tank.userData.velocity;
            
            // Only apply boost if moving forward up the ramp
            if (currentSpeed > 0.3) {
                // Apply speed boost
                tank.userData.velocity *= 1.3;
                
                // Play boost sound effect
                playBoostSound();
                
                // Visual effect - could be implemented with particles
                
                return true;
            }
        }
        
        // No special effect
        return false;
    };
    
    return group;
}

// Create a spinning obstacle that requires timing to pass
function createSpinner(scene, xPosition, zPosition, level) {
    const group = new THREE.Group();
    
    // Create center pillar
    const pillarGeometry = new THREE.CylinderGeometry(1, 1, 4, 8);
    const pillarMaterial = new THREE.MeshPhongMaterial({
        color: 0x666666,
        metalness: 0.7,
        roughness: 0.3
    });
    
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.y = 2;
    group.add(pillar);
    
    // Create spinning arms
    const armCount = 2 + level;
    const armLength = 12 + (level * 0.5);
    const armHeight = 1.5;
    const armWidth = 1.0;
    
    // Create a group for the spinning parts
    const spinnerGroup = new THREE.Group();
    group.add(spinnerGroup);
    
    for (let i = 0; i < armCount; i++) {
        const angle = (i / armCount) * Math.PI * 2;
        
        const armGeometry = new THREE.BoxGeometry(armLength, armHeight, armWidth);
        const armMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0x330000,
            emissiveIntensity: 0.3
        });
        
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        
        // Position arm to rotate around center
        arm.position.x = armLength / 2;
        arm.position.y = 2; // Same height as pillar center
        
        // Create container to rotate arm around center
        const armContainer = new THREE.Group();
        armContainer.rotation.y = angle;
        armContainer.add(arm);
        
        spinnerGroup.add(armContainer);
    }
    
    // Position the spinner
    group.position.set(xPosition, 0, zPosition);
    
    // Add rotation data
    group.userData.spinData = {
        speed: 0.01 + (level * 0.003),
        direction: Math.random() < 0.5 ? 1 : -1
    };
    
    // Add collision handler
    group.userData.onCollision = (tank) => {
        // Significant impact on velocity
        tank.userData.velocity *= 0.2;
        
        // Add push effect away from center
        const dirToCenter = new THREE.Vector3().subVectors(
            group.position,
            tank.position
        ).normalize();
        
        // Push tank away
        tank.position.x -= dirToCenter.x * 0.5;
        tank.position.z -= dirToCenter.z * 0.5;
        
        // Play collision sound
        playCollisionSound();
        
        return true;
    };
    
    // Add update function
    group.userData.update = (delta) => {
        // Rotate spinner
        spinnerGroup.rotation.y += group.userData.spinData.speed * 
                                  group.userData.spinData.direction;
        
        // Update collision box - use a specialized approach for spinners
        // since their collision shape changes as they rotate
        if (group.userData.box) {
            group.userData.box.setFromObject(group);
        }
    };
    
    return group;
}

// Create warning stripe texture
function createStripeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw black and yellow diagonal stripes
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffff00';
    const stripeWidth = 16;
    for (let i = -canvas.height; i < canvas.width * 2; i += stripeWidth * 2) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + canvas.height, canvas.height);
        ctx.lineTo(i + canvas.height + stripeWidth, canvas.height);
        ctx.lineTo(i + stripeWidth, 0);
        ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    return texture;
}

// Update all obstacles
export function updateObstacles(delta) {
    obstacles.forEach(obstacle => {
        if (obstacle.userData && obstacle.userData.update) {
            obstacle.userData.update(delta);
        }
    });
}

// Clear all obstacles from the scene
export function clearObstacles(scene) {
    if (!scene) return;
    
    obstacles.forEach(obstacle => {
        if (obstacle && scene) {
            scene.remove(obstacle);
        }
    });
    obstacles.length = 0;
}

// Check tank collision with obstacles
export function checkObstacleCollisions(tank, scene, enemies) {
    if (!tank || !tank.userData || !tank.userData.box || obstacles.length === 0) return false;
    
    // Debug flag for logging collisions (set to true to debug)
    const DEBUG_COLLISIONS = false;
    
    for (const obstacle of obstacles) {
        if (obstacle && obstacle.userData && obstacle.userData.box) {
            // Skip anything that should not be considered for collision
            if (obstacle.userData.isCheckpointPart || 
                obstacle.userData.passable || 
                obstacle.userData.isTrigger ||
                obstacle.userData.noCollision ||
                obstacle.userData.isCheckpointTrigger ||
                obstacle.userData.isCheckpoint ||
                (obstacle.userData.isObstacle === false)) {
                
                if (DEBUG_COLLISIONS) {
                    console.log("Skipping collision check for non-collidable object:", 
                        obstacle.userData.type || "unknown type");
                }
                continue;
            }
            
            // Update the obstacle's bounding box before checking collision
            obstacle.userData.box.setFromObject(obstacle);
            
            if (obstacle.userData.box.intersectsBox(tank.userData.box)) {
                // Skip collision if this is a checkpoint or its trigger volume
                if (obstacle.userData.isCheckpointPart || 
                    obstacle.userData.isCheckpointTrigger || 
                    obstacle.userData.isCheckpoint) {
                    continue;
                }
                
                if (DEBUG_COLLISIONS) {
                    console.log("Collision detected with:", obstacle.userData.type || "unknown type");
                }
                
                if (obstacle.userData.onCollision) {
                    const result = obstacle.userData.onCollision(tank);
                    
                    // Record collision or boost ramp for replay analysis
                    if (obstacle.userData.type === OBSTACLE_TYPES.RAMP && result === true) {
                        // Record boost ramp use
                        recordBoostRamp(tank, window.projectiles || [], enemies, 
                            obstacle.userData.level, 'time_trial');
                    } else if (obstacle.userData.type !== OBSTACLE_TYPES.RAMP || result !== true) {
                        // Record obstacle collision - only if it wasn't a successful ramp boost
                        recordObstacleCollision(tank, window.projectiles || [], enemies, 
                            obstacle.userData.level, 'time_trial');
                    }
                }
                return true;
            }
        }
    }
    
    return false;
}

// Play collision sound effect
function playCollisionSound() {
    // Implement sound playing logic here
    // This could be connected to an audio system later
    console.log('Collision sound effect');
}

// Play boost sound effect
function playBoostSound() {
    // Implement sound playing logic here
    console.log('Boost sound effect');
}

// Export a function to mark an object as a non-obstacle for checkpoint purposes
export function markAsCheckpoint(object) {
    if (!object) return;
    
    // Mark the object and all its children as checkpoint parts
    object.traverse(child => {
        if (child.userData) {
            child.userData.isCheckpointPart = true;
            child.userData.passable = true;
            child.userData.isObstacle = false;
            child.userData.noCollision = true;
            
            // If the child has a material, make it non-solid
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (!mat.transparent) {
                            mat.transparent = true;
                            mat.opacity = 0.7;
                        }
                    });
                } else if (!child.material.transparent) {
                    child.material.transparent = true;
                    child.material.opacity = 0.7;
                }
            }
        }
    });
    
    // IMPORTANT: Remove from obstacles array to prevent collision checks
    const index = obstacles.indexOf(object);
    if (index !== -1) {
        obstacles.splice(index, 1);
        console.log("Removed checkpoint from obstacles array");
    }
    
    // Also ensure the userData has the checkpoint flag
    if (object.userData) {
        object.userData.isCheckpoint = true;
        object.userData.passable = true;
        object.userData.noCollision = true;
    }
} 