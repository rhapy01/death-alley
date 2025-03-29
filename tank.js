import { createProjectile } from './combat.js'; // Import for shooting
import { isAtUTurnPoint, GAME_BOUNDARY } from './environment.js';
import { recordShot } from './replay.js';

// Add these constants at the top with other constants
const LANE_CENTERS = [-15, 0, 15]; // Wider spacing between lanes
const LANE_WIDTH = 8; // Wider lanes
const HALF_TANK_WIDTH = 3.0; // Updated for twice as big tank
const ALLEY_WIDTH = 40; // Increased alley width

// Physics constants
const MAX_SPEED = 0.9; // Increased from 0.8
const ACCELERATION = 0.06; // Doubled from 0.02
const DECELERATION = 0.008; // Increased from 0.01
const BRAKE_DECELERATION = 0.06; // Increased from 0.03
const REVERSE_MAX_SPEED = 0.6; // Increased from 0.4
const MIN_TURNING_SPEED = 0.05; // Speed at which turning is least effective

// Add camera zoom settings with min and max limits
const CAMERA_SETTINGS = {
    defaultDistance: 30,
    minDistance: 15,    // Closest zoom
    maxDistance: 60,    // Furthest zoom
    zoomSpeed: 1,       // How fast zoom changes
    defaultHeight: 25
};

// Camera swipe settings - renamed to LOOK_AROUND for clarity
const LOOK_AROUND = {
    isActive: false,          // Whether look mode is currently toggled on
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    maxOffsetX: 100,          // Increased for full 360-degree horizontal rotation
    maxOffsetY: 40,           // Increased for better vertical viewing
    sensitivity: 1.2,         // Increased for more responsive camera movement
    returnSpeed: 0.02,        // How fast camera returns to center when not dragging
    angleX: 0,                // Store horizontal rotation angle (in radians)
    angleY: 0                 // Store vertical rotation angle (in radians)
};

