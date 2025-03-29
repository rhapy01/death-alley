// Replay data structure and management
let replayData = {
    isRecording: false,
    frames: [],
    metadata: {
        level: 0,
        startTime: 0,
        endTime: 0,
        totalShots: 0,
        maxSpeed: 0,
        averageSpeed: 0,
        completionTime: 0,
        difficulty: '',
        gameMode: '',
        obstacleCollisions: 0,  // Track number of obstacle collisions
        boostRamps: 0           // Track number of boost ramps used
    },
    currentReplayFrame: 0,
    isPlaying: false,
    playbackSpeed: 1,
    statsRecordingInterval: 5, // Record data every 5 frames for performance
    frameCounter: 0
};

// Record a single frame of gameplay data
export function recordFrame(tank, projectiles, enemies, currentLevel, gameMode, obstacleCollision = false, boostRamp = false) {
    if (!replayData.isRecording) return;
    
    // Only record every X frames to keep replay data manageable
    replayData.frameCounter++;
    if (replayData.frameCounter % replayData.statsRecordingInterval !== 0 && !obstacleCollision && !boostRamp) return;
    
    // Store key gameplay metrics
    const frame = {
        timestamp: Date.now() - replayData.metadata.startTime,
        position: {
            x: tank.position.x,
            y: tank.position.y,
            z: tank.position.z
        },
        rotation: {
            tank: tank.rotation.y,
            turret: tank.turret ? tank.turret.rotation.y : 0
        },
        speed: tank.userData.currentSpeed || 0,
        velocity: tank.userData.velocity || 0,
        isAccelerating: tank.userData.isAccelerating || false,
        isBraking: tank.userData.isBraking || false,
        projectileCount: projectiles.length,
        enemyCount: enemies.length,
        shotFired: false, // Will be set to true if a shot is fired
        obstacleCollision: obstacleCollision,
        boostRamp: boostRamp
    };
    
    // Update metadata based on this frame
    if (frame.speed > replayData.metadata.maxSpeed) {
        replayData.metadata.maxSpeed = frame.speed;
    }
    
    // Track obstacle interactions
    if (obstacleCollision) {
        replayData.metadata.obstacleCollisions++;
    }
    
    if (boostRamp) {
        replayData.metadata.boostRamps++;
    }
    
    replayData.frames.push(frame);
}

// Start recording a new replay
export function startReplay(tank, currentLevel, gameMode) {
    // Reset replay data
    replayData = {
        isRecording: true,
        frames: [],
        metadata: {
            level: currentLevel,
            startTime: Date.now(),
            endTime: 0,
            totalShots: 0,
            maxSpeed: 0,
            averageSpeed: 0,
            completionTime: 0,
            difficulty: 'Normal', // Default
            gameMode: gameMode,
            obstacleCollisions: 0,
            boostRamps: 0
        },
        currentReplayFrame: 0,
        isPlaying: false,
        playbackSpeed: 1,
        statsRecordingInterval: 5,
        frameCounter: 0
    };
    
    console.log("Started recording replay data");
}

// Record a shot being fired
export function recordShot() {
    if (!replayData.isRecording) return;
    
    replayData.metadata.totalShots++;
    
    // Mark the last frame as having a shot fired
    if (replayData.frames.length > 0) {
        replayData.frames[replayData.frames.length - 1].shotFired = true;
    }
}

// Finish recording and process the replay data
export function finishReplay() {
    if (!replayData.isRecording) return;
    
    replayData.isRecording = false;
    replayData.metadata.endTime = Date.now();
    replayData.metadata.completionTime = replayData.metadata.endTime - replayData.metadata.startTime;
    
    // Calculate average speed
    if (replayData.frames.length > 0) {
        const totalSpeed = replayData.frames.reduce((sum, frame) => sum + Math.abs(frame.speed), 0);
        replayData.metadata.averageSpeed = totalSpeed / replayData.frames.length;
    }
    
    console.log("Finished recording replay data", replayData);
    
    // Save replay data to localStorage
    saveReplay();
    
    // Show the replay analysis UI
    showReplayAnalysis();
    
    return replayData;
}

