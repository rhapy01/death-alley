// Export these constants so they can be used in other files
export const LEVEL_LENGTH = 1000; // 1000 meters per level
export const UTURN_INTERVAL = 50; // U-turn point every 50 meters
export const WALL_HEIGHT = 30; // Increased wall height
export const ALLEY_WIDTH = 40; // Width of alley
export const GAME_BOUNDARY = {
    LEFT: -160,  // Doubled from -80
    RIGHT: 160,  // Doubled from 80
    START: 40,
    END: -LEVEL_LENGTH - 40
}; // Game boundary limits

// Import obstacle utilities for checkpoint marking
import { markAsCheckpoint } from './obstacles.js';

// Checkpoints for Time Trial mode
export const CHECKPOINT_POSITIONS = [-750, -500, -250]; // Z-positions for checkpoints
export const CHECKPOINT_TIME_BONUS = 2000; // Milliseconds to subtract (2 seconds)

let tollgate;
let spawnedItems = []; // Track spawned items
let checkpoints = []; // Track checkpoints

// Define item types and their properties
const ITEM_TYPES = {
    SPEED: {
        color: 0xffff00, // Yellow for speed
        ribbonColor: 0xff9900,
        scale: 1.2,
        rotationSpeed: 0.02,
        effect: {
            type: 'speed',
            multiplier: 2.5,  // Base speed multiplier
            duration: 15000,  // Base duration (15 seconds)
            timeTrial: {
                multiplier: 4.0,  // Enhanced speed multiplier for Time Trial (increased from 3.5)
                duration: 45000   // Enhanced duration for Time Trial (increased from 30 seconds)
            }
        }
    },
    HEALTH: {
        color: 0xff0000, // Red for health
        ribbonColor: 0xff4444,
        scale: 1.2,
        rotationSpeed: 0.02,
        effect: {
            type: 'health',
            amount: 50
        }
    },
    ATTACK: {
        color: 0x00ff00, // Green for attack
        ribbonColor: 0x00aa00,
        scale: 1.2,
        rotationSpeed: 0.02,
        effect: {
            type: 'attack',
            multiplier: 2.0,
            duration: 15000
        }
    }
};

// Create multiple Eiffel Towers with billboards - placed on both sides of the alley
function createEiffelTowers(scene) {
    const towers = [];
    
    // Define positions for 7 towers total (4 on left, 3 on right)
    const towerPositions = [];
    
    // Left side positions (4 towers)
    for (let i = 0; i < 4; i++) {
        // Position towers at different intervals along the alley
        const zPos = -150 - (i * (LEVEL_LENGTH / 5));
        
        towerPositions.push({
            x: -ALLEY_WIDTH * 1.5,
            z: zPos,
            side: 'left'
        });
    }
    
    // Right side positions (3 towers)
    for (let i = 0; i < 3; i++) {
        // Position towers at different intervals along the alley
        // Offset them to create a staggered effect with the left towers
        const zPos = -250 - (i * (LEVEL_LENGTH / 4));
        
        towerPositions.push({
            x: ALLEY_WIDTH * 1.5,
            z: zPos,
            side: 'right'
        });
    }
    
    console.log(`Creating ${towerPositions.length} towers in total`);
    
    // Create all towers
    for (let i = 0; i < towerPositions.length; i++) {
        // Create a tower at each position
        const tower = createSingleTower(scene, towerPositions[i], i);
        towers.push(tower);
    }
    
    // Return all towers for animation
    return towers;
}

// Create a single Eiffel Tower with billboard at specified position
function createSingleTower(scene, position, index) {
    const towerGroup = new THREE.Group();
    
    // Base material for the tower structure
    const towerMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.8,
        roughness: 0.3
    });
    
    // Create smaller or larger towers based on index for variety
    const sizeVariation = 0.8 + (index % 3) * 0.2;
    
    // Base of the tower (four legs)
    const legHeight = 20 * sizeVariation;
    const baseWidth = 30 * sizeVariation;
    
    // Create the four legs
    for (let i = 0; i < 4; i++) {
        const x = Math.sin(i * Math.PI / 2) * (baseWidth / 2);
        const z = Math.cos(i * Math.PI / 2) * (baseWidth / 2);
        
        // Create a sloped leg
        const legGeometry = new THREE.CylinderGeometry(1 * sizeVariation, 2 * sizeVariation, legHeight, 6);
        const leg = new THREE.Mesh(legGeometry, towerMaterial);
        leg.position.set(x, legHeight / 2, z);
        
        // Tilt the leg toward the center
        const angle = Math.atan2(x, z);
        leg.rotation.x = Math.PI / 15; // Tilt inward
        leg.rotation.y = -angle;
        
        towerGroup.add(leg);
        
        // Add cross-beams between legs at bottom and top
        if (i < 3) {
            // Bottom cross beam
            const bottomBeamGeometry = new THREE.BoxGeometry(baseWidth * 0.7, 1 * sizeVariation, 1 * sizeVariation);
            const bottomBeam = new THREE.Mesh(bottomBeamGeometry, towerMaterial);
            bottomBeam.position.set(0, legHeight * 0.2, 0);
            bottomBeam.rotation.y = i * Math.PI / 2 + Math.PI / 4;
            towerGroup.add(bottomBeam);
            
            // Top cross beam
            const topBeamGeometry = new THREE.BoxGeometry(baseWidth * 0.5, 1 * sizeVariation, 1 * sizeVariation);
            const topBeam = new THREE.Mesh(topBeamGeometry, towerMaterial);
            topBeam.position.set(0, legHeight * 0.9, 0);
            topBeam.rotation.y = i * Math.PI / 2 + Math.PI / 4;
            towerGroup.add(topBeam);
        }
    }
    
    // Create billboard support platform
    const platformGeometry = new THREE.BoxGeometry(baseWidth * 0.4, 1 * sizeVariation, baseWidth * 0.4);
    const platform = new THREE.Mesh(platformGeometry, towerMaterial);
    platform.position.set(0, legHeight, 0);
    towerGroup.add(platform);
    
    // Create billboard at the top of the tower
    const billboardWidth = 20 * sizeVariation;
    const billboardHeight = 8 * sizeVariation;
    
    // Create the billboard canvas with sponsor text
    const billboardCanvas = document.createElement('canvas');
    billboardCanvas.width = 1024;
    billboardCanvas.height = 512;
    const ctx = billboardCanvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, billboardCanvas.width, billboardCanvas.height);
    
    // Create gradient border
    const borderGradient = ctx.createLinearGradient(0, 0, billboardCanvas.width, 0);
    borderGradient.addColorStop(0, '#4400ff');
    borderGradient.addColorStop(0.5, '#00ffff');
    borderGradient.addColorStop(1, '#4400ff');
    
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 20;
    ctx.strokeRect(25, 25, billboardCanvas.width - 50, billboardCanvas.height - 50);
    
    // Select a sponsor for this billboard
    const sponsors = [
        'BASEMENT.FUN',
        'ZORA.CO',
        'ROSEBUD.AI',
        'THIRDWEB',
        'FARCADEAI',
        'ATARI',
        'BASE'
    ];
    const sponsor = sponsors[index % sponsors.length];
    
    // Create scrolling text data
    const scrollText = `    ${sponsor}    ${sponsor}    `;
    
    // Add sponsor text
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Enhanced glowing effect
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw text with gradient
    const textGradient = ctx.createLinearGradient(0, 0, billboardCanvas.width, 0);
    textGradient.addColorStop(0, '#00ffff');
    textGradient.addColorStop(0.5, '#ffffff');
    textGradient.addColorStop(1, '#00ffff');
    
    ctx.fillStyle = textGradient;
    ctx.fillText(scrollText, 0, billboardCanvas.height/2);
    
    // Add secondary glow
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.strokeText(scrollText, 0, billboardCanvas.height/2);
    
    // Create the billboard texture
    const billboardTexture = new THREE.CanvasTexture(billboardCanvas);
    const billboardMaterial = new THREE.MeshBasicMaterial({
        map: billboardTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
    });
    
    const billboardGeometry = new THREE.PlaneGeometry(billboardWidth, billboardHeight);
    const billboard = new THREE.Mesh(billboardGeometry, billboardMaterial);
    billboard.position.set(0, legHeight + 2, 0); // Position just above the platform
    
    // Orient billboards to face the alley
    if (position.side === 'left') {
        billboard.rotation.y = Math.PI * 0.65;
    } else {
        billboard.rotation.y = Math.PI * 0.35;
    }
    
    // Create a second billboard facing the opposite direction
    const billboardBack = new THREE.Mesh(billboardGeometry, billboardMaterial);
    billboardBack.position.copy(billboard.position);
    billboardBack.rotation.y = billboard.rotation.y + Math.PI;
    
    // Group billboards together
    const billboardGroup = new THREE.Group();
    billboardGroup.add(billboard);
    billboardGroup.add(billboardBack);
    towerGroup.add(billboardGroup);
    
    // Add animation data to the billboard with scrolling text capability
    billboardGroup.userData = {
        rotationSpeed: 0.002 + (index % 4) * 0.0005, // Slightly different speed for each tower
        originalY: billboardGroup.position.y,
        hoverRange: 0.3 + (index % 3) * 0.1, // Different hover ranges
        hoverSpeed: 0.0008 + (index % 5) * 0.0002, // Different hover speeds
        scrollSpeed: 0.5 + (index % 3) * 0.2, // Different scroll speeds
        textCanvas: billboardCanvas,
        textContext: ctx,
        scrollText: scrollText,
        textPosition: 0,
        texture: billboardTexture,
        sponsor: sponsor
    };
    
    // Create a spotlight to illuminate the billboard - stronger lights
    const spotLight = new THREE.SpotLight(0xffffff, 2.5, 70, Math.PI / 6, 0.5, 1); // Increased intensity and distance
    spotLight.position.set(0, legHeight + 2, 0);
    spotLight.target = billboard;
    towerGroup.add(spotLight);
    
    // Add colored point light at the bottom of the tower - brighter
    const pointLightColors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0000, 0x00ff00, 0x0000ff];
    const pointLight = new THREE.PointLight(pointLightColors[index % pointLightColors.length], 1.5, 70); // Increased intensity and distance
    pointLight.position.set(0, 5, 0);
    towerGroup.add(pointLight);
    
    // Position the tower at the specified position
    towerGroup.position.set(position.x, 0, position.z);
    
    // Add to scene directly
    scene.add(towerGroup);
    
    // Return tower data for animation
    return { 
        tower: towerGroup, 
        billboard: billboardGroup, 
        spotLight: spotLight,
        pointLight: pointLight 
    };
}