export function createTank(scene) {
    const tankGroup = new THREE.Group();
    
    // Car body - lower, longer, and more aerodynamic
    const bodyGeometry = new THREE.BoxGeometry(3.0, 1.0, 5.0);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2266dd,
        metalness: 0.8,
        roughness: 0.2,
        envMap: scene.background,
        emissive: 0x112233,
        emissiveIntensity: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    tankGroup.add(body);
    tankGroup.body = body;

    // Add chrome trim details
    const trimGeometry = new THREE.BoxGeometry(3.2, 0.1, 5.2);
    const trimMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        metalness: 1.0,
        roughness: 0.1,
        envMap: scene.background
    });
    const trim = new THREE.Mesh(trimGeometry, trimMaterial);
    trim.position.y = 0.85;
    tankGroup.add(trim);

    // Add aerodynamic hood with racing stripe
    const hoodGeometry = new THREE.BoxGeometry(2.8, 0.4, 1.2);
    const hoodMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2266dd,
        metalness: 0.8,
        roughness: 0.2
    });
    const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
    hood.position.set(0, 1.2, -1.8);
    tankGroup.add(hood);

    // Add racing stripe
    const stripeGeometry = new THREE.BoxGeometry(0.4, 0.41, 1.3);
    const stripeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0x444444,
        emissiveIntensity: 0.3
    });
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.position.set(0, 1.2, -1.8);
    tankGroup.add(stripe);

    // Add carbon fiber spoiler
    const spoilerGeometry = new THREE.BoxGeometry(3.2, 0.2, 0.5);
    const spoilerMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x111111,
        metalness: 0.9,
        roughness: 0.3,
        emissive: 0x222222,
        emissiveIntensity: 0.1
    });
    const spoiler = new THREE.Mesh(spoilerGeometry, spoilerMaterial);
    spoiler.position.set(0, 1.4, 2.2);
    tankGroup.add(spoiler);

    // Add LED-illuminated spoiler supports
    const supportGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.3);
    const supportMaterial = new THREE.MeshPhongMaterial({
        color: 0x111111,
        emissive: 0x0066ff,
        emissiveIntensity: 0.5
    });
    const leftSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    leftSupport.position.set(-1.4, 1.2, 2.2);
    tankGroup.add(leftSupport);
    const rightSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    rightSupport.position.set(1.4, 1.2, 2.2);
    tankGroup.add(rightSupport);

    // High-tech turret with glowing elements
    const turretGeometry = new THREE.CylinderGeometry(0.7, 0.8, 0.5, 8);
    const turretMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x0066ff,
        emissiveIntensity: 0.3
    });
    const turret = new THREE.Mesh(turretGeometry, turretMaterial);
    turret.position.y = 1.7;
    turret.position.z = 0;
    turret.rotation.x = Math.PI / 2;
    tankGroup.add(turret);
    tankGroup.turret = turret;

    // Add turret ring with glowing accent
    const turretRingGeometry = new THREE.TorusGeometry(0.85, 0.05, 8, 24);
    const turretRingMaterial = new THREE.MeshPhongMaterial({
        color: 0x0066ff,
        emissive: 0x0066ff,
        emissiveIntensity: 0.7
    });
    const turretRing = new THREE.Mesh(turretRingGeometry, turretRingMaterial);
    turretRing.position.y = 1.7;
    turretRing.rotation.x = Math.PI / 2;
    tankGroup.add(turretRing);

    // Advanced barrel with cooling vents
    const barrelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.8, 8);
    const barrelMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x111111,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x222222,
        emissiveIntensity: 0.2
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.z = -1.8;
    barrel.position.y = 1.7;
    barrel.rotation.x = Math.PI / 2;
    tankGroup.add(barrel);
    tankGroup.barrel = barrel;

    // Add cooling vents to barrel
    const ventGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.1);
    const ventMaterial = new THREE.MeshPhongMaterial({
        color: 0x444444,
        emissive: 0x0066ff,
        emissiveIntensity: 0.3
    });
    for (let i = 0; i < 5; i++) {
        const vent = new THREE.Mesh(ventGeometry, ventMaterial);
        vent.position.set(0, 1.7, -1.2 - (i * 0.4));
        tankGroup.add(vent);
    }

    // Add tinted windshield with holographic HUD effect
    const windshieldGeometry = new THREE.BoxGeometry(2.6, 0.8, 0.1);
    const windshieldMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x88ccff,
        transparent: true,
        opacity: 0.7,
        emissive: 0x0066ff,
        emissiveIntensity: 0.2
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, 1.4, -0.8);
    windshield.rotation.x = Math.PI / 8;
    tankGroup.add(windshield);

    // Create high-performance wheels with glowing rims
    const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x111111,
        metalness: 0.9,
        roughness: 0.3
    });
    const rimMaterial = new THREE.MeshPhongMaterial({
        color: 0x0066ff,
        emissive: 0x0066ff,
        emissiveIntensity: 0.5
    });

    const wheelPositions = [
        { x: -1.6, y: 0.6, z: 1.8 },  // Back left
        { x: 1.6, y: 0.6, z: 1.8 },   // Back right
        { x: -1.6, y: 0.6, z: -1.8 }, // Front left
        { x: 1.6, y: 0.6, z: -1.8 }   // Front right
    ];

    wheelPositions.forEach(pos => {
        // Main wheel
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos.x, pos.y, pos.z);
        wheel.rotation.z = Math.PI / 2;
        tankGroup.add(wheel);
        
        // Glowing rim
        const rimGeometry = new THREE.TorusGeometry(0.6, 0.05, 8, 16);
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.position.set(pos.x, pos.y, pos.z);
        rim.rotation.x = Math.PI / 2;
        tankGroup.add(rim);
    });

    // Add ground effect lighting
    const glowGeometry = new THREE.PlaneGeometry(5, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x0066ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const groundGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    groundGlow.position.y = 0.1;
    groundGlow.rotation.x = -Math.PI / 2;
    tankGroup.add(groundGlow);
    
    tankGroup.position.z = 0;
    tankGroup.health = 100;
    
    // Initialize userData with physics properties
    tankGroup.userData = {
        speedBoost: 1,
        attackBoost: 1,
        currentSpeed: 0, // Current speed value
        velocity: 0, // Actual velocity value used for calculations
        direction: 1, // 1 for forward, -1 for reverse
        isAccelerating: false,
        isBraking: false,
        lastMoveDirection: 1, // Track last direction to handle direction changes
        cameraDistance: CAMERA_SETTINGS.defaultDistance
    };
    
    scene.add(tankGroup);
    return tankGroup;
}