// Save the current replay to localStorage
function saveReplay() {
    try {
        // Get existing replays
        const savedReplays = JSON.parse(localStorage.getItem('gameReplays') || '[]');
        
        // Add metadata and timestamp to identify this replay
        const replayToSave = {
            id: Date.now(),
            date: new Date().toISOString(),
            metadata: replayData.metadata,
            frames: replayData.frames
        };
        
        // Limit to last 10 replays to prevent localStorage overflow
        savedReplays.push(replayToSave);
        while (savedReplays.length > 10) {
            savedReplays.shift();
        }
        
        localStorage.setItem('gameReplays', JSON.stringify(savedReplays));
        console.log("Saved replay to localStorage");
    } catch (e) {
        console.error("Failed to save replay:", e);
    }
}

// Load a specific replay by ID
export function loadReplay(replayId) {
    try {
        const savedReplays = JSON.parse(localStorage.getItem('gameReplays') || '[]');
        const replay = savedReplays.find(r => r.id === replayId);
        
        if (replay) {
            replayData.frames = replay.frames;
            replayData.metadata = replay.metadata;
            replayData.currentReplayFrame = 0;
            replayData.isPlaying = false;
            
            console.log("Loaded replay:", replay);
            return true;
        }
        
        return false;
    } catch (e) {
        console.error("Failed to load replay:", e);
        return false;
    }
}

// Get a list of all saved replays
export function getReplayList() {
    try {
        const savedReplays = JSON.parse(localStorage.getItem('gameReplays') || '[]');
        
        // Return just the metadata for the UI
        return savedReplays.map(replay => ({
            id: replay.id,
            date: replay.date,
            level: replay.metadata.level,
            completionTime: replay.metadata.completionTime,
            maxSpeed: replay.metadata.maxSpeed,
            totalShots: replay.metadata.totalShots,
            gameMode: replay.metadata.gameMode
        }));
    } catch (e) {
        console.error("Failed to get replay list:", e);
        return [];
    }
}

// Create and show the replay analysis UI
export function showReplayAnalysis() {
    // Create container if it doesn't exist
    let container = document.getElementById('replay-analysis');
    if (!container) {
        container = document.createElement('div');
        container.id = 'replay-analysis';
        container.className = 'replay-panel';
        document.body.appendChild(container);
    }
    
    // Add CSS for the replay panel
    addReplayCSS();
    
    // Build the UI
    container.innerHTML = `
        <div class="replay-header">
            <h2>Run Analysis - Level ${replayData.metadata.level}</h2>
            <div class="replay-close" onclick="document.getElementById('replay-analysis').remove()">×</div>
        </div>
        <div class="replay-stats">
            <div class="stat-group">
                <div class="stat-item">
                    <span class="stat-label">Completion Time:</span>
                    <span class="stat-value">${formatTime(replayData.metadata.completionTime)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Shots:</span>
                    <span class="stat-value">${replayData.metadata.totalShots}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Max Speed:</span>
                    <span class="stat-value">${Math.round(replayData.metadata.maxSpeed)} KPH</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Avg Speed:</span>
                    <span class="stat-value">${Math.round(replayData.metadata.averageSpeed)} KPH</span>
                </div>
                ${replayData.metadata.gameMode === 'time_trial' ? `
                <div class="stat-item">
                    <span class="stat-label">Obstacle Collisions:</span>
                    <span class="stat-value">${replayData.metadata.obstacleCollisions}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Boost Ramps Used:</span>
                    <span class="stat-value">${replayData.metadata.boostRamps}</span>
                </div>
                ` : ''}
            </div>
        </div>
        <div class="replay-charts">
            <canvas id="speedChart" width="500" height="200"></canvas>
            <canvas id="shotsChart" width="500" height="100"></canvas>
            ${replayData.metadata.gameMode === 'time_trial' ? `
            <canvas id="obstacleChart" width="500" height="100"></canvas>
            ` : ''}
        </div>
        <div class="replay-timeline">
            <div class="timeline-controls">
                <button id="play-pause-btn">▶ Play</button>
                <input type="range" id="timeline-slider" min="0" max="${replayData.frames.length - 1}" value="0">
                <select id="playback-speed">
                    <option value="0.5">0.5x</option>
                    <option value="1" selected>1.0x</option>
                    <option value="2">2.0x</option>
                    <option value="4">4.0x</option>
                </select>
            </div>
            <div id="timeline-info">Time: 00:00.00</div>
        </div>
        <div class="replay-actions">
            <button onclick="window.location.reload()">Exit Analysis</button>
            <button onclick="window.startNewGame()">Start New Game</button>
        </div>
    `;
    
    // Show the container
    container.style.display = 'block';
    
    // Add event listeners for replay controls
    setupReplayControls();
    
    // Generate charts
    generateSpeedChart();
    generateShotsChart();
    
    // Generate obstacle chart if in time trial mode
    if (replayData.metadata.gameMode === 'time_trial') {
        generateObstacleChart();
    }
}