// Create a gift box item
function createSpawnItem(type, position) {
    const itemProps = ITEM_TYPES[type];
    const group = new THREE.Group();
    
    // Create the main box - slightly larger
    const boxGeometry = new THREE.BoxGeometry(
        itemProps.scale * 2, // doubled width
        itemProps.scale * 2, // doubled height
        itemProps.scale * 2  // doubled depth
    );
    const boxMaterial = new THREE.MeshPhongMaterial({
        color: itemProps.color,
        emissive: itemProps.color,
        emissiveIntensity: 0.4, // Increased glow
        shininess: 50
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    
    // Create the ribbon cross on the box - adjusted for new size
    const ribbonGeometry = new THREE.BoxGeometry(
        itemProps.scale * 2.2, // slightly wider than box
        itemProps.scale * 0.2, // thin ribbon
        itemProps.scale * 0.2  // thin ribbon
    );
    const ribbonMaterial = new THREE.MeshPhongMaterial({
        color: itemProps.ribbonColor,
        emissive: itemProps.ribbonColor,
        emissiveIntensity: 0.5,
        shininess: 70
    });
    
    // Horizontal ribbon
    const ribbonH = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
    ribbonH.position.y = 0;
    
    // Vertical ribbon
    const ribbonV = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
    ribbonV.rotation.z = Math.PI / 2;
    ribbonV.position.y = 0;
    
    // Create the bow on top - adjusted for new size
    const bowGeometry = new THREE.TorusGeometry(
        itemProps.scale * 0.4,
        itemProps.scale * 0.1,
        8,
        16
    );
    const bow = new THREE.Mesh(bowGeometry, ribbonMaterial);
    bow.position.y = itemProps.scale;
    bow.position.z = -itemProps.scale;
    bow.rotation.x = Math.PI / 2;
    
    // Add glow effect on ground - made larger
    const glowGeometry = new THREE.CircleGeometry(itemProps.scale * 2, 32);
    const glowMaterial = new THREE.MeshPhongMaterial({
        color: itemProps.color,
        emissive: itemProps.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -itemProps.scale + 0.01;

    // Add everything to the group
    group.add(box);
    group.add(ribbonH);
    group.add(ribbonV);
    group.add(bow);
    group.add(glow);
    
    // Position the group
    group.position.copy(position);
    group.userData = {
        type: type,
        effect: itemProps.effect,
        rotationSpeed: itemProps.rotationSpeed
    };

    return group;
}

// Spawn items at random positions - reduced number of items for better performance
export function spawnRandomItems(scene, count = 3) { // Reduced from 5 to 3
    // Clear existing items
    spawnedItems.forEach(item => scene.remove(item));
    spawnedItems = [];

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * (ALLEY_WIDTH - 12);
        const z = -(Math.random() * (LEVEL_LENGTH - 100) + 50);
        const y = 1;

        const types = Object.keys(ITEM_TYPES);
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        const item = createSpawnItem(randomType, new THREE.Vector3(x, y, z));
        scene.add(item);
        spawnedItems.push(item);
        
        // Single spawn log instead of per-item logging
        if (i === 0) {
            console.log(`Spawned ${count} items`);
        }
    }
}

// Update spawn items (just rotation)
export function updateSpawnItems(scene, tank, gameMode = 'normal') {
    // Only spawn items if we have less than the maximum
    const maxItems = gameMode === 'time_trial' ? 12 : 3; // Increased max items in Time Trial mode
    
    if (spawnedItems.length >= maxItems) return;
    
    // Increased spawn chance in Time Trial mode
    const spawnChance = gameMode === 'time_trial' ? 0.08 : 0.005; // Increased to 8% chance per frame in Time Trial
    
    if (Math.random() < spawnChance) {
        // In Time Trial mode, only spawn speed power-ups
        let itemType;
        if (gameMode === 'time_trial') {
            itemType = 'SPEED';
            
            // Spawn power-ups in a wider area for Time Trial
            const minDistance = 15;  // Even closer to track
            const maxDistance = 50;  // Closer maximum distance
            
            // Create multiple spawn points in a circular pattern
            const numSpawns = 2; // Spawn 2 power-ups at once
            for (let i = 0; i < numSpawns; i++) {
                const angle = (Math.PI * 2 * i / numSpawns) + (Math.random() * Math.PI / 4); // Add some randomness
                const distance = minDistance + Math.random() * (maxDistance - minDistance);
                
                const position = new THREE.Vector3(
                    tank.position.x + Math.cos(angle) * distance,
                    1, // Height above ground
                    tank.position.z + Math.sin(angle) * distance
                );
                
                const item = createSpawnItem(itemType, position);
                if (item) {
                    scene.add(item);
                    spawnedItems.push(item);
                }
            }
        } else {
            // Normal mode: random selection of all types
            const types = Object.keys(ITEM_TYPES);
            itemType = types[Math.floor(Math.random() * types.length)];
            
            // Original spawn position calculation for normal mode
            const minDistance = 30;
            const maxDistance = 100;
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        const position = new THREE.Vector3(
            tank.position.x + Math.cos(angle) * distance,
                1,
            tank.position.z + Math.sin(angle) * distance
        );
        
        const item = createSpawnItem(itemType, position);
        if (item) {
            scene.add(item);
            spawnedItems.push(item);
            }
        }
    }
}

// Check for item collection using tank's collision box
export function checkItemCollection(tank, scene, applyPowerUpCallback, score, displayMessage) {
    const tankRadius = 3;
    const itemsToRemove = [];

    spawnedItems.forEach(item => {
        const dx = tank.position.x - item.position.x;
        const dz = tank.position.z - item.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < tankRadius + 2) {
            itemsToRemove.push(item);
            
            const effectData = ITEM_TYPES[item.userData.type].effect;
            
            // Handle Time Trial enhancements
            if (tank.userData.gameMode === 'time_trial' && effectData.timeTrial) {
                // Apply stacking speed boost if applicable
                if (effectData.timeTrial.stackable && tank.userData.speedBoost) {
                    effectData.timeTrial.multiplier = Math.min(6.0, tank.userData.speedBoost + 0.5);
                }
                effectData.multiplier = effectData.timeTrial.multiplier;
                effectData.duration = effectData.timeTrial.duration;
            }
            
            if (applyPowerUpCallback) {
                applyPowerUpCallback(effectData);
            }
            
            if (score) score += 50;
            if (displayMessage) {
                const durationText = effectData.duration ? ` (${effectData.duration/1000}s)` : '';
                const multiplierText = effectData.multiplier ? ` ${effectData.multiplier}x` : '';
                displayMessage(`${item.userData.type} BOOST!${multiplierText}${durationText}`, item.userData.type.toLowerCase());
            }
        }
    });

    itemsToRemove.forEach(item => {
        scene.remove(item);
        spawnedItems = spawnedItems.filter(i => i !== item);
    });
}

// Main environment creation function
export function createEnvironment(scene, level = 1) {
    const alleyWidth = ALLEY_WIDTH;
    
    // Define level-specific themes and elements
    const levelThemes = {
        4: {
            name: "Abandoned Factory",
            fogColor: 0x880000,
            lightColor: 0xff4444,
            ambientIntensity: 0.3,
            props: ['broken-machinery', 'rusty-containers', 'warning-signs'],
            soundEffects: ['metal-creaking', 'steam-hiss', 'distant-screams']
        },
        5: {
            name: "Haunted Cemetery",
            fogColor: 0x001133,
            lightColor: 0x3366ff,
            ambientIntensity: 0.2,
            props: ['gravestones', 'dead-trees', 'broken-statues'],
            soundEffects: ['wind-howling', 'crow-caws', 'ghostly-whispers']
        },
        6: {
            name: "Toxic Wasteland",
            fogColor: 0x00ff33,
            lightColor: 0x66ff99,
            ambientIntensity: 0.4,
            props: ['toxic-barrels', 'mutated-vegetation', 'hazard-signs'],
            soundEffects: ['bubbling-acid', 'geiger-counter', 'monster-growls']
        },
        7: {
            name: "Nightmare Circus",
            fogColor: 0x660066,
            lightColor: 0xff00ff,
            ambientIntensity: 0.3,
            props: ['broken-carousel', 'evil-clown-statues', 'twisted-tents'],
            soundEffects: ['creepy-music-box', 'distorted-laughter', 'carnival-music']
        },
        8: {
            name: "Shadow Dimension",
            fogColor: 0x000000,
            lightColor: 0x222222,
            ambientIntensity: 0.1,
            props: ['shadow-portals', 'floating-crystals', 'void-rifts'],
            soundEffects: ['void-whispers', 'reality-tears', 'cosmic-horror']
        },
        9: {
            name: "Blood Laboratory",
            fogColor: 0xaa0000,
            lightColor: 0xff0000,
            ambientIntensity: 0.3,
            props: ['specimen-tanks', 'surgical-equipment', 'experiment-chambers'],
            soundEffects: ['heart-beating', 'alarm-sirens', 'creature-screams']
        },
        10: {
            name: "Hell's Gateway",
            fogColor: 0xff3300,
            lightColor: 0xff6600,
            ambientIntensity: 0.5,
            props: ['demon-statues', 'fire-pits', 'bone-piles'],
            soundEffects: ['hell-ambience', 'demon-roars', 'soul-screams']
        }
    };

    // Apply level-specific theme if available
    if (level >= 4 && levelThemes[level]) {
        const theme = levelThemes[level];
        
        // Add fog
        scene.fog = new THREE.FogExp2(theme.fogColor, 0.015);
        
        // Update lighting
        const ambientLight = new THREE.AmbientLight(theme.lightColor, theme.ambientIntensity);
        scene.add(ambientLight);
        
        // Add flickering effect to lights
        const flickeringLights = [];
        for (let z = 0; z >= -LEVEL_LENGTH; z -= 50) {
            const light = new THREE.PointLight(theme.lightColor, 1, 50);
            light.position.set(0, WALL_HEIGHT - 2, z);
            light.userData.flickerIntensity = 0.2 + Math.random() * 0.3;
            light.userData.flickerSpeed = 0.05 + Math.random() * 0.1;
            flickeringLights.push(light);
            scene.add(light);
        }

        // Update animation loop to handle flickering
        function updateLights() {
            flickeringLights.forEach(light => {
                light.intensity = 1 + Math.sin(Date.now() * light.userData.flickerSpeed) * light.userData.flickerIntensity;
            });
            requestAnimationFrame(updateLights);
        }
        updateLights();

        // Add level-specific props
        const textureLoader = new THREE.TextureLoader();
        theme.props.forEach(propType => {
            for (let i = 0; i < 10; i++) {
                const prop = createScaryProp(propType, textureLoader);
                const angle = Math.random() * Math.PI * 2;
                const radius = alleyWidth/2 + Math.random() * 30;
                prop.position.set(
                    Math.cos(angle) * radius,
                    0,
                    -Math.random() * LEVEL_LENGTH
                );
                prop.rotation.y = Math.random() * Math.PI * 2;
                scene.add(prop);
            }
        });

        // Add environmental effects
        if (level >= 8) {
            // Add floating particles
            const particleCount = 1000;
            const particles = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            
            for (let i = 0; i < particleCount * 3; i += 3) {
                positions[i] = Math.random() * alleyWidth - alleyWidth/2;
                positions[i + 1] = Math.random() * WALL_HEIGHT;
                positions[i + 2] = -Math.random() * LEVEL_LENGTH;
            }
            
            particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const particleMaterial = new THREE.PointsMaterial({
                color: theme.lightColor,
                size: 0.2,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            
            const particleSystem = new THREE.Points(particles, particleMaterial);
            scene.add(particleSystem);
            
            // Animate particles
            function updateParticles() {
                const positions = particles.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += Math.sin(Date.now() * 0.001 + positions[i]) * 0.02;
                    positions[i] += Math.cos(Date.now() * 0.001 + positions[i + 2]) * 0.02;
                }
                particles.attributes.position.needsUpdate = true;
                requestAnimationFrame(updateParticles);
            }
            updateParticles();
        }

        // Add scary sound effects
        if (window.audioManager) {
            theme.soundEffects.forEach(sound => {
                window.audioManager.loadSound(sound, `sounds/${sound}.mp3`);
                // Play sounds at random intervals
                setInterval(() => {
                    if (Math.random() < 0.3) {
                        window.audioManager.playSound(sound, {
                            volume: 0.3 + Math.random() * 0.3,
                            loop: false
                        });
                    }
                }, 10000 + Math.random() * 20000);
            });
        }
    }

    // Create base environment elements
    const eiffelTowers = createEiffelTowers(scene);
    
    // Ground with level-specific textures
    const groundGeometry = new THREE.PlaneGeometry(alleyWidth, LEVEL_LENGTH);
    const textureLoader = new THREE.TextureLoader();
    
    // Load level-specific ground textures
    let groundTexture = 'textures/road/asphalt_diffuse.jpg';
    if (level >= 4) {
        groundTexture = level >= 8 ? 
            'textures/road/void_ground.jpg' : 
            'textures/road/scary_ground.jpg';
    }
    
    const roadBaseTexture = textureLoader.load(groundTexture, function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, LEVEL_LENGTH/8);
        texture.encoding = THREE.sRGBEncoding;
    });
    
    const roadNormalMap = textureLoader.load('textures/road/asphalt_normal.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, LEVEL_LENGTH/8);
    });
    
    const roadRoughnessMap = textureLoader.load('textures/road/asphalt_roughness.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, LEVEL_LENGTH/8);
    });
    
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        map: roadBaseTexture,
        normalMap: roadNormalMap,
        roughnessMap: roadRoughnessMap,
        normalScale: new THREE.Vector2(1, 1),
        roughness: 0.8,
        metalness: 0.1,
        envMapIntensity: 1.0
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -LEVEL_LENGTH / 2;
    scene.add(ground);

    // Only add default lighting if not using a scary theme
    if (level < 4 || !levelThemes[level]) {
        // Create a single ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);
        
        // Create a single directional light for shadows
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(0, WALL_HEIGHT, -LEVEL_LENGTH / 2);
        scene.add(dirLight);
    }
    
    // Add road markings
    const roadMarkingsGeometry = new THREE.PlaneGeometry(0.3, LEVEL_LENGTH);
    const roadMarkingsMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0x666666,
        emissiveIntensity: 0.2,
        roughness: 0.4,
        metalness: 0.0,
        transparent: true,
        opacity: 0.9
    });
    
    // Create center line
    const centerLine = new THREE.Mesh(roadMarkingsGeometry, roadMarkingsMaterial);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(0, 0.01, -LEVEL_LENGTH / 2); // Slightly above ground to prevent z-fighting
    scene.add(centerLine);
    
    // Create side lines
    const leftLine = new THREE.Mesh(roadMarkingsGeometry, roadMarkingsMaterial);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.position.set(-alleyWidth/2 + 1, 0.01, -LEVEL_LENGTH / 2);
    scene.add(leftLine);
    
    const rightLine = new THREE.Mesh(roadMarkingsGeometry, roadMarkingsMaterial);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.set(alleyWidth/2 - 1, 0.01, -LEVEL_LENGTH / 2);
    scene.add(rightLine);
    
    // Create outer ground (grass field with texture)
    const outerGroundWidth = 500;
    const outerGroundGeometry = new THREE.PlaneGeometry(outerGroundWidth, LEVEL_LENGTH);
    
    const grassTexture = textureLoader.load('textures/grass/grass_diffuse.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, LEVEL_LENGTH/10);
        texture.encoding = THREE.sRGBEncoding;
    });
    
    const grassNormalMap = textureLoader.load('textures/grass/grass_normal.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, LEVEL_LENGTH/10);
    });
    
    const outerGroundMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        normalMap: grassNormalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.8,
        metalness: 0.0
    });
    
    const outerGround = new THREE.Mesh(outerGroundGeometry, outerGroundMaterial);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.1; // Slightly below the road
    outerGround.position.z = -LEVEL_LENGTH / 2;
    scene.add(outerGround);
    
    // Create perimeter fence around the game boundaries
    const perimeterFence = createPerimeterFence(scene);
    
    // Create welcome placard at alley entrance with rainbow text
    createWelcomePlacard(scene, alleyWidth);
    
    // Higher walls with paneling - using merged geometry for better performance
    const wallGeometry = new THREE.BoxGeometry(1, WALL_HEIGHT, LEVEL_LENGTH);
    
    // Load textures for the walls
    const wallTexture = textureLoader.load('textures/wall/wall_diffuse.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, WALL_HEIGHT/10); // Reduced repetition for better appearance
        texture.encoding = THREE.sRGBEncoding;
    });
    
    const wallNormalMap = textureLoader.load('textures/wall/wall_normal.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, WALL_HEIGHT/10); // Matched with diffuse texture
    });
    
    const wallRoughnessMap = textureLoader.load('textures/wall/wall_rough.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, WALL_HEIGHT/10); // Matched with diffuse texture
    });
    
    // Create wall material with proper UV mapping
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        normalMap: wallNormalMap,
        roughnessMap: wallRoughnessMap,
        normalScale: new THREE.Vector2(2.0, 2.0), // Increased normal map effect
        roughness: 0.9,
        metalness: 0.1,
        envMapIntensity: 1.0,
        side: THREE.DoubleSide
    });
    
    // Create UV coordinates for the wall
    const uvAttribute = wallGeometry.attributes.uv;
    const positions = wallGeometry.attributes.position;
    
    // Adjust UV coordinates for better texture mapping
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        // Front/Back faces
        if (Math.abs(z) === LEVEL_LENGTH/2 || Math.abs(z) === -LEVEL_LENGTH/2) {
            uvAttribute.setXY(i, x/2 + 0.5, y/WALL_HEIGHT); // Simplified UV mapping
        }
        // Top/Bottom faces
        else if (Math.abs(y) === WALL_HEIGHT/2 || Math.abs(y) === -WALL_HEIGHT/2) {
            uvAttribute.setXY(i, x/2 + 0.5, z/LEVEL_LENGTH + 0.5);
        }
        // Left/Right faces
        else {
            uvAttribute.setXY(i, z/LEVEL_LENGTH + 0.5, y/WALL_HEIGHT);
        }
    }
    
    wallGeometry.attributes.uv.needsUpdate = true;
    
    // Add some vertex displacement to the walls for more detail
    for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        // Add subtle vertical displacement
        positions.setZ(i, positions.getZ(i) + (Math.sin(y * 0.2) * 0.1));
    }
    
    wallGeometry.computeVertexNormals();
    
    // Left and right walls
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-alleyWidth/2 - 0.5, WALL_HEIGHT/2 - 0.5, -LEVEL_LENGTH / 2);
    scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(alleyWidth/2 + 0.5, WALL_HEIGHT/2 - 0.5, -LEVEL_LENGTH / 2);
    scene.add(rightWall);
    
    // Add decorative wall panels using instanced mesh for better performance
    const panelGeometry = new THREE.BoxGeometry(0.2, WALL_HEIGHT * 0.8, 8);
    
    // Create UV coordinates for the panels
    const panelUvAttribute = panelGeometry.attributes.uv;
    const panelPositions = panelGeometry.attributes.position;
    
    // Adjust UV coordinates for the panels
    for (let i = 0; i < panelPositions.count; i++) {
        const x = panelPositions.getX(i);
        const y = panelPositions.getY(i);
        const z = panelPositions.getZ(i);
        
        // Front face
        if (Math.abs(z) === 4) {
            panelUvAttribute.setXY(i, x + 0.5, y/(WALL_HEIGHT * 0.8));
        }
        // Back face
        else if (Math.abs(z) === -4) {
            panelUvAttribute.setXY(i, x + 0.5, y/(WALL_HEIGHT * 0.8));
        }
        // Top face
        else if (Math.abs(y) === WALL_HEIGHT * 0.4) {
            panelUvAttribute.setXY(i, x + 0.5, z/8 + 0.5);
        }
        // Bottom face
        else if (Math.abs(y) === -WALL_HEIGHT * 0.4) {
            panelUvAttribute.setXY(i, x + 0.5, z/8 + 0.5);
        }
        // Left/Right faces
        else {
            panelUvAttribute.setXY(i, z/8 + 0.5, y/(WALL_HEIGHT * 0.8));
        }
    }
    
    panelGeometry.attributes.uv.needsUpdate = true;
    
    const panelMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        normalMap: wallNormalMap,
        roughnessMap: wallRoughnessMap,
        normalScale: new THREE.Vector2(2.0, 2.0),
        roughness: 0.8,
        metalness: 0.2,
        envMapIntensity: 1.2,
        side: THREE.DoubleSide
    });
    
    const panelCount = Math.floor(LEVEL_LENGTH / 10) * 2; // Both walls
    const panelInstancedMesh = new THREE.InstancedMesh(panelGeometry, panelMaterial, panelCount);
    let instanceIndex = 0;
    const matrix = new THREE.Matrix4();
    
    for (let z = 0; z >= -LEVEL_LENGTH; z -= 10) {
        // Left wall panels
        matrix.setPosition(-alleyWidth/2, WALL_HEIGHT/2 - 0.5, z);
        panelInstancedMesh.setMatrixAt(instanceIndex++, matrix);
        
        // Right wall panels
        matrix.setPosition(alleyWidth/2, WALL_HEIGHT/2 - 0.5, z);
        panelInstancedMesh.setMatrixAt(instanceIndex++, matrix);
    }
    scene.add(panelInstancedMesh);
    
    // Create a single ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // Create a single directional light for shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(0, WALL_HEIGHT, -LEVEL_LENGTH / 2);
    scene.add(dirLight);
    
    // Create different picture textures - updated with actual available files
    const basePictureTextures = [
        'lvl100.jpeg',
        'lvl80.jpeg',
        'lvl61.jpg',    // Added lvl61
        'lvl60.jpeg',
        'lvl40.jpeg',
        'lvl20.jpeg',
        '90.jpeg',
        '80.jpg',
        '19.jpg',
        '18.jpg',
        '17.jpg',
        '16.jpg',
        '15.jpg',
        '14.jpg',
        '13.jpg'
    ];
    
    // Create a larger array with 20 slots for future unique pictures
    // For now, duplicate the existing ones
    const pictureFileNames = [];
    for (let i = 0; i < 20; i++) {
        pictureFileNames.push(basePictureTextures[i % basePictureTextures.length]);
    }
    
    // Load all picture textures
    const pictureTextures = pictureFileNames.map((texture, index) => {
        const tex = new THREE.TextureLoader().load(`textures/${texture}`);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        console.log(`Loaded picture ${index + 1}/20: ${texture}`);
        return tex;
    });
    
    // Track picture placement
    let pictureIndex = 0;
    
    // Add pictures directly on walls without frames - adjusted size
    for (let z = -50; z >= -LEVEL_LENGTH; z -= 100) {
        // Left wall pictures - each with a unique texture
        const pictureGeometry = new THREE.PlaneGeometry(10, 6); // Reduced size for better proportion
        const pictureMaterial = new THREE.MeshPhongMaterial({ 
            map: pictureTextures[pictureIndex],
            emissive: 0x222222,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.95 // Slight transparency for better integration
        });
        const leftPicture = new THREE.Mesh(pictureGeometry, pictureMaterial);
        leftPicture.position.set(-alleyWidth/2 + 0.3, WALL_HEIGHT/2, z); // Moved closer to wall
        leftPicture.rotation.y = Math.PI / 2; // Rotate to face inside the alley
        scene.add(leftPicture);
        
        // Add spotlight for each picture
        const pictureLight = new THREE.SpotLight(0xffffff, 0.8);
        pictureLight.position.set(-alleyWidth/2 + 2, WALL_HEIGHT/2 + 2, z);
        pictureLight.target = leftPicture;
        pictureLight.angle = 0.3;
        pictureLight.penumbra = 0.5;
        pictureLight.distance = 10;
        scene.add(pictureLight);
        scene.add(pictureLight.target);
        
        // Increment to next unique picture
        pictureIndex = (pictureIndex + 1) % 20;
        
        // Right wall pictures - each with a unique texture
        const rightPictureGeometry = new THREE.PlaneGeometry(12, 8);
        const rightPictureMaterial = new THREE.MeshPhongMaterial({ 
            map: pictureTextures[pictureIndex],
            emissive: 0x222222,
            emissiveIntensity: 0.2
        });
        const rightPicture = new THREE.Mesh(rightPictureGeometry, rightPictureMaterial);
        rightPicture.position.set(alleyWidth/2 - 0.6, WALL_HEIGHT/2, z);
        rightPicture.rotation.y = -Math.PI / 2; // Rotate to face inside the alley
        scene.add(rightPicture);
        
        // Increment to next unique picture
        pictureIndex = (pictureIndex + 1) % 20;
    }
    
    // Add floor lighting strips using emissive materials instead of lights
    const stripGeometry = new THREE.PlaneGeometry(0.3, LEVEL_LENGTH);
    const stripMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ffff,
        emissive: 0x00aaaa,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.5
    });
    
    // Left and right floor strips
    const leftStrip = new THREE.Mesh(stripGeometry, stripMaterial);
    leftStrip.rotation.x = -Math.PI / 2;
    leftStrip.position.set(-alleyWidth/2 + 1, 0.01, -LEVEL_LENGTH / 2);
    scene.add(leftStrip);
    
    const rightStrip = new THREE.Mesh(stripGeometry, stripMaterial);
    rightStrip.rotation.x = -Math.PI / 2;
    rightStrip.position.set(alleyWidth/2 - 1, 0.01, -LEVEL_LENGTH / 2);
    scene.add(rightStrip);
    
    // Ceiling with optimized lighting
    const ceilingGeometry = new THREE.PlaneGeometry(alleyWidth + 2, LEVEL_LENGTH);
    const ceilingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x555555,
        roughness: 0.6,
        emissive: 0x222222,
        emissiveIntensity: 0.2
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, WALL_HEIGHT - 1, -LEVEL_LENGTH / 2);
    scene.add(ceiling);
    
    // Add ceiling fixtures using instanced mesh
    const fixtureGeometry = new THREE.BoxGeometry(2, 0.5, 2);
    const fixtureMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xCCCCCC,
        emissive: 0x666666,
        emissiveIntensity: 0.5
    });
    
    const fixtureCount = Math.floor(LEVEL_LENGTH / 20);
    const fixtureInstancedMesh = new THREE.InstancedMesh(fixtureGeometry, fixtureMaterial, fixtureCount);
    instanceIndex = 0;
    
    for (let z = 0; z >= -LEVEL_LENGTH; z -= 20) {
        matrix.setPosition(0, WALL_HEIGHT - 2, z);
        fixtureInstancedMesh.setMatrixAt(instanceIndex++, matrix);
    }
    scene.add(fixtureInstancedMesh);
    
    // Tollgate at the end
    createFuturisticTollgate(scene, alleyWidth, WALL_HEIGHT, LEVEL_LENGTH);
    
    // Spawn initial items
    spawnRandomItems(scene);

    // Add a property to the return value to store the eiffel tower reference
    const envInfo = {
        LEVEL_LENGTH,
        eiffelTowers, // Updated to store all towers
        tollgate
    };
    
    // Add atmospheric elements
    const atmosphere = createAtmosphere(scene);
    
    // Make atmosphere available for updates
    window.atmosphere = atmosphere;
    
    // ... continue with existing code ...
    
    // Add scattered props around the alley
    createScatteredProps(scene, alleyWidth, LEVEL_LENGTH);
    
    // Return information including atmosphere
    return {
        LEVEL_LENGTH,
        eiffelTowers,
        atmosphere,
        theme: level >= 4 ? levelThemes[level] : null
    };
}