// Define key constants - add 'l' for Look Around toggle
const keys = { 
    'ArrowUp': false,
    'ArrowDown': false,
    'ArrowLeft': false,
    'ArrowRight': false,
    ' ': false,  // Space character
    'q': false,  // Zoom in
    'e': false,  // Zoom out
    'a': false,  // Rotate turret left
    'd': false,  // Rotate turret right
    'l': false   // Look Around toggle
};
let mouseX = 0, mouseY = 0;
let touchAimActive = false;
let isMobileDevice = false;
const speed = 0.4;
const rotationSpeed = 0.04;
let lastShotTime = 0;
const shootCooldown = 100; // Reduced cooldown to 100ms for automatic fire

// Function to check if the device is mobile
function detectMobile() {
    // Regular expression for common mobile devices
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    
    // Check if it's an iPad specifically (newer iPads may not identify as iPad in user agent)
    const isIPad = navigator.maxTouchPoints > 1 && 
                  navigator.platform === 'MacIntel' &&
                  !window.MSStream;
                  
    // Check if device supports touch
    const isTouch = 'ontouchstart' in window || 
                   navigator.maxTouchPoints > 0 ||
                   navigator.msMaxTouchPoints > 0;
    
    return mobileRegex.test(navigator.userAgent) || isIPad || isTouch;
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    isMobileDevice = detectMobile();
});

window.addEventListener('keydown', (e) => {
    if (e.key === ' ') keys[' '] = true;  // Handle space specifically
    else if (e.key.toLowerCase() === 'q') keys['q'] = true;  // Zoom in
    else if (e.key.toLowerCase() === 'e') keys['e'] = true;  // Zoom out
    else if (e.key.toLowerCase() === 'a') keys['a'] = true;  // Turret left
    else if (e.key.toLowerCase() === 'd') keys['d'] = true;  // Turret right
    else if (e.key.toLowerCase() === 'l') {
        // Toggle Look Around mode on key press (not hold)
        if (!keys['l']) {
            LOOK_AROUND.isActive = !LOOK_AROUND.isActive;
            
            // Show feedback when Look Around is toggled
            showLookAroundFeedback(LOOK_AROUND.isActive);
            
            console.log('Look Around mode:', LOOK_AROUND.isActive ? 'ON' : 'OFF');
        }
        keys['l'] = true;
    }
    else if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === ' ') keys[' '] = false;  // Handle space specifically
    else if (e.key.toLowerCase() === 'q') keys['q'] = false;  // Zoom in
    else if (e.key.toLowerCase() === 'e') keys['e'] = false;  // Zoom out
    else if (e.key.toLowerCase() === 'a') keys['a'] = false;  // Turret left
    else if (e.key.toLowerCase() === 'd') keys['d'] = false;  // Turret right
    else if (e.key.toLowerCase() === 'l') keys['l'] = false;  // Look Around toggle
    else if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Function to display feedback when Look Around mode is toggled
function showLookAroundFeedback(isActive) {
    // Check if feedback element already exists
    let lookFeedback = document.getElementById('look-around-feedback');
    
    // Create it if it doesn't exist
    if (!lookFeedback) {
        lookFeedback = document.createElement('div');
        lookFeedback.id = 'look-around-feedback';
        lookFeedback.style.position = 'absolute';
        lookFeedback.style.top = '80px';
        lookFeedback.style.left = '50%';
        lookFeedback.style.transform = 'translateX(-50%)';
        lookFeedback.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        lookFeedback.style.color = '#00ffff';
        lookFeedback.style.padding = '10px 20px';
        lookFeedback.style.borderRadius = '5px';
        lookFeedback.style.fontFamily = 'Arial, sans-serif';
        lookFeedback.style.fontWeight = 'bold';
        lookFeedback.style.zIndex = '1000';
        lookFeedback.style.pointerEvents = 'none'; // Don't block mouse events
        lookFeedback.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(lookFeedback);
    }
    
    // Update the feedback text and make it visible
    if (isActive) {
        lookFeedback.textContent = 'LOOK AROUND: ON - Move mouse for 360° view, press L to exit';
        lookFeedback.style.opacity = '1';
        lookFeedback.style.borderTop = '2px solid #00ffff';
        lookFeedback.style.borderBottom = '2px solid #00ffff';
        lookFeedback.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.5)';
    } else {
        lookFeedback.textContent = 'LOOK AROUND: OFF';
        lookFeedback.style.opacity = '1';
        
        // Reset angles when disabling Look Around
        LOOK_AROUND.angleX = 0;
        LOOK_AROUND.angleY = 0;
        
        // Fade out feedback after a delay when turning off Look Around
        setTimeout(() => {
            lookFeedback.style.opacity = '0';
        }, 1500);
    }
}