// Add CSS styles for the replay UI
function addReplayCSS() {
    if (document.getElementById('replay-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'replay-styles';
    style.textContent = `
        .replay-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            background-color: rgba(0, 0, 0, 0.9);
            border: 2px solid #00aaff;
            border-radius: 10px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 2000;
            padding: 20px;
            box-shadow: 0 0 20px rgba(0, 170, 255, 0.5);
        }
        
        .replay-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #00aaff;
            padding-bottom: 10px;
        }
        
        .replay-header h2 {
            margin: 0;
            color: #00aaff;
        }
        
        .replay-close {
            cursor: pointer;
            font-size: 24px;
            color: #ff3333;
        }
        
        .replay-stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
        }
        
        .stat-group {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            width: 100%;
        }
        
        .stat-item {
            background-color: rgba(0, 50, 80, 0.7);
            padding: 8px 12px;
            border-radius: 5px;
            flex: 1 0 40%;
        }
        
        .stat-label {
            font-weight: bold;
            color: #aaddff;
        }
        
        .stat-value {
            float: right;
            font-weight: bold;
            color: #ffaa00;
        }
        
        .replay-charts {
            margin-bottom: 20px;
        }
        
        .replay-timeline {
            background-color: rgba(0, 50, 80, 0.5);
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        
        .timeline-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        #timeline-slider {
            flex-grow: 1;
        }
        
        #timeline-info {
            text-align: center;
            font-weight: bold;
            color: #00ffff;
        }
        
        .replay-actions {
            display: flex;
            justify-content: center;
            gap: 15px;
        }
        
        .replay-actions button {
            background-color: #006699;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        
        .replay-actions button:hover {
            background-color: #0088cc;
        }
        
        #play-pause-btn {
            width: 80px;
            background-color: #00aa00;
        }
        
        #play-pause-btn:hover {
            background-color: #00cc00;
        }
    `;
    
    document.head.appendChild(style);
}

// Set up event listeners for replay controls
function setupReplayControls() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const timelineSlider = document.getElementById('timeline-slider');
    const playbackSpeed = document.getElementById('playback-speed');
    const timelineInfo = document.getElementById('timeline-info');
    
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            replayData.isPlaying = !replayData.isPlaying;
            playPauseBtn.textContent = replayData.isPlaying ? '❚❚ Pause' : '▶ Play';
            
            if (replayData.isPlaying) {
                playReplay();
            }
        });
    }
    
    if (timelineSlider) {
        timelineSlider.addEventListener('input', () => {
            replayData.currentReplayFrame = parseInt(timelineSlider.value);
            updateTimelineInfo();
        });
    }
    
    if (playbackSpeed) {
        playbackSpeed.addEventListener('change', () => {
            replayData.playbackSpeed = parseFloat(playbackSpeed.value);
        });
    }
    
    updateTimelineInfo();
}

// Update the timeline info display
function updateTimelineInfo() {
    const timelineInfo = document.getElementById('timeline-info');
    if (!timelineInfo || replayData.frames.length === 0) return;
    
    const currentFrame = replayData.frames[replayData.currentReplayFrame];
    if (currentFrame) {
        timelineInfo.textContent = `Time: ${formatTime(currentFrame.timestamp)}`;
    }
}