// Create a detailed futuristic tollgate
function createFuturisticTollgate(scene, width, wallHeight, levelLength) {
    // Main gate structure - using group to manage all components
    const tollgateGroup = new THREE.Group();
    tollgateGroup.position.set(0, 0, -levelLength);
    scene.add(tollgateGroup);
    
    // Base foundation
    const baseGeometry = new THREE.BoxGeometry(width + 4, 1, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x111111
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0, 0, 0);
    tollgateGroup.add(base);
    
    // Add glowing lines on the base
    const lineGeometry = new THREE.PlaneGeometry(width + 3.8, 0.1);
    const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 5; i++) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.51, -3 + i * 1.5);
        line.userData = { pulseRate: 0.003 + Math.random() * 0.002 };
        tollgateGroup.add(line);
    }
    
    // Side pillars (left and right)
    const pillarGeo = new THREE.CylinderGeometry(2, 2.5, wallHeight * 1.5, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x222222
    });
    
    // Left pillar
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-width/2 - 1, wallHeight * 0.75, 0);
    tollgateGroup.add(leftPillar);
    
    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(width/2 + 1, wallHeight * 0.75, 0);
    tollgateGroup.add(rightPillar);
    
    // Create decorative rings for pillars
    for (let i = 1; i <= 3; i++) {
        const ringGeo = new THREE.TorusGeometry(2.2, 0.3, 16, 32);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00aaaa,
            emissiveIntensity: 0.7,
            metalness: 1.0,
            roughness: 0.2
        });
        
        const leftRing = new THREE.Mesh(ringGeo, ringMat);
        leftRing.position.set(-width/2 - 1, wallHeight * 0.3 * i, 0);
        leftRing.rotation.x = Math.PI / 2;
        tollgateGroup.add(leftRing);
        
        const rightRing = new THREE.Mesh(ringGeo, ringMat);
        rightRing.position.set(width/2 + 1, wallHeight * 0.3 * i, 0);
        rightRing.rotation.x = Math.PI / 2;
        tollgateGroup.add(rightRing);
    }
    
    // Add holographic projector pedestals to the sides of the gate
    const pedestalGeo = new THREE.CylinderGeometry(1, 1.2, 3, 8);
    const pedestalMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x111111
    });
    
    // Left pedestal
    const leftPedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    leftPedestal.position.set(-width/2 + 5, 1.5, 2);
    tollgateGroup.add(leftPedestal);
    
    // Right pedestal
    const rightPedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    rightPedestal.position.set(width/2 - 5, 1.5, 2);
    tollgateGroup.add(rightPedestal);
    
    // Add holographic emitters on top of pedestals
    const emitterGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const emitterMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });
    
    const leftEmitter = new THREE.Mesh(emitterGeo, emitterMat);
    leftEmitter.position.set(-width/2 + 5, 3.2, 2);
    tollgateGroup.add(leftEmitter);
    
    const rightEmitter = new THREE.Mesh(emitterGeo, emitterMat);
    rightEmitter.position.set(width/2 - 5, 3.2, 2);
    tollgateGroup.add(rightEmitter);
    
    // Create gate beam - this will be the main gate that lifts up
    const gateGeometry = new THREE.BoxGeometry(width, wallHeight / 2, 1);
    const gateMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        metalness: 0.8,
        roughness: 0.3,
        transparent: true,
        opacity: 0.9
    });
    
    // Create gate grid pattern using additional geometry
    const gateGroup = new THREE.Group();
    const mainGate = new THREE.Mesh(gateGeometry, gateMaterial);
    gateGroup.add(mainGate);
    
    // Add horizontal bars
    const barGeo = new THREE.BoxGeometry(width - 1, 0.3, 1.2);
    const barMat = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        emissive: 0x0066aa,
        emissiveIntensity: 0.5,
        metalness: 0.9
    });
    
    for (let i = 0; i < 5; i++) {
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.y = -wallHeight/4 + i * (wallHeight/10);
        gateGroup.add(bar);
    }
    
    // Add vertical energy beams
    const beamGeo = new THREE.CylinderGeometry(0.15, 0.15, wallHeight/2 - 1, 8);
    const beamMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.8
    });
    
    for (let i = 0; i < 8; i++) {
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.x = -width/2 + 2 + i * (width - 4) / 7;
        beam.userData = { originalY: beam.position.y, phase: Math.random() * Math.PI * 2 };
        gateGroup.add(beam);
    }
    
    gateGroup.position.set(0, wallHeight/4, 0);
    tollgateGroup.add(gateGroup);
    
    // Add status text to the gate
    const gateCanvas = document.createElement('canvas');
    const gateContext = gateCanvas.getContext('2d');
    gateCanvas.width = 512;
    gateCanvas.height = 64;
    
    gateContext.fillStyle = 'black';
    gateContext.fillRect(0, 0, gateCanvas.width, gateCanvas.height);
    
    gateContext.font = 'bold 40px Arial';
    gateContext.textAlign = 'center';
    gateContext.textBaseline = 'middle';
    gateContext.fillStyle = '#ff0000';
    gateContext.shadowColor = '#ff0000';
    gateContext.shadowBlur = 10;
    gateContext.fillText('GATE LOCKED', gateCanvas.width/2, gateCanvas.height/2);
    
    const gateStatusTexture = new THREE.CanvasTexture(gateCanvas);
    const gateStatusMaterial = new THREE.MeshBasicMaterial({
        map: gateStatusTexture,
        transparent: true
    });
    
    const gateStatusGeometry = new THREE.PlaneGeometry(8, 1);
    const gateStatusMesh = new THREE.Mesh(gateStatusGeometry, gateStatusMaterial);
    gateStatusMesh.position.set(0, 0, 0.6);
    mainGate.add(gateStatusMesh);
    
    // Top arch connecting pillars
    const archGeo = new THREE.CylinderGeometry(2, 2, width + 2, 16, 1, true, -Math.PI/2, Math.PI);
    archGeo.rotateZ(Math.PI/2);
    const archMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.7,
        roughness: 0.3
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, wallHeight * 1.5, 0);
    tollgateGroup.add(arch);
    
    // Add decorative arc structure
    const arcStructure = new THREE.Group();
    
    // Create ornate arch frame
    const ornateArchGeo = new THREE.TorusGeometry(width/3, 1, 16, 24, Math.PI);
    const ornateArchMat = new THREE.MeshStandardMaterial({
        color: 0x777777,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x333333
    });
    
    const ornateArch = new THREE.Mesh(ornateArchGeo, ornateArchMat);
    ornateArch.rotation.x = Math.PI/2;
    ornateArch.rotation.y = Math.PI;
    ornateArch.position.set(0, wallHeight * 1.5 + 8, 0);
    arcStructure.add(ornateArch);
    
    // Add spikes to the arc
    const spikeCount = 7;
    for (let i = 0; i < spikeCount; i++) {
        const angle = (i / (spikeCount - 1)) * Math.PI;
        const x = Math.cos(angle) * (width/3);
        const y = Math.sin(angle) * (width/3);
        
        const spikeGeo = new THREE.ConeGeometry(0.4, 1.5, 6);
        const spikeMat = new THREE.MeshStandardMaterial({
            color: 0x999999,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x444444
        });
        
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(x, wallHeight * 1.5 + 8 + y, 0);
        spike.rotation.x = -Math.PI/2;
        spike.rotation.z = angle - Math.PI/2;
        arcStructure.add(spike);
    }
    
    // Add glowing orb on top of the arc
    const orbGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 0.8,
        metalness: 0.2,
        roughness: 0.3
    });
    
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(0, wallHeight * 1.5 + 8 + width/3, 0);
    arcStructure.add(orb);
    
    // Add a light from the orb
    const orbLight = new THREE.PointLight(0xff5500, 1, 20);
    orbLight.position.copy(orb.position);
    arcStructure.add(orbLight);
    
    tollgateGroup.add(arcStructure);
    
    // Add "WELCOME COMBATANT" sign above the gate
    const welcomeCanvas = document.createElement('canvas');
    const welcomeCtx = welcomeCanvas.getContext('2d');
    welcomeCanvas.width = 512;
    welcomeCanvas.height = 128;
    
    welcomeCtx.fillStyle = 'black';
    welcomeCtx.fillRect(0, 0, welcomeCanvas.width, welcomeCanvas.height);
    
    welcomeCtx.font = 'bold 60px Arial';
    welcomeCtx.textAlign = 'center';
    welcomeCtx.textBaseline = 'middle';
    welcomeCtx.fillStyle = '#ff9900';
    welcomeCtx.shadowColor = '#ff6600';
    welcomeCtx.shadowBlur = 15;
    welcomeCtx.fillText('WELCOME COMBATANT', welcomeCanvas.width/2, welcomeCanvas.height/2);
    
    const welcomeTexture = new THREE.CanvasTexture(welcomeCanvas);
    const welcomeMaterial = new THREE.MeshBasicMaterial({
        map: welcomeTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const welcomeGeometry = new THREE.PlaneGeometry(width - 4, 4);
    const welcomeMesh = new THREE.Mesh(welcomeGeometry, welcomeMaterial);
    welcomeMesh.position.set(0, wallHeight * 1.5 + 3, 0.5);
    tollgateGroup.add(welcomeMesh);
    
    // Create "FAREWELL" sign on the back side
    const farewellCanvas = document.createElement('canvas');
    const farewellCtx = farewellCanvas.getContext('2d');
    farewellCanvas.width = 512;
    farewellCanvas.height = 128;
    
    farewellCtx.fillStyle = 'black';
    farewellCtx.fillRect(0, 0, farewellCanvas.width, farewellCanvas.height);
    
    farewellCtx.font = 'bold 60px Arial';
    farewellCtx.textAlign = 'center';
    farewellCtx.textBaseline = 'middle';
    farewellCtx.fillStyle = '#ff3333';
    farewellCtx.shadowColor = '#aa0000';
    farewellCtx.shadowBlur = 15;
    farewellCtx.fillText('FAREWELL', farewellCanvas.width/2, farewellCanvas.height/2);
    
    const farewellTexture = new THREE.CanvasTexture(farewellCanvas);
    const farewellMaterial = new THREE.MeshBasicMaterial({
        map: farewellTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const farewellGeometry = new THREE.PlaneGeometry(width - 4, 4);
    const farewellMesh = new THREE.Mesh(farewellGeometry, farewellMaterial);
    farewellMesh.position.set(0, wallHeight * 1.5 + 3, -0.5);
    farewellMesh.rotation.y = Math.PI;
    tollgateGroup.add(farewellMesh);
    
    // Add "INSERT YOUR KEY TO OPEN" text panel above the gate
    const keyInstructCanvas = document.createElement('canvas');
    const keyInstructCtx = keyInstructCanvas.getContext('2d');
    keyInstructCanvas.width = 512;
    keyInstructCanvas.height = 64;
    
    keyInstructCtx.fillStyle = 'black';
    keyInstructCtx.fillRect(0, 0, keyInstructCanvas.width, keyInstructCanvas.height);
    
    keyInstructCtx.font = 'bold 40px Arial';
    keyInstructCtx.textAlign = 'center';
    keyInstructCtx.textBaseline = 'middle';
    keyInstructCtx.fillStyle = '#ffffff';
    keyInstructCtx.shadowColor = '#aaaaaa';
    keyInstructCtx.shadowBlur = 10;
    keyInstructCtx.fillText('INSERT YOUR KEY TO OPEN', keyInstructCanvas.width/2, keyInstructCanvas.height/2);
    
    const keyInstructTexture = new THREE.CanvasTexture(keyInstructCanvas);
    const keyInstructMaterial = new THREE.MeshBasicMaterial({
        map: keyInstructTexture,
        transparent: true
    });
    
    const keyInstructGeometry = new THREE.PlaneGeometry(width - 2, 3);
    const keyInstructMesh = new THREE.Mesh(keyInstructGeometry, keyInstructMaterial);
    keyInstructMesh.position.set(0, wallHeight * 0.7, 0.6);
    tollgateGroup.add(keyInstructMesh);
    
    // Add sign on top of arch
    const signGeo = new THREE.BoxGeometry(width/2, 3, 1);
    const signMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x333333,
        roughness: 0.2
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, wallHeight * 1.5 + 3, 0);
    tollgateGroup.add(sign);
    
    // Create text for the sign
    const loader = new THREE.TextureLoader();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 70px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.2, '#ffff00');
    gradient.addColorStop(0.4, '#00ff00');
    gradient.addColorStop(0.6, '#00ffff');
    gradient.addColorStop(0.8, '#0000ff');
    gradient.addColorStop(1, '#ff00ff');
    
    ctx.fillStyle = gradient;
    ctx.fillText('NEXT LEVEL', canvas.width/2, canvas.height/2);
    
    // Apply canvas as texture
    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
    });
    
    const textGeometry = new THREE.PlaneGeometry(width/2 - 0.5, 2.8);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, 0, 0.51);
    sign.add(textMesh);
    
    // Add spotlights on top of pillars
    const spotLight1 = new THREE.SpotLight(0x00aaff, 2, 30, Math.PI/4, 0.3, 1);
    spotLight1.position.set(-width/2 - 1, wallHeight * 1.5, 0);
    spotLight1.target.position.set(-width/2 - 1, 0, -10);
    tollgateGroup.add(spotLight1);
    tollgateGroup.add(spotLight1.target);
    
    const spotLight2 = new THREE.SpotLight(0x00aaff, 2, 30, Math.PI/4, 0.3, 1);
    spotLight2.position.set(width/2 + 1, wallHeight * 1.5, 0);
    spotLight2.target.position.set(width/2 + 1, 0, -10);
    tollgateGroup.add(spotLight2);
    tollgateGroup.add(spotLight2.target);
    
    // Add ground lighting effects
    const groundLightGeo = new THREE.CircleGeometry(width/2, 32);
    groundLightGeo.rotateX(-Math.PI/2);
    const groundLightMat = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    const groundLight = new THREE.Mesh(groundLightGeo, groundLightMat);
    groundLight.position.set(0, 0.1, 0);
    tollgateGroup.add(groundLight);
    
    // Add warning strips on ground
    const warningGeometry = new THREE.PlaneGeometry(width, 3);
    warningGeometry.rotateX(-Math.PI/2);
    const warningMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const warningStrip = new THREE.Mesh(warningGeometry, warningMaterial);
    warningStrip.position.set(0, 0.12, -5);
    tollgateGroup.add(warningStrip);
    
    // Store references to animated elements
    tollgate = {
        group: tollgateGroup,
        gate: gateGroup,
        beams: gateGroup.children.filter(child => child.geometry && child.geometry.type === 'CylinderGeometry'),
        rings: tollgateGroup.children.filter(child => child.geometry && child.geometry.type === 'TorusGeometry'),
        groundLight: groundLight,
        warningStrip: warningStrip,
        lines: tollgateGroup.children.filter(child => child.geometry && child.geometry.type === 'PlaneGeometry' && child.position.y === 0.51),
        originalY: wallHeight/4,
        isOpen: false,
        isUnlocked: false,
        spotLights: [spotLight1, spotLight2],
        statusDisplay: {
            mesh: gateStatusMesh,
            texture: gateStatusTexture,
            context: gateContext,
            canvas: gateCanvas
        },
        keyInstructDisplay: {
            mesh: keyInstructMesh,
            texture: keyInstructTexture,
            context: keyInstructCtx,
            canvas: keyInstructCanvas
        },
        welcomeDisplay: {
            mesh: welcomeMesh,
            texture: welcomeTexture
        },
        farewellDisplay: {
            mesh: farewellMesh,
            texture: farewellTexture
        },
        orb: orb,
        orbLight: orbLight,
        emitters: [leftEmitter, rightEmitter]
    };
}