// Setup mouse event handlers for the Look Around feature
function setupLookAroundControls() {
    // Remove any existing event listeners first
    window.removeEventListener('mousemove', handleMouseMove);
    
    // Add fresh event listeners
    window.addEventListener('mousemove', handleMouseMove);
}

// Mouse event handler for looking around
function handleMouseMove(e) {
    // Update mouse position for aiming (used for turret aim)
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    
    // Only handle camera look movement if Look Around is active
    if (LOOK_AROUND.isActive) {
        // If first movement after activating Look Around, set start position
        if (!LOOK_AROUND.isDragging) {
            LOOK_AROUND.startX = e.clientX;
            LOOK_AROUND.startY = e.clientY;
            LOOK_AROUND.isDragging = true;
            
            // Reset angles when starting a new look
            if (Math.abs(LOOK_AROUND.angleX) < 0.01 && Math.abs(LOOK_AROUND.angleY) < 0.01) {
                LOOK_AROUND.angleX = 0;
                LOOK_AROUND.angleY = 0;
            }
        }
        
        // Calculate the mouse movement since start position
        const deltaX = (e.clientX - LOOK_AROUND.startX) * LOOK_AROUND.sensitivity * 0.01;
        const deltaY = (e.clientY - LOOK_AROUND.startY) * LOOK_AROUND.sensitivity * 0.01;
        
        // Update the rotation angles
        LOOK_AROUND.angleX += deltaX;
        LOOK_AROUND.angleY = Math.max(-0.7, Math.min(0.7, LOOK_AROUND.angleY + deltaY));
        
        // Reset start position for smooth continuous movement
        LOOK_AROUND.startX = e.clientX;
        LOOK_AROUND.startY = e.clientY;
        
        console.log('Look Around angles:', 
            {angleX: LOOK_AROUND.angleX * (180/Math.PI), angleY: LOOK_AROUND.angleY * (180/Math.PI)});
    } else {
        // Reset dragging state when Look Around is inactive
        LOOK_AROUND.isDragging = false;
    }
}

// Initialize the Look Around controls
setupLookAroundControls();

// Export function to initialize in main game
export function initLookAroundControls() {
    setupLookAroundControls();
    
    // Create initial hidden feedback element
    const lookFeedback = document.createElement('div');
    lookFeedback.id = 'look-around-feedback';
    lookFeedback.style.position = 'absolute';
    lookFeedback.style.top = '80px';
    lookFeedback.style.left = '50%';
    lookFeedback.style.transform = 'translateX(-50%)';
    lookFeedback.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    lookFeedback.style.color = '#00ffff';
    lookFeedback.style.padding = '10px 20px';
    lookFeedback.style.borderRadius = '5px';
    lookFeedback.style.fontFamily = 'Arial, sans-serif';
    lookFeedback.style.fontWeight = 'bold';
    lookFeedback.style.zIndex = '1000';
    lookFeedback.style.pointerEvents = 'none';
    lookFeedback.style.opacity = '0';
    lookFeedback.style.transition = 'opacity 0.3s ease';
    lookFeedback.textContent = 'LOOK AROUND: OFF';
    document.body.appendChild(lookFeedback);
}

