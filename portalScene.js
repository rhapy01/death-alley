// portalScene.js - Creates 6 ancient portals outside Death Alley near the Eiffel Tower

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class PortalManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.portals = [];
        this.clock = new THREE.Clock();
        this.portalDestinations = [
            { name: "User Profile", destination: "user.html", icon: "user" },
            { name: "Basement Fun", destination: "https://basement.fun/", icon: "shield-alt" },
            { name: "Master Blaster", destination: "https://basement.fun/play/master-blaster", icon: "rocket" },
            { name: "RoseBud Ai", destination: "https://rosebud.ai/", icon: "hat-wizard" },
            { name: "Heli Attack", destination: "https://basement.fun/play/heliattack2000", icon: "sword" },
            { name: "Coin Taps", destination: "https://mazaya25.github.io/B3dotfun-cointaps/", icon: "microchip" }
        ];
        
        // Portal positions (3 on left, 3 on right) - UPDATED positions to be further outside the alley, near Eiffel Towers
        this.portalPositions = [
            // Left side portals - positioned away from Eiffel Towers but still outside alley
            new THREE.Vector3(-65, 0, -180),  // First tower area - fixed Y position to be on the ground
            new THREE.Vector3(-70, 0, -380),  // Second tower area - fixed Y position to be on the ground
            new THREE.Vector3(-75, 0, -580),  // Third tower area - fixed Y position to be on the ground
            // Right side portals - positioned away from Eiffel Towers but still outside alley
            new THREE.Vector3(65, 0, -280),   // First tower area - fixed Y position to be on the ground
            new THREE.Vector3(70, 0, -480),   // Second tower area - fixed Y position to be on the ground
            new THREE.Vector3(75, 0, -680)    // Third tower area - fixed Y position to be on the ground
        ];

        this.activePortal = null;
        this.isTransitioning = false;
        
        // Create DOM overlay for portal info
        this.createPortalInfoOverlay();
    }

    initialize() {
        this.createPortals();
        this.createPortalEnvironments();
        this.setupEventListeners();
        this.animate();
    }

    createPortals() {
        // Portal textures and materials
        const portalTexture = this.createPortalTexture();
        const portalMaterial = new THREE.MeshStandardMaterial({
            map: portalTexture,
            emissive: new THREE.Color(0x8a00ff),
            emissiveIntensity: 0.8,
            transparent: true,
            side: THREE.DoubleSide
        });

        // Create each portal
        for (let i = 0; i < 6; i++) {
            const portal = this.createPortalMesh(portalMaterial, i);
            this.portals.push(portal);
            this.scene.add(portal.group);
        }
    }

    createPortalMesh(material, index) {
        // Create portal group
        const group = new THREE.Group();
        group.position.copy(this.portalPositions[index]);
        
        // Adjust portal height to ensure it stays properly on the surface
        // Set group Y position for the entire portal to be slightly above ground to avoid z-fighting
        group.position.y = 0.1; // Just a small amount above the ground to avoid z-fighting
        
        // Create portal as a circular shimmering portal with blue-purple hues instead of a mirror
        const portalRadius = 6 * 4.5 * 0.5; // Reduced portal size by 50%
        const portalGeometry = new THREE.CircleGeometry(portalRadius, 64);
        
        // Create custom material with shimmering, swirling blue-purple hues
        const portalTexture = this.createPortalTexture();
        const portalMaterial = new THREE.MeshStandardMaterial({
            map: portalTexture,
            emissive: new THREE.Color(0x5522ff),
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        const portalDisc = new THREE.Mesh(portalGeometry, portalMaterial);
        portalDisc.userData.portalIndex = index;
        portalDisc.userData.isPortal = true;
        
        // Rotate the portal disc to stand vertically (90 degrees around X axis)
        portalDisc.rotation.x = -Math.PI / 2;
        
        // Create outer rim for the portal
        const rimOuterRadius = portalRadius * 1.15;
        const rimInnerRadius = portalRadius * 1.05;
        const rimGeometry = new THREE.RingGeometry(rimInnerRadius, rimOuterRadius, 64);
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0x3300aa,
            emissive: 0x8855ff,
            emissiveIntensity: 1.0,
            metalness: 0.9,
            roughness: 0.2,
            side: THREE.DoubleSide
        });
        
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.position.z = -0.05 * 4.5; // Set slightly behind the portal
        // Match rim rotation to portal disc
        rim.rotation.x = -Math.PI / 2;
        
        // Add inner ring with ethereal glow
        const innerRingGeometry = new THREE.RingGeometry(portalRadius * 0.93, portalRadius * 0.98, 64);
        const innerRingMaterial = new THREE.MeshStandardMaterial({
            color: 0x22aaff,
            emissive: 0x00ddff,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
        innerRing.position.z = 0.05 * 4.5; // Slightly in front
        // Match inner ring rotation to portal disc
        innerRing.rotation.x = -Math.PI / 2;
        
        // Create "Teleport Now" text above the portal
        const textCanvas = document.createElement('canvas');
        textCanvas.width = 512;
        textCanvas.height = 128;
        const ctx = textCanvas.getContext('2d');
        
        // Fill with transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 512, 128);
        
        // Get the destination name from the portalDestinations array
        const portalDestName = this.portalDestinations[index].name;
        const teleportText = `PORT TO ${portalDestName.toUpperCase()}`;
        
        // Draw teleport text with futuristic style
        ctx.font = 'bold 48px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text outline for readability
        ctx.strokeStyle = 'rgba(0, 30, 60, 0.8)';
        ctx.lineWidth = 8;
        ctx.strokeText(teleportText, 256, 64);
        
        // Text fill with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 128);
        gradient.addColorStop(0, '#22eeff');
        gradient.addColorStop(0.5, '#aa55ff');
        gradient.addColorStop(1, '#ee22ff');
        ctx.fillStyle = gradient;
        ctx.fillText(teleportText, 256, 64);
        
        // Add glow effect
        ctx.shadowColor = '#55aaff';
        ctx.shadowBlur = 20;
        ctx.fillText(teleportText, 256, 64);
        
        const textTexture = new THREE.CanvasTexture(textCanvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // Reduce text size to match portal size
        const textGeometry = new THREE.PlaneGeometry(10 * 4.5 * 0.5, 2.5 * 4.5 * 0.5);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.y = portalRadius * 1.3; // Position above portal
        // Rotate text to match portal orientation
        textMesh.rotation.x = -Math.PI / 2;
        
        // Create destination text below the portal
        const destTextCanvas = document.createElement('canvas');
        destTextCanvas.width = 512;
        destTextCanvas.height = 128;
        const destCtx = destTextCanvas.getContext('2d');
        
        // Fill with transparent background
        destCtx.fillStyle = 'rgba(0, 0, 0, 0)';
        destCtx.fillRect(0, 0, 512, 128);
        
        // Draw destination name
        destCtx.font = 'bold 56px "Orbitron", sans-serif';
        destCtx.textAlign = 'center';
        destCtx.textBaseline = 'middle';
        
        // Text outline for readability
        destCtx.strokeStyle = 'rgba(0, 30, 60, 0.8)';
        destCtx.lineWidth = 6;
        destCtx.strokeText(portalDestName, 256, 64);
        
        // Text fill with bright color
        destCtx.fillStyle = '#ffffff';
        destCtx.fillText(portalDestName, 256, 64);
        
        // Add glow effect
        destCtx.shadowColor = '#00ffff';
        destCtx.shadowBlur = 15;
        destCtx.fillText(portalDestName, 256, 64);
        
        const destTextTexture = new THREE.CanvasTexture(destTextCanvas);
        const destTextMaterial = new THREE.MeshBasicMaterial({
            map: destTextTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const destTextGeometry = new THREE.PlaneGeometry(10 * 4.5 * 0.5, 2.5 * 4.5 * 0.5);
        const destTextMesh = new THREE.Mesh(destTextGeometry, destTextMaterial);
        destTextMesh.position.y = -portalRadius * 1.3; // Position below portal
        // Rotate text to match portal orientation
        destTextMesh.rotation.x = -Math.PI / 2;
        
        // Energy wisps emanating from the portal
        const energyWisps = this.createEnergyWisps();
        // Rotate energy wisps to match portal orientation
        energyWisps.rotation.x = -Math.PI / 2;
        
        // Create particles
        const particles = this.createPortalParticles();
        // Rotate particles to match portal orientation
        particles.rotation.x = -Math.PI / 2;
        
        // Add all components to group
        group.add(portalDisc);
        group.add(rim);
        group.add(innerRing);
        group.add(textMesh);
        group.add(destTextMesh);
        group.add(energyWisps);
        group.add(particles);
        
        // Adjust overall rotation to face the player in the correct direction
        // For portals on the left side, rotate to face right; for portals on the right side, rotate to face left
        if (index < 3) { // Left side portals
            group.rotation.y = -Math.PI/2; // Face right (toward the track)
        } else { // Right side portals
            group.rotation.y = Math.PI/2; // Face left (toward the track)
        }
        
        return {
            group,
            disc: portalDisc,
            rim: rim,
            innerRing: innerRing,
            text: textMesh,
            destText: destTextMesh,
            energyWisps: energyWisps,
            particles,
            destination: this.portalDestinations[index].destination,
            name: this.portalDestinations[index].name,
            icon: this.portalDestinations[index].icon,
            animationPhase: Math.random() * Math.PI * 2, // For varied animations
            active: false
        };
    }

    createEnergyWisps() {
        const wispsGroup = new THREE.Group();
        
        // Create 8-12 energy wisps
        const numWisps = 8 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < numWisps; i++) {
            // Create a curved path for the wisp
            const curve = new THREE.CubicBezierCurve3(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(
                    (Math.random() - 0.5) * 10 * 4.5, 
                    (Math.random() - 0.5) * 10 * 4.5, 
                    (Math.random() - 0.5) * 3 * 4.5
                ),
                new THREE.Vector3(
                    (Math.random() - 0.5) * 15 * 4.5, 
                    (Math.random() - 0.5) * 15 * 4.5, 
                    (Math.random() - 0.5) * 5 * 4.5
                ),
                new THREE.Vector3(
                    (Math.random() - 0.5) * 20 * 4.5, 
                    (Math.random() - 0.5) * 20 * 4.5, 
                    (Math.random() - 0.5) * 8 * 4.5
                )
            );
            
            const points = curve.getPoints(30);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            // Choose between blue and purple for the wisp color
            const color = Math.random() > 0.5 ? 0x22aaff : 0xaa22ff;
            
            const material = new THREE.LineBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.7
            });
            
            const wisp = new THREE.Line(geometry, material);
            
            // Store animation data
            wisp.userData.originalPoints = [...points];
            wisp.userData.speed = 0.5 + Math.random() * 1.0;
            wisp.userData.phaseOffset = Math.random() * Math.PI * 2;
            
            wispsGroup.add(wisp);
        }
        
        return wispsGroup;
    }

    createPortalTexture() {
        // Create dynamic canvas for shimmering, swirling portal with blue-purple hues
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Create radial gradient for portal base (blue to purple)
        const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
        gradient.addColorStop(0, 'rgba(80, 180, 255, 1.0)');    // Bright blue at center
        gradient.addColorStop(0.3, 'rgba(120, 120, 255, 0.95)'); // Blue-purple
        gradient.addColorStop(0.7, 'rgba(170, 80, 255, 0.9)');   // Purple
        gradient.addColorStop(1, 'rgba(80, 40, 120, 0.85)');    // Darker purple at edges
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 1024);
        
        // Add swirling effect with multiple layers
        for (let layer = 0; layer < 4; layer++) {
            const opacity = 0.1 + (layer / 4) * 0.4;
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 2 + layer * 2;
            
            // Create spiral swirls
            for (let i = 0; i < 12; i++) {
                ctx.beginPath();
                const angle = (i / 12) * Math.PI * 2;
                const startRadius = 100 + layer * 70;
                
                ctx.moveTo(512 + Math.cos(angle) * startRadius, 
                           512 + Math.sin(angle) * startRadius);
                
                // Draw swirling spiral
                for (let r = startRadius; r < 500; r += 10) {
                    const swirl = angle + (r / 80) + layer * 0.8;
                    const x = 512 + Math.cos(swirl) * r;
                    const y = 512 + Math.sin(swirl) * r;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }
        
        // Add energy pulses represented as circles
        for (let i = 0; i < 15; i++) {
            const radius = 50 + Math.random() * 400;
            const angle = Math.random() * Math.PI * 2;
            const x = 512 + Math.cos(angle) * radius;
            const y = 512 + Math.sin(angle) * radius;
            const size = 10 + Math.random() * 40;
            
            const pulseGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            if (Math.random() > 0.5) {
                // Blue pulses
                pulseGradient.addColorStop(0, 'rgba(100, 220, 255, 0.9)');
                pulseGradient.addColorStop(0.6, 'rgba(80, 180, 255, 0.6)');
                pulseGradient.addColorStop(1, 'rgba(80, 180, 255, 0)');
            } else {
                // Purple pulses
                pulseGradient.addColorStop(0, 'rgba(200, 100, 255, 0.9)');
                pulseGradient.addColorStop(0.6, 'rgba(170, 80, 255, 0.6)');
                pulseGradient.addColorStop(1, 'rgba(170, 80, 255, 0)');
            }
            
            ctx.fillStyle = pulseGradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add subtle white energy streaks
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 20; i++) {
            const x1 = Math.random() * 1024;
            const y1 = Math.random() * 1024;
            const length = 50 + Math.random() * 150;
            const angle = Math.random() * Math.PI * 2;
            const x2 = x1 + Math.cos(angle) * length;
            const y2 = y1 + Math.sin(angle) * length;
            
            const streakGradient = ctx.createLinearGradient(x1, y1, x2, y2);
            streakGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            streakGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
            streakGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.strokeStyle = streakGradient;
            ctx.lineWidth = 2 + Math.random() * 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createPortalParticles() {
        // Create particles system - adapted for circular portal
        const particlesGroup = new THREE.Group();
        
        // Create 80-120 particle sprites for a denser effect
        const numParticles = 80 + Math.floor(Math.random() * 40);
        
        for (let i = 0; i < numParticles; i++) {
            // Randomly choose between blue and purple particles
            const color = Math.random() > 0.5 ? 
                new THREE.Color(0x44aaff) : // Blue
                new THREE.Color(0xaa44ff);  // Purple
            
            // Create particle sprite
            const sprite = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.6 * Math.random() + 0.4,
                    blending: THREE.AdditiveBlending
                })
            );
            
            // Random size for particles
            const size = (0.15 + Math.random() * 0.3) * 4.5;
            sprite.scale.set(size, size, size);
            
            // Random position around the portal
            const radius = (Math.random() * 6.5) * 4.5; // Position within and around portal radius
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const z = (Math.random() - 0.5) * 2 * 4.5; // Some depth variation
            
            sprite.position.set(x, y, z);
            
            // Store original position and animation data
            sprite.userData.originalPos = sprite.position.clone();
            sprite.userData.speed = 0.3 + Math.random() * 0.7;
            sprite.userData.amplitude = 0.1 + Math.random() * 0.3;
            sprite.userData.phaseOffset = Math.random() * Math.PI * 2;
            
            particlesGroup.add(sprite);
        }
        
        return particlesGroup;
    }

    createPortalInfoOverlay() {
        // Create portal info overlay container
        this.portalOverlay = document.createElement('div');
        this.portalOverlay.id = 'portal-overlay';
        this.portalOverlay.style.position = 'fixed';
        this.portalOverlay.style.display = 'none';
        this.portalOverlay.style.top = '50%';
        this.portalOverlay.style.left = '50%';
        this.portalOverlay.style.transform = 'translate(-50%, -50%)';
        this.portalOverlay.style.width = '600px';
        this.portalOverlay.style.padding = '30px';
        this.portalOverlay.style.backgroundColor = 'rgba(10, 0, 20, 0.9)';
        this.portalOverlay.style.borderRadius = '15px';
        this.portalOverlay.style.border = '2px solid #8a00ff';
        this.portalOverlay.style.boxShadow = '0 0 30px rgba(147, 36, 255, 0.7)';
        this.portalOverlay.style.color = 'white';
        this.portalOverlay.style.fontFamily = "'Orbitron', sans-serif";
        this.portalOverlay.style.zIndex = '1000';
        this.portalOverlay.style.textAlign = 'center';
        this.portalOverlay.style.transition = 'all 0.3s ease';
        
        // Portal info content
        this.portalOverlay.innerHTML = `
            <h2 style="font-size: 32px; margin-bottom: 20px; text-shadow: 0 0 10px rgba(147, 36, 255, 0.8);">Portal to <span id="portal-destination-name">Unknown</span></h2>
            <div id="portal-icon" style="width: 100px; height: 100px; margin: 0 auto 20px; background: rgba(138, 0, 255, 0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(147, 36, 255, 0.5);">
                <i class="fas fa-question" style="font-size: 50px; color: white;"></i>
            </div>
            <p id="portal-description" style="font-size: 18px; margin-bottom: 30px; font-family: Arial, sans-serif;">Discover what lies beyond...</p>
            <div style="display: flex; justify-content: space-around;">
                <button id="enter-portal-btn" style="padding: 15px 30px; background: linear-gradient(45deg, #4e00c2, #8a00ff); border: none; border-radius: 30px; color: white; font-family: 'Orbitron', sans-serif; font-size: 18px; cursor: pointer; box-shadow: 0 0 15px rgba(147, 36, 255, 0.5); transition: all 0.3s ease;">Enter Portal</button>
                <button id="close-portal-btn" style="padding: 15px 30px; background: rgba(50, 50, 50, 0.7); border: 1px solid #8a00ff; border-radius: 30px; color: white; font-family: 'Orbitron', sans-serif; font-size: 18px; cursor: pointer; transition: all 0.3s ease;">Close</button>
            </div>
        `;
        
        document.body.appendChild(this.portalOverlay);
        
        // Add event listeners for buttons
        document.getElementById('enter-portal-btn').addEventListener('click', () => {
            if (this.activePortal) {
                this.activatePortalTransition(this.activePortal);
            }
        });
        
        document.getElementById('close-portal-btn').addEventListener('click', () => {
            this.portalOverlay.style.display = 'none';
            this.activePortal = null;
        });
        
        // Add Font Awesome for icons
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fontAwesome);
        
        // Add Orbitron font for portal text
        const orbitronFont = document.createElement('link');
        orbitronFont.rel = 'stylesheet';
        orbitronFont.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap';
        document.head.appendChild(orbitronFont);
    }

    setupEventListeners() {
        // Raycaster for portal interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Mouse move event to track cursor
        window.addEventListener('mousemove', (event) => {
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
        
        // Click event for portal selection
        window.addEventListener('click', (event) => {
            if (this.isTransitioning) return;
            
            // Update the picking ray with the camera and mouse position
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            // Calculate objects intersecting the picking ray
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            
            // Check if a portal was clicked
            for (let i = 0; i < intersects.length; i++) {
                if (intersects[i].object.userData.isPortal) {
                    const portalIndex = intersects[i].object.userData.portalIndex;
                    this.showPortalInfo(this.portals[portalIndex]);
                    break;
                }
            }
        });
    }

    showPortalInfo(portal) {
        // Set active portal
        this.activePortal = portal;
        
        // Update portal info overlay
        document.getElementById('portal-destination-name').textContent = portal.name;
        document.getElementById('portal-icon').innerHTML = `<i class="fas fa-${portal.icon}" style="font-size: 50px; color: white;"></i>`;
        
        // Set description based on portal name
        let description = "Discover what lies beyond...";
        switch(portal.name) {
            case "User Profile":
                description = "View your Death Alley profile, achievements, and game statistics.";
                break;
            case "Crypto Raiders":
                description = "Join the ultimate fantasy RPG adventure where blockchain heroes battle for glory.";
                break;
            case "Cosmic Voyage":
                description = "Explore the vastness of space in this interstellar adventure across unexplored galaxies.";
                break;
            case "Mystic Realms":
                description = "Master the arcane arts in a world where magic flows through every living being.";
                break;
            case "Battle Arena":
                description = "Enter the arena and prove your combat skills against mighty challengers.";
                break;
            case "Tech Nexus":
                description = "Dive into a digital world of advanced technology and cybernetic enhancements.";
                break;
        }
        document.getElementById('portal-description').textContent = description;
        
        // Display overlay
        this.portalOverlay.style.display = 'block';
        
        // Activate portal visual effect
        for (const p of this.portals) {
            p.active = (p === portal);
        }
    }

    activatePortalTransition(portal) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        // Hide the overlay
        this.portalOverlay.style.display = 'none';
        
        // Create iframe container
        const iframeContainer = document.createElement('div');
        iframeContainer.style.position = 'fixed';
        iframeContainer.style.top = '0';
        iframeContainer.style.left = '0';
        iframeContainer.style.width = '100%';
        iframeContainer.style.height = '100%';
        iframeContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        iframeContainer.style.zIndex = '2000';
        
        // Create return button
        const returnButton = document.createElement('button');
        returnButton.textContent = '↩ Return to Death Alley';
        returnButton.style.position = 'fixed';
        returnButton.style.top = '20px';
        returnButton.style.right = '20px';
        returnButton.style.zIndex = '2002';
        returnButton.style.padding = '12px 24px';
        returnButton.style.backgroundColor = '#ff3c00';
        returnButton.style.color = 'white';
        returnButton.style.border = 'none';
        returnButton.style.borderRadius = '5px';
        returnButton.style.cursor = 'pointer';
        returnButton.style.fontFamily = "'Chakra Petch', sans-serif";
        returnButton.style.fontSize = '16px';
        returnButton.style.boxShadow = '0 0 20px rgba(255, 60, 0, 0.3)';
        returnButton.style.transition = 'all 0.3s ease';
        
        // Add hover effect
        returnButton.onmouseover = () => {
            returnButton.style.backgroundColor = '#ff5722';
            returnButton.style.transform = 'translateY(-2px)';
            returnButton.style.boxShadow = '0 0 30px rgba(255, 60, 0, 0.5)';
        };
        returnButton.onmouseout = () => {
            returnButton.style.backgroundColor = '#ff3c00';
            returnButton.style.transform = 'translateY(0)';
            returnButton.style.boxShadow = '0 0 20px rgba(255, 60, 0, 0.3)';
        };
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.zIndex = '2001';
        iframe.src = portal.destination;
        
        // Add transition animation elements
        const transitionOverlay = document.createElement('div');
        transitionOverlay.style.position = 'fixed';
        transitionOverlay.style.top = '0';
        transitionOverlay.style.left = '0';
        transitionOverlay.style.width = '100%';
        transitionOverlay.style.height = '100%';
        transitionOverlay.style.backgroundColor = 'rgba(78, 0, 194, 0)';
        transitionOverlay.style.zIndex = '2003';
        transitionOverlay.style.transition = 'background-color 2s ease';
        
        const portalEffect = document.createElement('div');
        portalEffect.style.position = 'fixed';
        portalEffect.style.top = '50%';
        portalEffect.style.left = '50%';
        portalEffect.style.transform = 'translate(-50%, -50%)';
        portalEffect.style.width = '0';
        portalEffect.style.height = '0';
        portalEffect.style.borderRadius = '50%';
        portalEffect.style.background = 'radial-gradient(circle, rgba(212, 0, 255, 1) 0%, rgba(138, 0, 255, 0.8) 50%, rgba(78, 0, 194, 0) 100%)';
        portalEffect.style.boxShadow = '0 0 100px rgba(147, 36, 255, 0.8)';
        portalEffect.style.transition = 'all 2s ease';
        portalEffect.style.zIndex = '2004';
        
        // Add return button functionality
        returnButton.onclick = () => {
            // Add exit transition
            const exitOverlay = transitionOverlay.cloneNode();
            const exitEffect = portalEffect.cloneNode();
            document.body.appendChild(exitOverlay);
            document.body.appendChild(exitEffect);
            
            setTimeout(() => {
                exitOverlay.style.backgroundColor = 'rgba(78, 0, 194, 0.7)';
                exitEffect.style.width = '300vw';
                exitEffect.style.height = '300vw';
            }, 100);
            
            setTimeout(() => {
                iframeContainer.remove();
                exitOverlay.remove();
                exitEffect.remove();
                this.isTransitioning = false;
            }, 2000);
        };
        
        // Add this function after the iframe creation
        iframe.onerror = () => {
            // If iframe fails to load, open in new tab instead
            window.open(portal.destination, '_blank');
            iframeContainer.remove();
            transitionOverlay.remove();
            portalEffect.remove();
            this.isTransitioning = false;
        };
        
        // Add elements to DOM
        document.body.appendChild(transitionOverlay);
        document.body.appendChild(portalEffect);
        iframeContainer.appendChild(iframe);
        iframeContainer.appendChild(returnButton);
        
        // Start entrance transition
        setTimeout(() => {
            transitionOverlay.style.backgroundColor = 'rgba(78, 0, 194, 0.7)';
            portalEffect.style.width = '300vw';
            portalEffect.style.height = '300vw';
        }, 100);
        
        // Complete entrance transition and show iframe
        setTimeout(() => {
            document.body.appendChild(iframeContainer);
            transitionOverlay.remove();
            portalEffect.remove();
        }, 2000);
    }

    createPortalEnvironments() {
        // Create atmospheric effects around each portal
        for (let i = 0; i < this.portals.length; i++) {
            const portal = this.portals[i];
            
            // Create ground circle beneath each portal
            const groundRadius = 10 * 4.5 * 0.5; // Reduced to match portal size
            const groundGeometry = new THREE.CircleGeometry(groundRadius, 32); // Reduced segments
            const groundMaterial = new THREE.MeshStandardMaterial({
                color: 0x220033,
                roughness: 0.7,
                metalness: 0.2,
                emissive: 0x330066,
                emissiveIntensity: 0.3
            });
            
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -2.9 * 4.5;
            portal.group.add(ground);
            
            // Create rune circle on the ground - reduced complexity
            const runeCircleGeometry = new THREE.RingGeometry(groundRadius - (1 * 4.5 * 0.5), groundRadius - (0.5 * 4.5 * 0.5), 64); // Reduced segments
            const runeCircleMaterial = new THREE.MeshStandardMaterial({
                color: 0x8800ff,
                roughness: 0.4,
                metalness: 0.6,
                emissive: 0x6600cc,
                emissiveIntensity: 0.6
            });
            
            const runeCircle = new THREE.Mesh(runeCircleGeometry, runeCircleMaterial);
            runeCircle.rotation.x = -Math.PI / 2;
            runeCircle.position.y = -2.89 * 4.5;
            portal.group.add(runeCircle);
            
            // Add inner circle with runes - reduced complexity
            const innerCircleGeometry = new THREE.RingGeometry(3.5 * 4.5 * 0.5, 4 * 4.5 * 0.5, 64); // Reduced sizes
            const innerCircleMaterial = new THREE.MeshStandardMaterial({
                color: 0xaa00ff,
                roughness: 0.4,
                metalness: 0.7,
                emissive: 0x9900ff,
                emissiveIntensity: 0.7,
                transparent: true,
                opacity: 0.9
            });
            
            const innerCircle = new THREE.Mesh(innerCircleGeometry, innerCircleMaterial);
            innerCircle.rotation.x = -Math.PI / 2;
            innerCircle.position.y = -2.88 * 4.5;
            portal.group.add(innerCircle);
            
            // Add floating crystals around portal - REDUCED number and size
            const numCrystals = 2; // Drastically reduced from 6-11
            
            for (let j = 0; j < numCrystals; j++) {
                const angle = (j / numCrystals) * Math.PI * 2;
                const radius = (3.5 + Math.random() * 1.5) * 4.5 * 0.5; // Reduced radius
                
                // Create a crystalline shape - smaller size
                const crystalGeo = new THREE.ConeGeometry(
                    (0.2 + Math.random() * 0.2) * 4.5 * 0.5, // Reduced size further
                    (1.0 + Math.random() * 1.0) * 4.5 * 0.5, // Reduced size further
                    4 // Lower polygon count
                );
                const crystalMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.75 + Math.random() * 0.15, 1, 0.5),
                    emissive: new THREE.Color().setHSL(0.75 + Math.random() * 0.15, 1, 0.3),
                    emissiveIntensity: 0.7,
                    transparent: true,
                    opacity: 0.8,
                    metalness: 0.9,
                    roughness: 0.2
                });
                
                const crystal = new THREE.Mesh(crystalGeo, crystalMat);
                
                // Position around the portal in a circle at varying heights
                crystal.position.set(
                    Math.cos(angle) * radius,
                    Math.random() * 5, // Further reduced height variation
                    Math.sin(angle) * radius
                );
                
                // Random rotation
                crystal.rotation.x = Math.random() * Math.PI;
                crystal.rotation.y = Math.random() * Math.PI;
                crystal.rotation.z = Math.random() * Math.PI;
                
                // Store original position and animation data
                crystal.userData.originalY = crystal.position.y;
                crystal.userData.floatSpeed = 0.3 + Math.random() * 0.7;
                crystal.userData.rotateSpeed = 0.2 + Math.random() * 0.5;
                crystal.userData.floatHeight = (0.2 + Math.random() * 0.3) * 4.5; // Reduced float height
                crystal.userData.phaseOffset = Math.random() * Math.PI * 2;
                
                portal.crystals = portal.crystals || [];
                portal.crystals.push(crystal);
                portal.group.add(crystal);
            }
            
            // Create a subtle fog/mist effect around the portal - simplified
            const mistGeometry = new THREE.PlaneGeometry(20 * 4.5 * 0.5, 20 * 4.5 * 0.5);
            const mistTexture = this.createMistTexture();
            const mistMaterial = new THREE.MeshBasicMaterial({
                map: mistTexture,
                transparent: true,
                opacity: 0.3, // Reduced opacity
                depthWrite: false,
                side: THREE.DoubleSide
            });
            
            const mist = new THREE.Mesh(mistGeometry, mistMaterial);
            mist.rotation.x = -Math.PI / 2;
            mist.position.y = -2.8 * 4.5;
            portal.group.add(mist);
            
            // Add light beams emanating from the portal - REDUCED number and size
            const numBeams = 4; // Reduced from 12
            portal.lightBeams = [];
            
            for (let j = 0; j < numBeams; j++) {
                const angle = (j / numBeams) * Math.PI * 2;
                const beamLength = (3 + Math.random() * 3) * 4.5 * 0.5; // Reduced length
                const beamWidth = (0.3 + Math.random() * 0.3) * 4.5 * 0.5; // Reduced width
                
                const beamGeometry = new THREE.PlaneGeometry(beamWidth, beamLength);
                const beamTexture = this.createLightBeamTexture();
                const beamMaterial = new THREE.MeshBasicMaterial({
                    map: beamTexture,
                    transparent: true,
                    opacity: 0.5, // Slightly reduced opacity
                    depthWrite: false,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending
                });
                
                const beam = new THREE.Mesh(beamGeometry, beamMaterial);
                
                // Position beam to extend from portal center
                beam.position.set(
                    Math.cos(angle) * (beamLength / 2),
                    0,
                    Math.sin(angle) * (beamLength / 2)
                );
                
                // Rotate beam to point outward
                beam.rotation.y = angle + Math.PI / 2;
                beam.rotation.x = Math.PI / 2;
                
                // Store animation data
                beam.userData.pulseSpeed = 0.5 + Math.random() * 1.0;
                beam.userData.phaseOffset = Math.random() * Math.PI * 2;
                
                portal.lightBeams.push(beam);
                portal.group.add(beam);
            }
        }
    }

    createMistTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create circular gradient
        const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(170, 120, 255, 0.3)');
        gradient.addColorStop(0.4, 'rgba(160, 100, 255, 0.15)');
        gradient.addColorStop(0.7, 'rgba(150, 80, 255, 0.05)');
        gradient.addColorStop(1, 'rgba(130, 50, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // Add some noise for texture
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 400; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const radius = Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`;
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createLightBeamTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create linear gradient along the beam
        const gradient = ctx.createLinearGradient(32, 0, 32, 256);
        gradient.addColorStop(0, 'rgba(170, 120, 255, 0.9)');
        gradient.addColorStop(0.3, 'rgba(160, 100, 255, 0.7)');
        gradient.addColorStop(0.7, 'rgba(150, 80, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(130, 50, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 256);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    animate() {
        const update = () => {
            const delta = this.clock.getDelta();
            const elapsedTime = this.clock.getElapsedTime();
            
            // Update all portals
            for (const portal of this.portals) {
                // Make rim and inner ring glow/pulse
                if (portal.active) {
                    portal.rim.material.emissiveIntensity = 1.5 + Math.sin(elapsedTime * 5) * 0.5;
                    portal.innerRing.material.emissiveIntensity = 2.0 + Math.sin(elapsedTime * 7) * 0.7;
                    portal.disc.material.emissiveIntensity = 1.5 + Math.sin(elapsedTime * 6) * 0.5;
                    
                    // Pulse the portal size slightly when active
                    portal.disc.scale.set(
                        1.0 + Math.sin(elapsedTime * 4) * 0.05,
                        1.0 + Math.sin(elapsedTime * 4) * 0.05,
                        1.0
                    );
                } else {
                    portal.rim.material.emissiveIntensity = 1.0 + Math.sin(elapsedTime + portal.animationPhase) * 0.2;
                    portal.innerRing.material.emissiveIntensity = 1.5 + Math.sin(elapsedTime * 1.5 + portal.animationPhase) * 0.3;
                    portal.disc.material.emissiveIntensity = 1.2 + Math.sin(elapsedTime + portal.animationPhase) * 0.2;
                    portal.disc.scale.set(1, 1, 1);
                }
                
                // Rotate portal disc to create swirling effect
                portal.disc.rotation.z += delta * (portal.active ? 0.5 : 0.2);
                
                // Animate energy wisps if present
                if (portal.energyWisps) {
                    for (const wisp of portal.energyWisps.children) {
                        const speed = wisp.userData.speed;
                        const phaseOffset = wisp.userData.phaseOffset;
                        const originalPoints = wisp.userData.originalPoints;
                        
                        // Update wisp geometry to create flowing movement
                        const positions = wisp.geometry.attributes.position;
                        
                        for (let i = 0; i < positions.count; i++) {
                            const originalPoint = originalPoints[i];
                            const time = elapsedTime * speed + phaseOffset;
                            
                            // Create flowing movement based on sine waves
                            const xOffset = Math.sin(time + i * 0.2) * 0.5 * 4.5;
                            const yOffset = Math.cos(time + i * 0.3) * 0.5 * 4.5;
                            const zOffset = Math.sin(time * 1.5 + i * 0.1) * 0.3 * 4.5;
                            
                            positions.setXYZ(
                                i,
                                originalPoint.x + xOffset,
                                originalPoint.y + yOffset,
                                originalPoint.z + zOffset
                            );
                        }
                        
                        positions.needsUpdate = true;
                        
                        // Pulse opacity based on time
                        wisp.material.opacity = 0.4 + Math.sin(elapsedTime * 2 + phaseOffset) * 0.3;
                    }
                }
                
                // Animate particles
                for (const particle of portal.particles.children) {
                    const originalPos = particle.userData.originalPos;
                    const speed = particle.userData.speed;
                    const amplitude = particle.userData.amplitude;
                    const phaseOffset = particle.userData.phaseOffset;
                    
                    // Circular orbital motion + slight oscillation in and out
                    const time = elapsedTime * speed + phaseOffset;
                    
                    // Calculate orbital movement
                    const radius = originalPos.length();
                    const angle = Math.atan2(originalPos.y, originalPos.x) + time * 0.2;
                    
                    // Vary radius slightly for breathing effect
                    const radiusVariation = radius * (1 + Math.sin(time * 2) * 0.05);
                    
                    // Update position
                    particle.position.x = Math.cos(angle) * radiusVariation;
                    particle.position.y = Math.sin(angle) * radiusVariation;
                    particle.position.z = originalPos.z + Math.sin(time * 3) * amplitude * 4.5;
                    
                    // Pulse opacity and size
                    particle.material.opacity = 0.4 + Math.sin(time * 3) * 0.3;
                    const scale = particle.userData.originalScale || particle.scale.x;
                    if (!particle.userData.originalScale) {
                        particle.userData.originalScale = scale;
                    }
                    
                    const newScale = scale * (1 + Math.sin(time * 2) * 0.1);
                    particle.scale.set(newScale, newScale, newScale);
                }
                
                // Animate floating crystals if present
                if (portal.crystals) {
                    for (const crystal of portal.crystals) {
                        const floatSpeed = crystal.userData.floatSpeed;
                        const rotateSpeed = crystal.userData.rotateSpeed;
                        const floatHeight = crystal.userData.floatHeight;
                        const phaseOffset = crystal.userData.phaseOffset;
                        const originalY = crystal.userData.originalY;
                        
                        // Float up and down
                        crystal.position.y = originalY + Math.sin(elapsedTime * floatSpeed + phaseOffset) * floatHeight;
                        
                        // Gentle rotation
                        crystal.rotation.x += delta * rotateSpeed * 0.3;
                        crystal.rotation.y += delta * rotateSpeed * 0.5;
                        crystal.rotation.z += delta * rotateSpeed * 0.2;
                        
                        // Pulse emissive intensity
                        if (crystal.material) {
                            crystal.material.emissiveIntensity = 0.7 + Math.sin(elapsedTime * 2 + phaseOffset) * 0.3;
                        }
                    }
                }
                
                // Animate light beams if present
                if (portal.lightBeams) {
                    for (const beam of portal.lightBeams) {
                        const angle = beam.userData.angle;
                        const speed = beam.userData.pulseSpeed;
                        const phaseOffset = beam.userData.phaseOffset;
                        
                        // Rotate beams around the portal
                        const currentAngle = angle + Math.sin(elapsedTime * speed * 0.2 + phaseOffset) * 0.2;
                        beam.position.x = Math.cos(currentAngle) * (2 * 4.5 + beam.userData.length/2);
                        beam.position.z = Math.sin(currentAngle) * (2 * 4.5 + beam.userData.length/2);
                        beam.rotation.y = currentAngle + Math.PI/2;
                        
                        // Pulse opacity
                        beam.material.opacity = 0.4 + Math.sin(elapsedTime * 2 + phaseOffset) * 0.2;
                    }
                }
            }
            
            // Highlight portals on hover
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            
            // Reset all portals hover state
            for (const portal of this.portals) {
                if (!portal.active) {
                    portal.rim.material.emissive.set(0x8855ff);
                }
            }
            
            // Check for hover
            for (let i = 0; i < intersects.length; i++) {
                if (intersects[i].object.userData.isPortal) {
                    const portalIndex = intersects[i].object.userData.portalIndex;
                    const portal = this.portals[portalIndex];
                    
                    if (!portal.active) {
                        portal.rim.material.emissive.set(0x22ddff);
                    }
                    
                    break;
                }
            }
            
            requestAnimationFrame(update);
        };
        
        update();
    }
}

// Function to add the portals to the existing Death Alley scene
export function addPortalsToScene(scene, camera, renderer) {
    const portalManager = new PortalManager(scene, camera, renderer);
    portalManager.initialize();
    return portalManager;
} 