export function updateTollgate(tank, enemies, scene, hasKey) {
    // Debug - log state to help diagnose issues
    const DEBUG_TOLLGATE = true; // Set to true to enable debugging
    
    if (DEBUG_TOLLGATE) {
        console.log("Tollgate status:", {
            hasKey: hasKey,
            enemiesRemaining: enemies.length,
            tankPosition: tank.position.z,
            tollgatePosition: -LEVEL_LENGTH,
            isUnlocked: tollgate.isUnlocked || false,
            isOpen: tollgate.isOpen || false,
            distance: Math.abs(tank.position.z - (-LEVEL_LENGTH))
        });
    }
    
    // Animate elements even when gate is closed
    if (tollgate.beams) {
        // Animate energy beams
        tollgate.beams.forEach((beam, i) => {
            beam.position.y = beam.userData.originalY + Math.sin(Date.now() * 0.005 + beam.userData.phase) * 0.2;
            beam.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.003 + i) * 0.3;
        });
        
        // Animate rings
        if (tollgate.rings) {
            tollgate.rings.forEach((ring, i) => {
                ring.rotation.z = Date.now() * 0.001 + i * Math.PI / 3;
                ring.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.002 + i) * 0.2;
            });
        }
        
        // Pulse ground light and warning strip
        if (tollgate.groundLight) {
            tollgate.groundLight.material.opacity = 0.1 + Math.sin(Date.now() * 0.002) * 0.1;
        }
        
        if (tollgate.warningStrip) {
            tollgate.warningStrip.material.opacity = 0.5 + Math.sin(Date.now() * 0.006) * 0.3;
        }
        
        // Animate base lines
        if (tollgate.lines) {
            tollgate.lines.forEach(line => {
                line.material.opacity = 0.5 + Math.sin(Date.now() * line.userData.pulseRate) * 0.3;
            });
        }
        
        // Animate emitters
        if (tollgate.emitters) {
            tollgate.emitters.forEach((emitter, i) => {
                emitter.scale.setScalar(0.8 + Math.sin(Date.now() * 0.004 + i * Math.PI) * 0.2);
                emitter.material.opacity = 0.6 + Math.sin(Date.now() * 0.003 + i * Math.PI) * 0.2;
            });
        }
    }
    
    // Check if key is acquired and enemies are gone
    if (hasKey && enemies.length === 0) {
        if (DEBUG_TOLLGATE) {
            console.log("Tollgate should be unlocked! Key acquired and enemies defeated.");
        }
        
        // Auto-open the gate immediately - Time Trial should open gate automatically
        const isTimeTrial = tank.userData && tank.userData.gameMode === 'time_trial';
        
        // Update status text to "UNLOCKED" if not already
        if (!tollgate.isUnlocked) {
            tollgate.isUnlocked = true;
            
            // Change warning strip color to green
            if (tollgate.warningStrip) {
                tollgate.warningStrip.material.color.setHex(0x00ff00);
            }
            
            // Change ground light color
            if (tollgate.groundLight) {
                tollgate.groundLight.material.color.setHex(0x00ff00);
            }
            
            // Change emitter colors
            if (tollgate.emitters) {
                tollgate.emitters.forEach(emitter => {
                    emitter.material.color.setHex(0x00ff00);
                });
            }
            
            // Change particle color
            if (tollgate.particles) {
                tollgate.particles.material.color.setHex(0x00ff00);
            }
            
            // Change orb color
            if (tollgate.orb) {
                tollgate.orb.material.color.setHex(0x00ff00);
                tollgate.orb.material.emissive.setHex(0x00ff00);
                
                if (tollgate.orbLight) {
                    tollgate.orbLight.color.setHex(0x00ff00);
                }
            }
            
            // In Time Trial mode or when tank is close enough, start opening the gate immediately
            if (isTimeTrial || Math.abs(tank.position.z - (-LEVEL_LENGTH)) < 100) {
                console.log("AUTO-OPENING GATE - Player has key!");
                
                // Trigger gate opening automatically
                if (!tollgate.isOpen) {
                    tollgate.isOpen = true;
                }
                
                // Ensure originalY is set
                if (typeof tollgate.originalY === 'undefined' && tollgate.gate) {
                    tollgate.originalY = tollgate.gate.position.y;
                }
            }
            
            // Update status text
            if (tollgate.statusDisplay) {
                const context = tollgate.statusDisplay.context;
                const canvas = tollgate.statusDisplay.canvas;
                
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = 'black';
                context.fillRect(0, 0, canvas.width, canvas.height);
                
                context.font = 'bold 40px Arial';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillStyle = '#00ff00';
                context.shadowColor = '#00ff00';
                context.shadowBlur = 10;
                context.fillText('GATE UNLOCKED', canvas.width/2, canvas.height/2);
                
                tollgate.statusDisplay.texture.needsUpdate = true;
            }
            
            // Update key instruction text
            if (tollgate.keyInstructDisplay) {
                const context = tollgate.keyInstructDisplay.context;
                const canvas = tollgate.keyInstructDisplay.canvas;
                
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = 'black';
                context.fillRect(0, 0, canvas.width, canvas.height);
                
                context.font = 'bold 40px Arial';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillStyle = '#00ff00';
                context.shadowColor = '#00ff00';
                context.shadowBlur = 10;
                context.fillText('KEY ACCEPTED - APPROACH', canvas.width/2, canvas.height/2);
                
                tollgate.keyInstructDisplay.texture.needsUpdate = true;
            }
        }
    }
    
    // Open gate when conditions are met
    if (hasKey && enemies.length === 0 && tank.position.z < -LEVEL_LENGTH + 30) {  // Increased distance threshold from 5 to 30
        if (DEBUG_TOLLGATE) {
            console.log("Tank is close to tollgate with key - should open gate!");
        }
        
        if (!tollgate.isOpen) {
            // Play gate opening sound if available
            // playSound('gateOpen');
            
            tollgate.isOpen = true;
            console.log("TOLLGATE OPENING NOW!");
            
            // Ensure originalY is set if it isn't already
            if (typeof tollgate.originalY === 'undefined' && tollgate.gate) {
                tollgate.originalY = tollgate.gate.position.y;
            }
            
            // Update status text to "GATE OPENING"
            if (tollgate.statusDisplay) {
                const context = tollgate.statusDisplay.context;
                const canvas = tollgate.statusDisplay.canvas;
                
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = 'black';
                context.fillRect(0, 0, canvas.width, canvas.height);
                
                context.font = 'bold 40px Arial';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillStyle = '#00ff00';
                context.shadowColor = '#00ff00';
                context.shadowBlur = 10;
                context.fillText('GATE OPENING', canvas.width/2, canvas.height/2);
                
                tollgate.statusDisplay.texture.needsUpdate = true;
            }
            
            // Increase intensity of effects when gate opens
            if (tollgate.rings) {
                tollgate.rings.forEach(ring => {
                    ring.material.emissive.setHex(0x00ffff);
                    ring.material.emissiveIntensity = 1.0;
                });
            }
            
            if (tollgate.groundLight) {
                tollgate.groundLight.material.opacity = 0.5;
            }
            
            if (tollgate.spotLights) {
                tollgate.spotLights.forEach(light => {
                    light.intensity = 5;
                });
            }
            
            // Increase orb intensity
            if (tollgate.orb) {
                tollgate.orb.material.emissiveIntensity = 1.5;
                
                if (tollgate.orbLight) {
                    tollgate.orbLight.intensity = 2;
                }
            }
        }
        
        // Check if gate exists before trying to move it
        if (tollgate.gate && typeof tollgate.originalY !== 'undefined') {
            // Raise the gate
            tollgate.gate.position.y += 0.2;
            
            if (DEBUG_TOLLGATE) {
                console.log("Raising gate:", {
                    currentY: tollgate.gate.position.y,
                    originalY: tollgate.originalY,
                    target: tollgate.originalY + 10
                });
            }
            
            // Return true when gate is fully open
            if (tollgate.gate.position.y > tollgate.originalY + 10) {
                // Update status text to "WELCOME!"
                if (tollgate.statusDisplay) {
                    const context = tollgate.statusDisplay.context;
                    const canvas = tollgate.statusDisplay.canvas;
                    
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.fillStyle = 'black';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    
                    context.font = 'bold 40px Arial';
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillStyle = '#ffff00';
                    context.shadowColor = '#ffff00';
                    context.shadowBlur = 10;
                    context.fillText('WELCOME!', canvas.width/2, canvas.height/2);
                    
                    tollgate.statusDisplay.texture.needsUpdate = true;
                }
                
                // Update key instruction text
                if (tollgate.keyInstructDisplay) {
                    const context = tollgate.keyInstructDisplay.context;
                    const canvas = tollgate.keyInstructDisplay.canvas;
                    
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.fillStyle = 'black';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    
                    context.font = 'bold 40px Arial';
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillStyle = '#ffff00';
                    context.shadowColor = '#ffff00';
                    context.shadowBlur = 10;
                    context.fillText('PROCEED TO NEXT LEVEL', canvas.width/2, canvas.height/2);
                    
                    tollgate.keyInstructDisplay.texture.needsUpdate = true;
                }
                
                return true;
            }
        } else {
            console.error("Gate element missing or originalY not set in tollgate object!", tollgate);
        }
    }
    
    return false;
}