// Touch events for aiming and camera control on mobile devices
window.addEventListener('touchstart', (e) => {
    // Ignore touch events on control buttons
    if (e.target.closest('#mobile-controls')) return;
    
    // Use two finger touch for camera panning
    if (e.touches.length >= 2) {
        LOOK_AROUND.isDragging = true;
        LOOK_AROUND.startX = e.touches[0].clientX;
        LOOK_AROUND.startY = e.touches[0].clientY;
        e.preventDefault(); // Prevent scrolling
        return;
    }
    
    // Single touch for aiming
    // Prevent default to avoid zooming/scrolling on iPad
    e.preventDefault();
    
    touchAimActive = true;
    const touch = e.touches[0];
    mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    // Ignore touch events on control buttons
    if (e.target.closest('#mobile-controls')) return;
    
    // Handle camera panning with two fingers
    if (LOOK_AROUND.isDragging && e.touches.length >= 2) {
        const deltaX = e.touches[0].clientX - LOOK_AROUND.startX;
        const deltaY = e.touches[0].clientY - LOOK_AROUND.startY;
        
        LOOK_AROUND.offsetX = Math.max(-LOOK_AROUND.maxOffsetX, 
            Math.min(LOOK_AROUND.maxOffsetX, -deltaX * LOOK_AROUND.sensitivity));
        LOOK_AROUND.offsetY = Math.max(-LOOK_AROUND.maxOffsetY, 
            Math.min(LOOK_AROUND.maxOffsetY, deltaY * LOOK_AROUND.sensitivity));
        
        e.preventDefault(); // Prevent scrolling
        return;
    }
    
    // Single touch for aiming
    // Prevent default to avoid zooming/scrolling on iPad
    e.preventDefault();
    
    if (touchAimActive) {
        const touch = e.touches[0];
        mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    // Prevent default to avoid zooming/scrolling on iPad
    e.preventDefault();
    
    // If less than 2 fingers, stop camera panning
    if (e.touches.length < 2) {
        LOOK_AROUND.isDragging = false;
    }
    
    // If no fingers, stop aiming
    if (e.touches.length === 0) {
        touchAimActive = false;
    }
}, { passive: false });

export function updateTank(tank, delta, scene, camera) {
    const currentTime = Date.now();
    
    // Store previous position and rotation
    const previousPosition = tank.position.clone();
    const previousRotation = tank.rotation.y;
    
    // Get current max speed with boost applied
    const boostedMaxSpeed = MAX_SPEED * (tank.userData.speedBoost || 1);
    const boostedReverseMaxSpeed = REVERSE_MAX_SPEED * (tank.userData.speedBoost || 1);
    
    // Check accelerating/braking flags based on key presses
    tank.userData.isAccelerating = false;
    tank.userData.isBraking = false;
    
    // Handle acceleration
    if (keys.ArrowUp) {
        tank.userData.isAccelerating = true;
        
        // If we were going backwards, apply brakes first
        if (tank.userData.velocity < 0) {
            tank.userData.velocity += BRAKE_DECELERATION;
            tank.userData.isBraking = true;
            
            // If nearly stopped, reset to zero to prevent jitter
            if (tank.userData.velocity > -0.01) {
                tank.userData.velocity = 0;
            }
        } 
        // Normal acceleration forward
        else {
            tank.userData.direction = 1;
            tank.userData.velocity = Math.min(boostedMaxSpeed, tank.userData.velocity + ACCELERATION);
        }
    }
    // Handle braking/reversing
    else if (keys.ArrowDown) {
        tank.userData.isAccelerating = true;
        
        // If we were going forwards, apply brakes first
        if (tank.userData.velocity > 0) {
            tank.userData.velocity -= BRAKE_DECELERATION;
            tank.userData.isBraking = true;
            
            // If nearly stopped, reset to zero to prevent jitter
            if (tank.userData.velocity < 0.01) {
                tank.userData.velocity = 0;
            }
        } 
        // Normal acceleration backward
        else {
            tank.userData.direction = -1;
            tank.userData.velocity = Math.max(-boostedReverseMaxSpeed, tank.userData.velocity - ACCELERATION);
        }
    }
    // Decelerate when no movement keys are pressed
    else {
        if (Math.abs(tank.userData.velocity) < DECELERATION) {
            // If very slow, just stop completely
            tank.userData.velocity = 0;
        } else if (tank.userData.velocity > 0) {
            // Slow down when going forward
            tank.userData.velocity -= DECELERATION;
        } else if (tank.userData.velocity < 0) {
            // Slow down when going backward
            tank.userData.velocity += DECELERATION;
        }
    }
    
    // Calculate turn effectiveness based on speed - slower speed = sharper turns
    const turnEffectiveness = 1 - Math.min(1, Math.abs(tank.userData.velocity) / MIN_TURNING_SPEED);
    
    // Handle vehicle rotation (U-turn)
    const effectiveRotationSpeed = rotationSpeed * (1 + turnEffectiveness * 0.5);
    
    if (keys.ArrowLeft) {
        tank.rotation.y += effectiveRotationSpeed;
        // No longer rotating turret with the tank - allows independent aiming
    }
    if (keys.ArrowRight) {
        tank.rotation.y -= effectiveRotationSpeed;
        // No longer rotating turret with the tank - allows independent aiming
    }
    
    // Updated turret aiming logic - works with both mouse and touch
    if (isMobileDevice) {
        // On mobile, we'll use the last mouseX/mouseY (from touch) to aim the turret
        if (touchAimActive || mouseX !== 0 || mouseY !== 0) {
            // Convert mouse/touch position to world coordinates
            const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
            vector.unproject(camera);
            
            // Calculate direction vector
            const direction = vector.sub(camera.position).normalize();
            
            // Calculate the intersection with XZ plane (y=0)
            const distance = -camera.position.y / direction.y;
            const targetPosition = camera.position.clone().add(direction.multiplyScalar(distance));
            
            // Calculate the angle to the target
            const targetAngle = Math.atan2(
                tank.position.x - targetPosition.x,
                tank.position.z - targetPosition.z
            );
            
            // Update turret rotation to aim at touch/mouse position
            // Adjust for tank's rotation
            tank.turret.rotation.y = targetAngle - tank.rotation.y;
            tank.barrel.rotation.y = tank.turret.rotation.y;
        }
    } else {
        // For non-mobile, use A/D keys or existing aiming logic
    if (keys.a) {
        // Rotate turret left
        tank.turret.rotation.y += 0.05;
        tank.barrel.rotation.y += 0.05;
    }
    if (keys.d) {
        // Rotate turret right
        tank.turret.rotation.y -= 0.05;
        tank.barrel.rotation.y -= 0.05;
        }
        
        // Also allow mouse aiming on desktop
        if (mouseX !== 0 || mouseY !== 0) {
            // Convert mouse position to world coordinates
            const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
            vector.unproject(camera);
            
            // Calculate direction vector
            const direction = vector.sub(camera.position).normalize();
            
            // Calculate the intersection with XZ plane (y=0)
            const distance = -camera.position.y / direction.y;
            const targetPosition = camera.position.clone().add(direction.multiplyScalar(distance));
            
            // Calculate the angle to the target
            const targetAngle = Math.atan2(
                tank.position.x - targetPosition.x,
                tank.position.z - targetPosition.z
            );
            
            // Update turret rotation to aim at mouse position
            // Adjust for tank's rotation
            tank.turret.rotation.y = targetAngle - tank.rotation.y;
            tank.barrel.rotation.y = tank.turret.rotation.y;
        }
    }
    
    // Move tank based on current velocity and direction
    if (tank.userData.velocity !== 0) {
        // Ensure velocity isn't being dampened unexpectedly
        if (Math.abs(tank.userData.velocity) > 0.001 && !tank.userData.isBraking) {
            const currentDirection = tank.userData.velocity > 0 ? 1 : -1;
            if (currentDirection === tank.userData.direction) {
                // Only preserve velocity in the intended direction
                // This prevents unexpected velocity changes
                tank.userData.velocity = Math.abs(tank.userData.velocity) * currentDirection;
            }
        }
        
        const moveZ = Math.cos(tank.rotation.y) * tank.userData.velocity;
        const moveX = Math.sin(tank.rotation.y) * tank.userData.velocity;
        
        // Calculate new position
        const newX = tank.position.x - moveX;
        const newZ = tank.position.z - moveZ;
        
        // Check if the new position is within the game boundaries
        let isWithinBoundary = true;
        
        // Check X boundaries
        if (newX < GAME_BOUNDARY.LEFT + 2) { // Add offset for tank size
            tank.position.x = GAME_BOUNDARY.LEFT + 2;
            isWithinBoundary = false;
        } else if (newX > GAME_BOUNDARY.RIGHT - 2) { // Add offset for tank size
            tank.position.x = GAME_BOUNDARY.RIGHT - 2;
            isWithinBoundary = false;
        }
        
        // Check Z boundaries
        if (newZ < GAME_BOUNDARY.END + 2) { // Add offset for tank size
            tank.position.z = GAME_BOUNDARY.END + 2;
            isWithinBoundary = false;
        } else if (newZ > GAME_BOUNDARY.START - 2) { // Add offset for tank size
            tank.position.z = GAME_BOUNDARY.START - 2;
            isWithinBoundary = false;
        }
        
        // Only update position if within boundaries
        if (isWithinBoundary) {
            tank.position.x = newX;
            tank.position.z = newZ;
        } else {
            // Slow down when hitting boundary
            tank.userData.velocity *= 0.5;
        }
        
        // Store current speed in km/h for the speedometer
        tank.userData.currentSpeed = Math.abs(tank.userData.velocity) * 100;
        if (tank.userData.velocity < 0) {
            tank.userData.currentSpeed *= -1;
        }
        
        // Check for collisions with enemies after movement
        try {
            const tankBox = new THREE.Box3().setFromObject(tank);
            // Find all enemies with userData.box
            const enemies = scene.children.filter(child => 
                child.userData && child.userData.box && child !== tank);
            
            let hasCollision = false;
            for (const enemy of enemies) {
                // Make sure enemy has a valid bounding box
                if (!enemy.userData.box) {
                    try {
                        enemy.userData.box = new THREE.Box3().setFromObject(enemy);
                    } catch (e) {
                        console.warn("Could not create box for enemy in tank collision check");
                        continue;
                    }
                }
                
                try {
                    if (tankBox.intersectsBox(enemy.userData.box)) {
                        hasCollision = true;
                        
                        // Skip collision handling for obstacles - they handle their own collisions
                        if (enemy.userData && enemy.userData.isObstacle) {
                            continue;
                        }
                        
                        // Collision detected, revert to previous position
                        tank.position.copy(previousPosition);
                        
                        // Calculate whether this is a head-on collision
                        const collisionDirection = new THREE.Vector3()
                            .subVectors(enemy.position, tank.position)
                            .normalize();
                            
                        // Get tank's forward direction
                        const tankForward = new THREE.Vector3(0, 0, -1)
                            .applyQuaternion(tank.quaternion)
                            .normalize();
                            
                        // Calculate dot product to determine if head-on
                        const headOnFactor = Math.abs(collisionDirection.dot(tankForward));
                        
                        // Add push back effect with extra force for head-on collisions
                        const pushDirection = collisionDirection.clone()
                            .multiplyScalar(0.5 + headOnFactor * 0.5);
                            
                        // Ensure the push direction isn't pushing enemies downward
                        pushDirection.y = 0;
                            
                        // Push the player back
                        tank.position.add(pushDirection.clone().multiplyScalar(-0.5));
                        tank.position.y = 1.0; // Ensure player stays at correct height
                        
                        // Push the enemy more based on velocity and head-on factor
                        const enemyPushStrength = 0.7 + (Math.abs(tank.userData.velocity) * headOnFactor);
                        enemy.position.add(pushDirection.clone().multiplyScalar(enemyPushStrength));
                        
                        // Force enemy to stay at correct height
                        enemy.position.y = 1.0;
                        
                        // Make sure the enemy is still in the scene
                        if (!enemy.parent) {
                            scene.add(enemy);
                            console.log("Re-added enemy to scene after tank collision");
                        }
                        
                        // Force update of enemy bounding box
                        try {
                            enemy.userData.box.setFromObject(enemy);
                        } catch (e) {
                            console.warn("Could not update enemy box after collision");
                        }
                        
                        break;
                    }
                } catch (e) {
                    console.warn("Error during tank-enemy collision check:", e);
                }
            }
            
            // If collision occurred, reduce velocity
            if (hasCollision) {
                tank.userData.velocity *= 0.5;
            }
        } catch (e) {
            console.warn("Error in tank collision detection:", e);
        }
    } else {
        // Not moving
        tank.userData.currentSpeed = 0;
    }
    
    // Spin wheels based on speed
    tank.children.forEach(child => {
        if (child !== tank.turret && child !== tank.barrel && child !== tank.body) {
            child.rotation.x += tank.userData.velocity * 0.5;
        }
    });
    
    // Allow free exploration with a larger boundary - removed the strict alley boundaries
    // to allow exploring the towers outside the alley
    const explorationLimit = ALLEY_WIDTH * 4; // Much larger boundary to see the towers
    if (Math.abs(tank.position.x) > explorationLimit || Math.abs(tank.position.z) > 2000) {
        // Only restrict movement if very far outside the map
        tank.position.copy(previousPosition);
        tank.userData.velocity *= 0.5;
    }
    
    tank.position.y = 1.0; // Keep grounded - adjusted for bigger tank height
    
    // Simple shooting, independent of movement - allow shooting while driving
    if (keys[' '] && currentTime - lastShotTime >= shootCooldown) {
        // Store the velocity before creating the projectile
        const currentVelocity = tank.userData.velocity;
        const currentDirection = tank.userData.direction;
        const currentAccelerating = tank.userData.isAccelerating;
        const currentSpeed = tank.userData.currentSpeed;
        
        // Calculate shooting direction based on turret's rotation, not vehicle's rotation
        const turretWorldRotation = new THREE.Euler().copy(tank.rotation);
        turretWorldRotation.y += tank.turret.rotation.y;
        
        // Direction needs to be flipped to match the way the barrel is pointing (-z)
        const direction = new THREE.Vector3(
            Math.sin(turretWorldRotation.y) * -1,
            0,  // Shoot straight, no vertical angle
            Math.cos(turretWorldRotation.y) * -1
        ).normalize();
        
        // Get the barrel's world position
        // The barrel is positioned at z = -1.8 (negative z is forward)
        
        // Calculate barrel tip position (end of barrel)
        const barrelLength = 1.4;
        const barrelOffset = new THREE.Vector3(0, 0, -barrelLength);
        barrelOffset.applyEuler(turretWorldRotation);
        
        // Start position at barrel tip
        const startPos = new THREE.Vector3();
        startPos.copy(tank.position);  // Start at tank position
        startPos.y += 1.7;  // Add height of turret
        startPos.add(barrelOffset);  // Add barrel offset
        
        // Add slight spread for automatic fire (reduced spread)
        const spread = 0.01;
        direction.x += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
        direction.normalize();
        
        // Create projectile and add it to the projectiles array
        const projectile = createProjectile(scene, startPos, direction, false);
        
        // Use the global projectiles array
        if (window.projectiles) {
            window.projectiles.push(projectile);
        }
        
        lastShotTime = currentTime;
        
        // Record shot for replay analysis
        if (window.recordShot && typeof window.recordShot === 'function') {
            window.recordShot();
        }
        
        // Ensure ALL movement properties remain unchanged after shooting
        tank.userData.velocity = currentVelocity;
        tank.userData.direction = currentDirection;
        tank.userData.isAccelerating = currentAccelerating;
        tank.userData.currentSpeed = currentSpeed;
    }
    
    // Store camera settings in tank.userData if not already set
    if (tank.userData.cameraDistance === undefined) {
        tank.userData.cameraDistance = CAMERA_SETTINGS.defaultDistance;
    }
    
    // Handle camera zoom
    if (keys['q']) { // Zoom in
        tank.userData.cameraDistance = Math.max(
            CAMERA_SETTINGS.minDistance, 
            tank.userData.cameraDistance - CAMERA_SETTINGS.zoomSpeed
        );
    }
    if (keys['e']) { // Zoom out
        tank.userData.cameraDistance = Math.min(
            CAMERA_SETTINGS.maxDistance, 
            tank.userData.cameraDistance + CAMERA_SETTINGS.zoomSpeed
        );
    }
    
    // If Look Around is not active, gradually return angles to 0
    if (!LOOK_AROUND.isActive) {
        LOOK_AROUND.angleX *= (1 - LOOK_AROUND.returnSpeed);
        LOOK_AROUND.angleY *= (1 - LOOK_AROUND.returnSpeed);
        
        // Snap to zero if very small to avoid floating point issues
        if (Math.abs(LOOK_AROUND.angleX) < 0.01) LOOK_AROUND.angleX = 0;
        if (Math.abs(LOOK_AROUND.angleY) < 0.01) LOOK_AROUND.angleY = 0;
    }
    
    // Calculate camera position using orbital rotation for 360-degree viewing
    // Start with the default position behind the tank
    const defaultDistance = tank.userData.cameraDistance;
    const defaultHeight = CAMERA_SETTINGS.defaultHeight;
    
    // Calculate camera position using spherical coordinates
    let cameraX = 0;
    let cameraY = defaultHeight;
    let cameraZ = defaultDistance;
    
    // Apply rotation from Look Around
    if (LOOK_AROUND.isActive || Math.abs(LOOK_AROUND.angleX) > 0.01 || Math.abs(LOOK_AROUND.angleY) > 0.01) {
        // Calculate camera position based on angles
        const cosY = Math.cos(LOOK_AROUND.angleY);
        const sinY = Math.sin(LOOK_AROUND.angleY);
        const cosX = Math.cos(LOOK_AROUND.angleX);
        const sinX = Math.sin(LOOK_AROUND.angleX);
        
        cameraX = defaultDistance * sinX * cosY;
        cameraY = defaultHeight + defaultDistance * sinY;
        cameraZ = defaultDistance * cosX * cosY;
    }
    
    // Position camera relative to tank
    camera.position.set(
        tank.position.x + cameraX,
        cameraY,
        tank.position.z + cameraZ
    );
    
    // Always look at the tank
    camera.lookAt(
        tank.position.x,
        1.0, // Look at the center of the tank, not the ground
        tank.position.z
    );
    
    // Force camera matrix update
    camera.updateProjectionMatrix();

    // Return tank data for other functions to use
    return {
        speed: tank.userData.currentSpeed,
        position: tank.position.clone(),
        rotation: tank.rotation.y
    };
}