// Play the replay animation
function playReplay() {
    if (!replayData.isPlaying) return;
    
    // Update slider position
    const timelineSlider = document.getElementById('timeline-slider');
    if (timelineSlider) {
        timelineSlider.value = replayData.currentReplayFrame;
    }
    
    // Update timeline info
    updateTimelineInfo();
    
    // Advance to next frame based on playback speed
    replayData.currentReplayFrame += replayData.playbackSpeed;
    
    // Loop back to start if we reach the end
    if (replayData.currentReplayFrame >= replayData.frames.length) {
        replayData.currentReplayFrame = 0;
    }
    
    // Schedule next frame
    setTimeout(playReplay, 1000 / 60);
}

// Generate a speed chart for the replay
function generateSpeedChart() {
    const canvas = document.getElementById('speedChart');
    if (!canvas || !replayData.frames.length) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up the chart area
    ctx.fillStyle = 'rgba(0, 20, 40, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
        const y = i * (canvas.height / gridSteps);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Speed (KPH)', 10, 15);
    
    // Draw max speed line
    const maxSpeed = replayData.metadata.maxSpeed;
    const yScale = canvas.height / (maxSpeed * 1.1); // Leave a little space at the top
    
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - (maxSpeed * yScale));
    ctx.lineTo(canvas.width, canvas.height - (maxSpeed * yScale));
    ctx.stroke();
    
    // Label max speed
    ctx.fillStyle = '#ff5050';
    ctx.fillText(`Max: ${Math.round(maxSpeed)} KPH`, canvas.width - 100, canvas.height - (maxSpeed * yScale) - 5);
    
    // Draw speed data
    const xScale = canvas.width / (replayData.frames.length - 1);
    
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    replayData.frames.forEach((frame, i) => {
        const x = i * xScale;
        const y = canvas.height - (Math.abs(frame.speed) * yScale);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        // Mark shots with dots
        if (frame.shotFired) {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    ctx.stroke();
}

// Generate a chart showing shot timing
function generateShotsChart() {
    const canvas = document.getElementById('shotsChart');
    if (!canvas || !replayData.frames.length) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up the chart area
    ctx.fillStyle = 'rgba(0, 20, 40, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Shots Fired: ${replayData.metadata.totalShots}`, 10, 15);
    
    // Draw shot markers
    const xScale = canvas.width / (replayData.frames.length - 1);
    
    ctx.fillStyle = '#ffaa00';
    replayData.frames.forEach((frame, i) => {
        if (frame.shotFired) {
            const x = i * xScale;
            ctx.fillRect(x - 1, 20, 3, canvas.height - 30);
        }
    });
}

// Generate a chart showing obstacle interactions
function generateObstacleChart() {
    const canvas = document.getElementById('obstacleChart');
    if (!canvas || !replayData.frames.length) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up the chart area
    ctx.fillStyle = 'rgba(0, 20, 40, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Obstacle Interactions`, 10, 15);
    
    // Draw obstacle collision markers in red
    const xScale = canvas.width / (replayData.frames.length - 1);
    
    ctx.fillStyle = '#ff0000';
    replayData.frames.forEach((frame, i) => {
        if (frame.obstacleCollision) {
            const x = i * xScale;
            ctx.fillRect(x - 1, 20, 3, canvas.height - 30);
            
            // Add a small label
            ctx.fillText('X', x - 3, 35);
        }
    });
    
    // Draw boost ramp markers in green
    ctx.fillStyle = '#00ff00';
    replayData.frames.forEach((frame, i) => {
        if (frame.boostRamp) {
            const x = i * xScale;
            ctx.fillRect(x - 1, 20, 3, canvas.height - 30);
            
            // Add a small label
            ctx.fillText('▲', x - 3, 50);
        }
    });
}

// Format time for display (mm:ss.ms)
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

// Record obstacle collision
export function recordObstacleCollision(tank, projectiles, enemies, currentLevel, gameMode) {
    if (!replayData.isRecording) return;
    
    // Force record a frame with the obstacle collision flag
    recordFrame(tank, projectiles, enemies, currentLevel, gameMode, true, false);
}

// Record boost ramp use
export function recordBoostRamp(tank, projectiles, enemies, currentLevel, gameMode) {
    if (!replayData.isRecording) return;
    
    // Force record a frame with the boost ramp flag
    recordFrame(tank, projectiles, enemies, currentLevel, gameMode, false, true);
} 