// Add collision detection for U-turn points
export function isAtUTurnPoint(position) {
    const z = position.z;
    for (let uturnZ = -UTURN_INTERVAL; uturnZ >= -LEVEL_LENGTH; uturnZ -= UTURN_INTERVAL) {
        if (Math.abs(z - uturnZ) < 3) { // Within 3 units of U-turn point
            return true;
        }
    }
    return false;
}

// Create trees outside the alley with fewer trees for better performance
function createTrees(scene, alleyWidth, levelLength) {
    // Tree models
    const treeTypes = [
        {
            // Pine tree
            trunkGeometry: new THREE.CylinderGeometry(0.5, 0.7, 4, 8),
            trunkMaterial: new THREE.MeshPhongMaterial({ color: 0x4d2926 }),
            foliageGeometry: new THREE.ConeGeometry(2, 5, 8),
            foliageMaterial: new THREE.MeshPhongMaterial({ color: 0x025D1A }),
            height: 7
        },
        {
            // Oak tree
            trunkGeometry: new THREE.CylinderGeometry(0.7, 1, 5, 8),
            trunkMaterial: new THREE.MeshPhongMaterial({ color: 0x3d2116 }),
            foliageGeometry: new THREE.SphereGeometry(3, 8, 6), // Reduced segments
            foliageMaterial: new THREE.MeshPhongMaterial({ color: 0x167D36 }),
            height: 10
        },
        {
            // Small bush
            trunkGeometry: new THREE.CylinderGeometry(0.3, 0.4, 1, 6), // Reduced segments
            trunkMaterial: new THREE.MeshPhongMaterial({ color: 0x3D2816 }),
            foliageGeometry: new THREE.SphereGeometry(1.5, 6, 6), // Reduced segments
            foliageMaterial: new THREE.MeshPhongMaterial({ color: 0x3A7D48 }),
            height: 3
        }
    ];
    
    // Tree placement - fewer trees, larger spacing
    const minDistance = alleyWidth/2 + 5;
    const maxDistance = alleyWidth/2 + 30;
    const treesPerSide = 30; // Reduced from 80 to 30
    
    // Place trees on both sides of the alley
    for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < treesPerSide; i++) {
            // Random tree type
            const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            
            // Random position - more spread out
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            const xPos = side * distance;
            const zPos = -(Math.random() * (levelLength + 100)) + 50;
            
            // Create tree
            const tree = new THREE.Group();
            
            // Trunk
            const trunk = new THREE.Mesh(treeType.trunkGeometry, treeType.trunkMaterial);
            trunk.position.y = treeType.trunkGeometry.parameters.height / 2;
            tree.add(trunk);
            
            // Foliage
            const foliage = new THREE.Mesh(treeType.foliageGeometry, treeType.foliageMaterial);
            foliage.position.y = treeType.height - treeType.foliageGeometry.parameters.height / 2;
            tree.add(foliage);
            
            // Position tree
            tree.position.set(xPos, 0, zPos);
            
            // Random rotation for variety
            tree.rotation.y = Math.random() * Math.PI * 2;
            
            // Random scale for variety
            const scale = 0.7 + Math.random() * 0.6;
            tree.scale.set(scale, scale, scale);
            
            scene.add(tree);
        }
    }
}

// Create outdoor lighting with fewer lights for better performance
function createOutdoorLighting(scene, alleyWidth, levelLength) {
    // Ambient outdoor light
    const outdoorAmbient = new THREE.AmbientLight(0x202840, 0.3); // Increased intensity to compensate for fewer lights
    scene.add(outdoorAmbient);
    
    // Moonlight (directional light)
    const moonlight = new THREE.DirectionalLight(0x8090FF, 0.5); // Increased intensity
    moonlight.position.set(100, 100, 0);
    scene.add(moonlight);
    
    // Add street lamps outside the alley - fewer lamps, spaced further apart
    const lampHeight = 12;
    const lampSpacing = 150; // Increased from 50 to 150 - fewer lamps
    const lampDistance = alleyWidth/2 + 10;
    
    for (let z = -25; z >= -levelLength; z -= lampSpacing) {
        // Only add lamps on alternating sides for better performance
        if (z % 300 === -25) {
            // Left side lamp
            createStreetLamp(scene, -lampDistance, z, lampHeight);
        } else {
            // Right side lamp
            createStreetLamp(scene, lampDistance, z, lampHeight);
        }
    }
}

// Create a street lamp
function createStreetLamp(scene, x, z, height) {
    const lamp = new THREE.Group();
    
    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.3, height, 8);
    const poleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x202020,
        metalness: 0.8,
        roughness: 0.2
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = height/2;
    lamp.add(pole);
    
    // Lamp head
    const headGeometry = new THREE.CylinderGeometry(0.6, 1, 1, 8);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = height;
    head.rotation.x = Math.PI/2;
    lamp.add(head);
    
    // Lamp glass
    const glassGeometry = new THREE.CircleGeometry(0.5, 16);
    const glassMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFFFF80,
        emissive: 0xFFFF80,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.set(0, height, 0.4);
    glass.rotation.x = -Math.PI/2;
    lamp.add(glass);
    
    // Light
    const light = new THREE.SpotLight(0xFFFF80, 1);
    light.position.set(0, height, 0);
    light.angle = 0.5;
    light.penumbra = 0.5;
    light.distance = 40;
    light.decay = 1;
    light.target.position.set(0, 0, -5);
    lamp.add(light);
    lamp.add(light.target);
    
    // Position lamp
    lamp.position.set(x, 0, z);
    
    scene.add(lamp);
    return lamp;
}

// Create welcome placard with rainbow text
function createWelcomePlacard(scene, alleyWidth) {
    // Create an arch structure
    const archGroup = new THREE.Group();
    
    // Left pillar
    const pillarGeometry = new THREE.BoxGeometry(1.5, 8, 1.5);
    const pillarMaterial = new THREE.MeshPhongMaterial({
        color: 0x444444,
        metalness: 0.7,
        roughness: 0.3
    });
    
    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(-alleyWidth/2 + 3, 4, 5);
    archGroup.add(leftPillar);
    
    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(alleyWidth/2 - 3, 4, 5);
    archGroup.add(rightPillar);
    
    // Top arch/lintel
    const archGeometry = new THREE.BoxGeometry(alleyWidth - 4, 1.5, 1.5);
    const archMaterial = new THREE.MeshPhongMaterial({
        color: 0x444444,
        metalness: 0.7,
        roughness: 0.3
    });
    
    const arch = new THREE.Mesh(archGeometry, archMaterial);
    arch.position.set(0, 8.5, 5);
    archGroup.add(arch);
    
    // Load and add the logo ON THE LINTEL
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('textures/logo.png', function(texture) {
        const logoAspect = texture.image.width / texture.image.height;
        const logoWidth = 6.3; // Reduced by 30% from 9 to 6.3
        const logoHeight = logoWidth / logoAspect;
        
        const logoGeometry = new THREE.PlaneGeometry(logoWidth, logoHeight);
        const logoMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        // Position logo on top of the lintel
        logo.position.set(0, 14, 5.4);
        archGroup.add(logo);
    });
    
    // Create sign board - BACK TO ORIGINAL SIZE for just text
    const signGeometry = new THREE.BoxGeometry(alleyWidth - 8, 4, 0.5);
    const signMaterial = new THREE.MeshPhongMaterial({
        color: 0x222222,
        metalness: 0.3,
        roughness: 0.7
    });
    
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 6, 5);
    archGroup.add(sign);
    
    // Add decorative elements to the sign
    const borderGeometry = new THREE.BoxGeometry(alleyWidth - 7.5, 4.5, 0.1);
    const borderMaterial = new THREE.MeshPhongMaterial({
        color: 0x777777,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.set(0, 6, 5.3);
    archGroup.add(border);
    
    // Create dynamic rainbow text
    createRainbowText(archGroup, " DEALTH ALLEY", 0, 6, 5.4);
    
    // Use a single spotlight instead of two for better performance
    const spotlight = new THREE.SpotLight(0xFFFFFF, 1.5);
    spotlight.position.set(0, 10, 2);
    spotlight.target = sign;
    spotlight.angle = 0.5;
    spotlight.penumbra = 0.3;
    spotlight.distance = 15;
    archGroup.add(spotlight);
    
    // Add additional spotlight for the logo - adjusted for new height
    const logoSpotlight = new THREE.SpotLight(0xFFFFFF, 1.0);
    logoSpotlight.position.set(0, 16, 3); // Adjusted for new logo height
    logoSpotlight.target.position.set(0, 14, 5.4); // Updated to match new logo position
    logoSpotlight.angle = 0.3;
    logoSpotlight.penumbra = 0.2;
    logoSpotlight.distance = 10;
    archGroup.add(logoSpotlight);
    archGroup.add(logoSpotlight.target);
    
    // Add skull decorations on top of pillars
    const skullGeometry = new THREE.SphereGeometry(0.8, 8, 8);
    const skullMaterial = new THREE.MeshPhongMaterial({
        color: 0xEEEEEE,
        emissive: 0x333333,
        emissiveIntensity: 0.2
    });
    
    const leftSkull = new THREE.Mesh(skullGeometry, skullMaterial);
    leftSkull.position.set(-alleyWidth/2 + 3, 9, 5);
    archGroup.add(leftSkull);
    
    const rightSkull = new THREE.Mesh(skullGeometry, skullMaterial);
    rightSkull.position.set(alleyWidth/2 - 3, 9, 5);
    archGroup.add(rightSkull);
    
    // Add scene
    scene.add(archGroup);
}

// Update rainbow text with animation
export function updateRainbowText() {
    // Only update every 5 frames to reduce performance impact
    if (!window.rainbowFrameCounter) window.rainbowFrameCounter = 0;
    window.rainbowFrameCounter = (window.rainbowFrameCounter + 1) % 5;
    if (window.rainbowFrameCounter !== 0) return;
    
    if (window.rainbowTextElements) {
        window.rainbowTextElements.forEach(element => {
            if (element.userData && element.userData.update) {
                element.userData.update();
            }
        });
    }
    
    // Update welcome text canvas with rainbow colors
    if (window.welcomeCanvas) {
        const ctx = window.welcomeCanvas.getContext('2d');
        const width = window.welcomeCanvas.width;
        const height = window.welcomeCanvas.height;
        const text = "Welcome to Death Alley";
        
        // Clear the canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set rainbow gradient
        const hue = (Date.now() / 30) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.font = "bold 60px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = `hsl(${(hue + 180) % 360}, 100%, 50%)`;
        ctx.shadowBlur = 10;
        ctx.fillText(text, width / 2, height / 2);
        
        // Update texture
        if (window.welcomeTexture) {
            window.welcomeTexture.needsUpdate = true;
        }
    }

    // Also update the Eiffel Towers animation if they exist
    if (window.eiffelTowers) {
        updateEiffelTowers(window.eiffelTowers);
    }
}

// Create rainbow text that will be animated
function createRainbowText(parent, text, x, y, z) {
    // Set up the canvas for the texture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512; // Reduced from 1024 for better performance
    canvas.height = 128; // Reduced from 256 for better performance
    
    // Text properties
    const fontSize = 50; // Reduced from 80
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Rainbow gradient colors
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#ff0000'); // red
    gradient.addColorStop(0.16, '#ff9900'); // orange
    gradient.addColorStop(0.33, '#ffff00'); // yellow
    gradient.addColorStop(0.5, '#00ff00'); // green
    gradient.addColorStop(0.66, '#0099ff'); // blue
    gradient.addColorStop(0.83, '#6633ff'); // indigo
    gradient.addColorStop(1, '#ff33cc'); // violet
    
    // Fill the background
    context.fillStyle = '#222222';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a glow effect
    context.shadowColor = '#FFFFFF';
    context.shadowBlur = 10; // Reduced from 15
    
    // Draw the text
    context.fillStyle = gradient;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture and material from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
    });
    
    // Create plane with the texture
    const textGeometry = new THREE.PlaneGeometry(30, 7.5);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(x, y, z);
    
    // Add animated rainbow flow effect with optimized update function
    textMesh.userData = {
        canvasContext: context,
        canvasTexture: texture,
        text: text,
        offset: 0,
        update: function() {
            // Move the gradient with larger step for fewer updates
            this.offset = (this.offset + 0.02) % 1;
            
            const gradient = this.canvasContext.createLinearGradient(
                0, 0, canvas.width, 0
            );
            
            gradient.addColorStop((0 + this.offset) % 1, '#ff0000');
            gradient.addColorStop((0.16 + this.offset) % 1, '#ff9900');
            gradient.addColorStop((0.33 + this.offset) % 1, '#ffff00');
            gradient.addColorStop((0.5 + this.offset) % 1, '#00ff00');
            gradient.addColorStop((0.66 + this.offset) % 1, '#0099ff');
            gradient.addColorStop((0.83 + this.offset) % 1, '#6633ff');
            gradient.addColorStop((1 + this.offset) % 1, '#ff33cc');
            
            // Redraw text with new gradient
            this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            this.canvasContext.fillStyle = '#222222';
            this.canvasContext.fillRect(0, 0, canvas.width, canvas.height);
            
            this.canvasContext.shadowColor = '#FFFFFF';
            this.canvasContext.shadowBlur = 10;
            
            this.canvasContext.fillStyle = gradient;
            this.canvasContext.fillText(this.text, canvas.width / 2, canvas.height / 2);
            
            this.canvasTexture.needsUpdate = true;
        }
    };
    
    // Store reference for animation
    if (!window.rainbowTextElements) {
        window.rainbowTextElements = [];
    }
    window.rainbowTextElements.push(textMesh);
    
    parent.add(textMesh);
    return textMesh;
}

// Update function to animate the Eiffel Tower's billboard
function updateEiffelTower(eiffelTower) {
    if (eiffelTower && eiffelTower.billboard) {
        // Rotate the billboard
        eiffelTower.billboard.rotation.y += eiffelTower.billboard.userData.rotationSpeed;
        
        // Add a floating animation
        eiffelTower.billboard.position.y = eiffelTower.billboard.userData.originalY + 
            Math.sin(Date.now() * 0.001) * 0.5;
    }
}

// Update function to animate the Eiffel Towers' billboards
function updateEiffelTowers(towers) {
    if (!towers || !Array.isArray(towers)) return;
    
    for (let i = 0; i < towers.length; i++) {
        const tower = towers[i];
        if (tower && tower.billboard) {
            // Get the billboard group data
            const billboard = tower.billboard;
            const userData = billboard.userData;
            
            // Add a floating animation with tower-specific parameters
            billboard.position.y = userData.originalY + 
                Math.sin(Date.now() * userData.hoverSpeed) * userData.hoverRange;
            
            // Update scrolling text if we have the canvas context
            if (userData.textContext && userData.textCanvas && userData.scrollText) {
                // Clear canvas
                userData.textContext.clearRect(0, 0, userData.textCanvas.width, userData.textCanvas.height);
                
                // Black background
                userData.textContext.fillStyle = '#000033';
                userData.textContext.fillRect(0, 0, userData.textCanvas.width, userData.textCanvas.height);
                
                // Draw border
                const borderGradient = userData.textContext.createLinearGradient(0, 0, userData.textCanvas.width, 0);
                borderGradient.addColorStop(0, '#4400ff');
                borderGradient.addColorStop(0.5, '#00ffff');
                borderGradient.addColorStop(1, '#4400ff');
                
                userData.textContext.strokeStyle = borderGradient;
                userData.textContext.lineWidth = 20;
                userData.textContext.strokeRect(25, 25, userData.textCanvas.width - 50, userData.textCanvas.height - 50);
                
                // Set up text styling
                userData.textContext.font = 'bold 120px Arial';
                userData.textContext.textAlign = 'left';
                userData.textContext.textBaseline = 'middle';
                
                // Calculate scrolling position
                userData.textPosition = (userData.textPosition + userData.scrollSpeed) % userData.textCanvas.width;
                
                // Create text gradient
                const textGradient = userData.textContext.createLinearGradient(0, 0, userData.textCanvas.width, 0);
                textGradient.addColorStop(0, '#00ffff');
                textGradient.addColorStop(0.5, '#ffffff');
                textGradient.addColorStop(1, '#00ffff');
                
                userData.textContext.fillStyle = textGradient;
                
                // Enhanced glowing effect
                userData.textContext.shadowColor = '#00ffff';
                userData.textContext.shadowBlur = 25;
                userData.textContext.shadowOffsetX = 0;
                userData.textContext.shadowOffsetY = 0;
                
                // Draw scrolling text - repeat it to create continuous scroll
                userData.textContext.fillText(userData.scrollText, -userData.textPosition, userData.textCanvas.height/2);
                userData.textContext.fillText(userData.scrollText, userData.textCanvas.width - userData.textPosition, userData.textCanvas.height/2);
                
                // Add secondary glow
                userData.textContext.shadowColor = '#ffffff';
                userData.textContext.shadowBlur = 10;
                userData.textContext.strokeStyle = '#00ffff';
                userData.textContext.lineWidth = 3;
                userData.textContext.strokeText(userData.scrollText, -userData.textPosition, userData.textCanvas.height/2);
                userData.textContext.strokeText(userData.scrollText, userData.textCanvas.width - userData.textPosition, userData.textCanvas.height/2);
                
                // Update texture
                userData.texture.needsUpdate = true;
            }
            
            // Pulse the spotlight
            if (tower.spotLight) {
                tower.spotLight.intensity = 1.2 + Math.sin(Date.now() * 0.002 + i * 0.5) * 0.5;
            }
            
            // Pulse the point light
            if (tower.pointLight) {
                tower.pointLight.intensity = 0.8 + Math.sin(Date.now() * 0.003 + i * 0.7) * 0.4;
            }
        }
    }
}

// Add this function to create atmosphere elements
function createAtmosphere(scene) {
    // Create starfield
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const positions = new Float32Array(starsCount * 3);
    const starSizes = new Float32Array(starsCount);
    
    for (let i = 0; i < starsCount; i++) {
        // Position stars in a large sphere around the scene
        const radius = 500 + Math.random() * 1000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = 100 + Math.random() * 400; // Keep stars above
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        
        // Random star sizes
        starSizes[i] = Math.random() * 2 + 0.5;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2,
        transparent: true,
        opacity: 0.8,
        map: createStarTexture(),
        sizeAttenuation: true
    });
    
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
    
    // Create clouds
    const clouds = new THREE.Group();
    for (let i = 0; i < 30; i++) {
        // Create individual cloud
        const cloudGroup = new THREE.Group();
        const cloudPartsCount = 5 + Math.floor(Math.random() * 5);
        
        for (let j = 0; j < cloudPartsCount; j++) {
            const cloudGeometry = new THREE.SphereGeometry(
                10 + Math.random() * 20, 8, 8);
            const cloudMaterial = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7 + (Math.random() * 0.2),
                emissive: 0x333333,
                flatShading: true
            });
            
            const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial);
            
            // Position parts to form a cloud shape
            cloudPart.position.set(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 20
            );
            
            cloudGroup.add(cloudPart);
        }
        
        // Position each cloud around the scene
        const cloudDistance = 200 + Math.random() * 300;
        const cloudAngle = Math.random() * Math.PI * 2;
        cloudGroup.position.set(
            Math.cos(cloudAngle) * cloudDistance,
            80 + Math.random() * 120,
            Math.sin(cloudAngle) * cloudDistance
        );
        
        // Random cloud scale
        const cloudScale = 0.5 + Math.random() * 2;
        cloudGroup.scale.set(cloudScale, cloudScale, cloudScale);
        
        // Add animation data
        cloudGroup.userData = {
            rotationSpeed: (Math.random() - 0.5) * 0.001,
            moveSpeed: 0.1 + Math.random() * 0.2,
            direction: Math.random() * Math.PI * 2
        };
        
        clouds.add(cloudGroup);
    }
    
    scene.add(clouds);
    
    // Return objects for animation
    return {
        starField,
        clouds
    };
}

// Helper function to create a star texture
function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    
    // Draw a radial gradient
    const gradient = context.createRadialGradient(
        16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(240, 240, 255, 1)');
    gradient.addColorStop(0.8, 'rgba(200, 200, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(200, 200, 255, 0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Add atmospheric animation function
export function updateAtmosphere(atmosphere, tank) {
    if (!atmosphere) return;
    
    // Animate clouds
    atmosphere.clouds.children.forEach(cloud => {
        // Rotate slowly
        cloud.rotation.y += cloud.userData.rotationSpeed;
        
        // Move in its direction
        cloud.position.x += Math.cos(cloud.userData.direction) * cloud.userData.moveSpeed;
        cloud.position.z += Math.sin(cloud.userData.direction) * cloud.userData.moveSpeed;
        
        // Wrap around when too far
        const distance = Math.sqrt(
            cloud.position.x * cloud.position.x + 
            cloud.position.z * cloud.position.z
        );
        
        if (distance > 600) {
            const newAngle = Math.random() * Math.PI * 2;
            const newDistance = 200 + Math.random() * 100;
            cloud.position.x = Math.cos(newAngle) * newDistance;
            cloud.position.z = Math.sin(newAngle) * newDistance;
            
            // Update direction to generally move across the scene
            cloud.userData.direction = (newAngle + Math.PI) + 
                (Math.random() - 0.5) * Math.PI/2;
        }
    });
}

// Create checkpoints for Time Trial mode
export function createCheckpoints(scene, level, gameMode) {
    // Clear any existing checkpoints
    clearCheckpoints(scene);
    
    // Only create checkpoints in Time Trial mode
    if (gameMode !== 'time_trial') return [];
    
    // Calculate base target times in milliseconds based on level
    // Higher levels have tighter time requirements
    const baseTargetTimes = {
        1: 8000, // Level 1: 8 seconds per checkpoint
        2: 7000, // Level 2: 7 seconds per checkpoint
        3: 6000  // Level 3: 6 seconds per checkpoint
    };
    
    const targetTime = baseTargetTimes[level] || 8000;
    
    for (let i = 0; i < CHECKPOINT_POSITIONS.length; i++) {
        const zPosition = CHECKPOINT_POSITIONS[i];
        
        // Adjust target time for this checkpoint based on its position
        // Earlier checkpoints are harder to reach in time
        const adjustedTargetTime = targetTime * ((i + 1) / CHECKPOINT_POSITIONS.length);
        
        // Create the checkpoint
        const checkpoint = createCheckpoint(scene, zPosition, adjustedTargetTime);
        checkpoints.push(checkpoint);
    }
    
    console.log(`Created ${checkpoints.length} checkpoints for level ${level}`);
    return checkpoints;
}

// Create a single checkpoint
function createCheckpoint(scene, zPosition, targetTime) {
    // Create a group to hold all checkpoint elements
    const checkpointGroup = new THREE.Group();
    
    // Create an arch for the checkpoint
    const archWidth = ALLEY_WIDTH - 4; // Leave some space on sides
    const archHeight = 8;
    const archThickness = 0.8;
    
    // Create curved arch using a tube geometry
    const archCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(-archWidth/2, 0, 0),
        new THREE.Vector3(-archWidth/2, archHeight, 0),
        new THREE.Vector3(archWidth/2, archHeight, 0),
        new THREE.Vector3(archWidth/2, 0, 0)
    );
    
    const archGeometry = new THREE.TubeGeometry(archCurve, 20, archThickness, 8, false);
    const archMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00aaaa,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.7
    });
    
    const arch = new THREE.Mesh(archGeometry, archMaterial);
    checkpointGroup.add(arch);
    
    // Add marker pillars on the sides
    const pillarHeight = 8;
    const pillarRadius = 0.6;
    const pillarGeometry = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 8);
    const pillarMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00aaaa,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.8
    });
    
    // Left pillar
    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(-archWidth/2, pillarHeight/2, 0);
    checkpointGroup.add(leftPillar);
    
    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(archWidth/2, pillarHeight/2, 0);
    checkpointGroup.add(rightPillar);
    
    // Add a beam of light under the arch using a cylinder
    const beamHeight = archHeight;
    const beamWidth = archWidth - 4;
    const beamGeometry = new THREE.CylinderGeometry(beamWidth/2, beamWidth/2, 0.1, 32, 1, true);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.rotation.x = Math.PI / 2;
    beam.position.y = beamHeight / 2;
    checkpointGroup.add(beam);
    
    // Add floating text to show the time bonus
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 256;
    textCanvas.height = 128;
    const ctx = textCanvas.getContext('2d');
    
    // Draw the text
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00ffff';
    ctx.fillText(`-${CHECKPOINT_TIME_BONUS/1000}s`, textCanvas.width/2, textCanvas.height/2);
    
    // Create a texture from the canvas
    const textTexture = new THREE.CanvasTexture(textCanvas);
    
    // Create a plane with the texture
    const textGeometry = new THREE.PlaneGeometry(5, 2.5);
    const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, archHeight + 2, 0);
    checkpointGroup.add(textMesh);
    
    // Position the checkpoint
    checkpointGroup.position.set(0, 0, zPosition);
    
    // Create an invisible trigger volume for collision detection
    // This is separate from the visual elements
    const triggerWidth = archWidth - 2; // Slightly smaller than the arch
    const triggerHeight = archHeight * 2; // Taller than the arch to ensure tank passes through
    const triggerDepth = 4; // Increased depth for better detection
    
    const triggerGeometry = new THREE.BoxGeometry(triggerWidth, triggerHeight, triggerDepth);
    // Create an invisible material
    const triggerMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0, // Completely invisible
        depthWrite: false, // Don't write to depth buffer
        depthTest: false, // Don't test against depth buffer
    });
    
    const triggerVolume = new THREE.Mesh(triggerGeometry, triggerMaterial);
    triggerVolume.position.set(0, triggerHeight/2, 0); // Center vertically on the checkpoint
    
    // CRITICAL: Make sure this isn't a physical obstacle and won't cause collisions
    triggerVolume.userData = {
        isTrigger: true,
        noCollision: true,
        isCheckpointTrigger: true,
        passable: true,
        isObstacle: false,
        isCheckpointPart: true
    };
    
    // Don't add the trigger volume as a child of the checkpoint group
    // Add it to the scene separately to avoid it participating in physical collisions
    triggerVolume.position.copy(checkpointGroup.position);
    triggerVolume.position.y = triggerHeight/2; // Adjust vertical position
    scene.add(triggerVolume);
    
    // Add checkpoint data for collision detection
    checkpointGroup.userData = {
        isCheckpoint: true,
        zPosition: zPosition,
        targetTime: targetTime,
        activated: false,
        timeBonus: CHECKPOINT_TIME_BONUS,
        // Reference to the trigger volume
        triggerVolume: triggerVolume,
        passable: true,
        noCollision: true,
        isCheckpointPart: true,
        isObstacle: false
    };
    
    // Also store a reference back to the checkpoint
    triggerVolume.userData.checkpoint = checkpointGroup;
    
    // Create a collision box only for checkpoint detection
    checkpointGroup.userData.triggerBox = new THREE.Box3().setFromObject(triggerVolume);
    
    // Set all objects in checkpoint as non-collidable
    checkpointGroup.traverse(child => {
        if (child.isMesh) {
            // Mark all child meshes as non-obstacle checkpoint parts
            child.userData.isCheckpointPart = true;
            child.userData.passable = true;
            child.userData.noCollision = true;
            child.userData.isObstacle = false;
        }
    });
    
    // Add the checkpoint to the scene
    scene.add(checkpointGroup);
    
    // Make sure checkpoint isn't an obstacle
    markAsCheckpoint(checkpointGroup);
    
    return checkpointGroup;
}

// Update checkpoints (animation, etc)
export function updateCheckpoints(delta) {
    for (const checkpoint of checkpoints) {
        if (!checkpoint || !checkpoint.userData) continue;
        
        // Skip checkpoints that have already been activated
        if (checkpoint.userData.activated) continue;
        
        // Animate checkpoints
        // Rotate the text mesh to always face the camera
        const textMesh = checkpoint.children.find(child => child.geometry && 
            child.geometry.type === 'PlaneGeometry');
        
        if (textMesh) {
            textMesh.rotation.y += delta * 2;
        }
        
        // Pulsate the beam
        const beam = checkpoint.children.find(child => child.geometry && 
            child.geometry.type === 'CylinderGeometry' && 
            child.rotation.x !== 0);
        
        if (beam && beam.material) {
            // Pulsate opacity
            const time = Date.now() * 0.001;
            beam.material.opacity = 0.2 + Math.sin(time * 4) * 0.2;
        }
    }
}

// Check if tank has passed through a checkpoint
export function checkCheckpointCollision(tank, startTime) {
    if (!tank || checkpoints.length === 0) return { collision: false };
    
    // Create a bounding box for the tank
    const tankBox = new THREE.Box3().setFromObject(tank);
    
    // Check collision with each checkpoint's trigger volume
    for (const checkpoint of checkpoints) {
        if (!checkpoint || !checkpoint.userData) continue;
        
        // Skip checkpoints that have already been activated
        if (checkpoint.userData.activated) continue;
        
        // Get the trigger volume for this checkpoint
        const triggerVolume = checkpoint.userData.triggerVolume;
        if (!triggerVolume) continue;
        
        // Update the trigger box
        const triggerBox = new THREE.Box3().setFromObject(triggerVolume);
        
        // Check for collision with the trigger volume
        if (tankBox.intersectsBox(triggerBox)) {
            // Calculate time since level start
            const currentTime = Date.now() - startTime;
            const targetTime = checkpoint.userData.targetTime;
            
            // Calculate time bonus
            let timeBonus = checkpoint.userData.timeBonus;
            
            // If player reaches checkpoint faster than target time, they get the bonus
            const bonusEarned = currentTime <= targetTime;
            
            // Mark checkpoint as activated
            checkpoint.userData.activated = true;
            
            // Change the checkpoint appearance to show it's been activated
            deactivateCheckpoint(checkpoint, bonusEarned);
            
            // Count how many checkpoints have been collected
            const activatedCheckpoints = checkpoints.filter(cp => cp.userData && cp.userData.activated).length;
            const totalCheckpoints = checkpoints.length;
            
            console.log(`Checkpoint activated! ${activatedCheckpoints}/${totalCheckpoints} collected`);
            
            return {
                collision: true,
                timeBonus: bonusEarned ? timeBonus : 0,
                bonusEarned: bonusEarned,
                checkpointIndex: checkpoints.indexOf(checkpoint),
                allCollected: activatedCheckpoints === totalCheckpoints
            };
        }
    }
    
    return { collision: false };
}

// Deactivate checkpoint appearance
function deactivateCheckpoint(checkpoint, bonusEarned) {
    // Change material color based on whether bonus was earned
    const newColor = bonusEarned ? 0x00ff00 : 0xff3300;
    const newEmissive = bonusEarned ? 0x006600 : 0x660000;
    
    // Update all materials in the checkpoint
    checkpoint.traverse(child => {
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    mat.color.set(newColor);
                    if (mat.emissive) mat.emissive.set(newEmissive);
                    mat.opacity = 0.5;
                });
            } else {
                child.material.color.set(newColor);
                if (child.material.emissive) child.material.emissive.set(newEmissive);
                child.material.opacity = 0.5;
            }
        }
    });
    
    // Update the text to show success or failure
    const textMesh = checkpoint.children.find(child => child.geometry && 
        child.geometry.type === 'PlaneGeometry');
    
    if (textMesh && textMesh.material && textMesh.material.map) {
        // Get the canvas from the texture
        const texture = textMesh.material.map;
        const textCanvas = texture.image;
        const ctx = textCanvas.getContext('2d');
        
        // Clear the canvas
        ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
        
        // Draw new text
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (bonusEarned) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText(`-${CHECKPOINT_TIME_BONUS/1000}s`, textCanvas.width/2, textCanvas.height/2);
        } else {
            ctx.fillStyle = '#ff3300';
            ctx.fillText(`Missed!`, textCanvas.width/2, textCanvas.height/2);
        }
        
        // Update the texture
        texture.needsUpdate = true;
    }
}

// Clear all checkpoints
export function clearCheckpoints(scene) {
    if (!scene) {
        console.warn('Scene not provided to clearCheckpoints');
        return;
    }

    for (const checkpoint of checkpoints) {
        if (!checkpoint) continue;
        
        // Remove trigger volume if it exists
        if (checkpoint.userData && checkpoint.userData.triggerVolume) {
            const triggerVolume = checkpoint.userData.triggerVolume;
            if (triggerVolume && triggerVolume.parent) {
                scene.remove(triggerVolume);
            }
        }
        
        // Remove checkpoint if it's still in the scene
        if (checkpoint.parent) {
            scene.remove(checkpoint);
        }
    }
    
    // Clear the checkpoints array
    checkpoints = [];
    console.log('Checkpoints cleared');
}

// Create a perimeter fence to visually indicate the game's boundaries
function createPerimeterFence(scene) {
    // Fence post geometry and material
    const postGeometry = new THREE.CylinderGeometry(0.2, 0.2, 10, 8);
    const postMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x666666,
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Create fence posts
    const postCount = 4;
    const posts = [];
    for (let i = 0; i < postCount; i++) {
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(
            (i < 2 ? -ALLEY_WIDTH/2 : ALLEY_WIDTH/2) + (i % 2) * ALLEY_WIDTH,
            0,
            -LEVEL_LENGTH/2 + (i < 2 ? 0 : LEVEL_LENGTH)
        );
        post.rotation.x = Math.PI/2;
        scene.add(post);
        posts.push(post);
    }
    
    // Create chain link fence panels
    const fenceGeometry = new THREE.BoxGeometry(4.5, 4.5, 0.1);
    const fenceMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7
    });
    
    // Create fence segments
    const fenceSegments = [];
    
    // Function to create a line of fence segments
    function createFenceLine(startX, startZ, endX, endZ, segments) {
        const dx = (endX - startX) / segments;
        const dz = (endZ - startZ) / segments;
        
        for (let i = 0; i <= segments; i++) {
            const x = startX + dx * i;
            const z = startZ + dz * i;
            
            const fence = new THREE.Mesh(fenceGeometry, fenceMaterial);
            fence.position.set(x, 2.25, z);
            
            // Calculate rotation to face the direction of the fence line
            const angle = Math.atan2(endZ - startZ, endX - startX);
            fence.rotation.y = angle;
            
            scene.add(fence);
            fenceSegments.push(fence);
        }
    }
    
    // Number of segments for each side
    const leftRightSegments = Math.ceil(LEVEL_LENGTH / 20);
    const frontBackSegments = Math.ceil((GAME_BOUNDARY.RIGHT - GAME_BOUNDARY.LEFT) / 10);
    
    // Create four sides of the fence (left, right, front, back)
    // Left side fence
    createFenceLine(
        GAME_BOUNDARY.LEFT, GAME_BOUNDARY.START,
        GAME_BOUNDARY.LEFT, GAME_BOUNDARY.END,
        leftRightSegments
    );
    
    // Right side fence
    createFenceLine(
        GAME_BOUNDARY.RIGHT, GAME_BOUNDARY.START,
        GAME_BOUNDARY.RIGHT, GAME_BOUNDARY.END,
        leftRightSegments
    );
    
    // Front fence (near player start)
    createFenceLine(
        GAME_BOUNDARY.LEFT, GAME_BOUNDARY.START,
        GAME_BOUNDARY.RIGHT, GAME_BOUNDARY.START,
        frontBackSegments
    );
    
    // Back fence (at level end)
    createFenceLine(
        GAME_BOUNDARY.LEFT, GAME_BOUNDARY.END,
        GAME_BOUNDARY.RIGHT, GAME_BOUNDARY.END,
        frontBackSegments
    );

    // Create textured ground for the perimeter area
    const perimeterGroundGeometry = new THREE.PlaneGeometry(
        GAME_BOUNDARY.RIGHT - GAME_BOUNDARY.LEFT,
        GAME_BOUNDARY.END - GAME_BOUNDARY.START,
        32, 32  // Added more segments for better normal mapping
    );
    
    // Load textures for the perimeter ground
    const textureLoader = new THREE.TextureLoader();
    
    const dirtTexture = textureLoader.load('textures/ground/dirt_diffuse.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(40, 40);  // Increased repetition for more detail
        texture.encoding = THREE.sRGBEncoding;
    });
    
    const dirtNormalMap = textureLoader.load('textures/ground/dirt_normal.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(40, 40);
    });
    
    const dirtRoughnessMap = textureLoader.load('textures/ground/dirt_roughness.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(40, 40);
    });
    
    const perimeterGroundMaterial = new THREE.MeshStandardMaterial({
        map: dirtTexture,
        normalMap: dirtNormalMap,
        roughnessMap: dirtRoughnessMap,
        normalScale: new THREE.Vector2(2, 2),  // Increased normal map effect
        roughness: 1.0,  // Maximum roughness for dirt
        metalness: 0.0,  // No metalness for dirt
        envMapIntensity: 0.5  // Reduced environment reflection
    });
    
    // Add some vertex displacement for terrain variation
    const positions = perimeterGroundGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        
        // Skip vertices near the alley
        const distanceFromAlley = Math.min(
            Math.abs(x + ALLEY_WIDTH/2),
            Math.abs(x - ALLEY_WIDTH/2)
        );
        
        if (distanceFromAlley > 5) {
            positions.setY(i, (Math.random() * 0.3 - 0.15) * (distanceFromAlley / 20));
        }
    }
    
    perimeterGroundGeometry.computeVertexNormals();
    
    const perimeterGround = new THREE.Mesh(perimeterGroundGeometry, perimeterGroundMaterial);
    perimeterGround.rotation.x = -Math.PI / 2;
    perimeterGround.position.set(
        (GAME_BOUNDARY.LEFT + GAME_BOUNDARY.RIGHT) / 2,
        -0.2, // Slightly lower to avoid z-fighting
        (GAME_BOUNDARY.START + GAME_BOUNDARY.END) / 2
    );
    scene.add(perimeterGround);
    
    // Add more varied rocks and debris in the perimeter area
    const rockColors = [0x666666, 0x555555, 0x444444, 0x333333];
    const rockGeometries = [
        new THREE.DodecahedronGeometry(1, 0),
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.TetrahedronGeometry(1, 0),
        new THREE.OctahedronGeometry(1, 0)
    ];
    
    for (let i = 0; i < 150; i++) {  // Increased number of rocks
        const rockGeometry = rockGeometries[Math.floor(Math.random() * rockGeometries.length)].clone();
        const scale = Math.random() * 0.5 + 0.2;
        rockGeometry.scale(scale, scale * 0.7, scale);  // Flatten rocks slightly
        
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: rockColors[Math.floor(Math.random() * rockColors.length)],
            roughness: 0.8 + Math.random() * 0.2,
            metalness: 0.0,
            envMapIntensity: 0.5
        });
        
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Random position within the perimeter, avoiding the alley
        let x, z;
        do {
            x = GAME_BOUNDARY.LEFT + Math.random() * (GAME_BOUNDARY.RIGHT - GAME_BOUNDARY.LEFT);
            z = GAME_BOUNDARY.START + Math.random() * (GAME_BOUNDARY.END - GAME_BOUNDARY.START);
        } while (
            Math.abs(x) < ALLEY_WIDTH/2 + 5  // Keep rocks away from the alley
        );
        
        rock.position.set(x, 0, z);
        
        // Random rotation
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        scene.add(rock);
    }
    
    return fenceSegments;
}

// Add this function to create and scatter props
function createScatteredProps(scene, alleyWidth, levelLength) {
    const textureLoader = new THREE.TextureLoader();
    
    // Define prop types with their properties (increased sizes by 50%)
    const propTypes = [
        {
            texture: './props/didelta_spinosa.webp',
            width: 12,  // increased by 50%
            height: 12, // increased by 50%
            yOffset: 0,
            colliderSize: { width: 8, height: 8, depth: 8 }, // collision box
            frequency: 1
        },
        {
            texture: './props/namaqualand_boulder_webp',
            width: 18,  // increased by 50%
            height: 12, // increased by 50%
            yOffset: 0,
            colliderSize: { width: 14, height: 10, depth: 14 }, // collision box
            frequency: 0.8
        },
        {
            texture: './props/orth_side.webp',
            width: 30,  // increased by 50%
            height: 24, // increased by 50%
            yOffset: 12,
            colliderSize: { width: 20, height: 20, depth: 20 }, // collision box
            frequency: 0.4
        },
        {
            texture: './props/jacaranda_tree.webp',
            width: 24,  // increased by 50%
            height: 36, // increased by 50%
            yOffset: 18,
            colliderSize: { width: 16, height: 30, depth: 16 }, // collision box
            frequency: 0.6
        },
        {
            texture: './props/grass_bermuda_01.webp',
            width: 9,   // increased by 50%
            height: 6,  // increased by 50%
            yOffset: 0,
            colliderSize: { width: 6, height: 4, depth: 6 }, // collision box
            frequency: 1.2
        }
    ];

    // Reduced number of props per layer by 80%
    const layers = [
        { minDist: alleyWidth/2 + 15, maxDist: alleyWidth/2 + 70, density: 3 },    // Inner ring (reduced from 15)
        { minDist: alleyWidth/2 + 71, maxDist: alleyWidth/2 + 140, density: 5 },   // Middle ring (reduced from 25)
        { minDist: alleyWidth/2 + 141, maxDist: alleyWidth/2 + 250, density: 7 },  // Outer ring (reduced from 35)
        { minDist: alleyWidth/2 + 251, maxDist: alleyWidth/2 + 400, density: 9 }   // Far outer ring (reduced from 45)
    ];

    // Function to get weighted random prop type based on frequency
    function getRandomPropType() {
        const totalFrequency = propTypes.reduce((sum, prop) => sum + prop.frequency, 0);
        let random = Math.random() * totalFrequency;
        
        for (const prop of propTypes) {
            random -= prop.frequency;
            if (random <= 0) return prop;
        }
        return propTypes[0];
    }

    // Function to check if position is too close to existing props
    const usedPositions = [];
    function isTooClose(x, z, minDistance = 25) { // Increased minimum distance for larger props
        return usedPositions.some(pos => {
            const dx = pos.x - x;
            const dz = pos.z - z;
            return Math.sqrt(dx * dx + dz * dz) < minDistance;
        });
    }

    // Store all prop colliders for collision detection
    window.propColliders = window.propColliders || [];

    // Create props for each layer
    layers.forEach(layer => {
        for (let side = -1; side <= 1; side += 2) { // -1 for left side, 1 for right side
            for (let i = 0; i < layer.density; i++) {
                const propType = getRandomPropType();
                
                // Try to find a valid position
                let xPos, zPos;
                let attempts = 0;
                do {
                    const distance = layer.minDist + Math.random() * (layer.maxDist - layer.minDist);
                    zPos = -(Math.random() * (levelLength + 100)) + 50;
                    xPos = side * distance;
                    attempts++;
                } while (isTooClose(xPos, zPos) && attempts < 5);

                // Skip if couldn't find valid position after max attempts
                if (attempts >= 5) continue;

                // Record the position
                usedPositions.push({ x: xPos, z: zPos });

                // Create billboard geometry
                const geometry = new THREE.PlaneGeometry(propType.width, propType.height);
                
                // Load texture for the prop
                const texture = textureLoader.load(propType.texture);
                texture.encoding = THREE.sRGBEncoding;
                
                // Create material with transparency
                const material = new THREE.MeshStandardMaterial({
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    alphaTest: 0.5
                });

                // Create mesh
                const prop = new THREE.Mesh(geometry, material);
                
                // Fixed scale - no random variation
                const scale = 1.5; // Base scale
                prop.scale.set(scale, scale, scale);
                
                // Position the prop
                prop.position.set(xPos, propType.yOffset * scale, zPos);
                
                // Fixed rotation - facing the alley
                prop.rotation.y = (side === 1) ? Math.PI * 0.5 : -Math.PI * 0.5;
                
                // Add collision box
                const colliderGeometry = new THREE.BoxGeometry(
                    propType.colliderSize.width,
                    propType.colliderSize.height,
                    propType.colliderSize.depth
                );
                const colliderMaterial = new THREE.MeshBasicMaterial({
                    visible: false // Invisible collision box
                });
                const collider = new THREE.Mesh(colliderGeometry, colliderMaterial);
                
                // Position collider at the base of the prop
                collider.position.set(
                    prop.position.x,
                    propType.colliderSize.height / 2, // Half height to align with ground
                    prop.position.z
                );
                
                // Add collider to scene and tracking array
                scene.add(collider);
                window.propColliders.push({
                    mesh: collider,
                    size: propType.colliderSize,
                    type: 'prop'
                });
                
                scene.add(prop);
            }
        }
    });
}

// Add collision check function
export function checkPropCollisions(object) {
    if (!window.propColliders) return false;

    const objectBox = new THREE.Box3().setFromObject(object);
    
    for (const propCollider of window.propColliders) {
        const propBox = new THREE.Box3().setFromObject(propCollider.mesh);
        if (objectBox.intersectsBox(propBox)) {
            return true;
        }
    }
    
    return false;
}

// Add new function for spawning speed power-ups along the track
function spawnTimeTrialSpeedBoosts(scene, level) {
    const checkpointSpacing = 200; // Base spacing between checkpoints
    const powerupsPerSection = 8; // Increased from 3 to 8 power-ups between checkpoints
    
    // Calculate total track length based on level
    const trackLength = level * checkpointSpacing;
    
    // Spawn power-ups between checkpoints in zigzag pattern
    for (let z = -50; z >= -trackLength + 50; z -= checkpointSpacing / powerupsPerSection) {
        // Create power-ups in a zigzag pattern
        const xOffset = Math.sin(z * 0.05) * 15; // Zigzag with 15 units amplitude
        
        const position = new THREE.Vector3(
            xOffset,
            1, // Height above ground
            z
        );
        
        const speedBoost = createSpawnItem('SPEED', position);
        if (speedBoost) {
            scene.add(speedBoost);
            spawnedItems.push(speedBoost);
        }
    }
    
    // Add additional power-ups in a parallel zigzag pattern (offset from first pattern)
    for (let z = -100; z >= -trackLength; z -= checkpointSpacing / powerupsPerSection) {
        // Create power-ups in opposite zigzag pattern
        const xOffset = Math.sin((z * 0.05) + Math.PI) * 15; // Opposite phase zigzag
        
        const position = new THREE.Vector3(
            xOffset,
            1, // Height above ground
            z
        );
        
        const speedBoost = createSpawnItem('SPEED', position);
        if (speedBoost) {
            scene.add(speedBoost);
            spawnedItems.push(speedBoost);
        }
    }
}

// Helper function to create scary props
function createScaryProp(type, textureLoader) {
    const propGeometry = new THREE.BoxGeometry(5, 8, 5);
    const texture = textureLoader.load(`props/${type}.jpg`);
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.2,
        emissive: 0x330000,
        emissiveIntensity: 0.2
    });
    
    const prop = new THREE.Mesh(propGeometry, material);
    
    // Add subtle animation
    prop.userData.animationOffset = Math.random() * Math.PI * 2;
    prop.userData.animate = function(time) {
        if (type.includes('floating')) {
            prop.position.y = Math.sin(time * 0.001 + this.animationOffset) * 0.5 + 4;
        }
        if (type.includes('rotating')) {
            prop.rotation.y = time * 0.0005 + this.animationOffset;
        }
    };
    
    return prop;
}