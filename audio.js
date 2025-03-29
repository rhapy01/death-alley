// Audio manager for handling game sounds and music
class AudioManager {
    constructor() {
        this.backgroundMusic = new Audio('sounds/background.mp3');
        this.shootSound = new Audio('sounds/shoot.mp3');
        
        // Configure background music
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3; // 30% volume for background music
        
        // Configure shoot sound
        this.shootSound.volume = 0.4; // 40% volume for shooting
        
        // Initialize mute state
        this.isMuted = false;
        
        // Add error handling for audio loading
        this.backgroundMusic.onerror = () => console.error('Error loading background music');
        this.shootSound.onerror = () => console.error('Error loading shoot sound');
    }

    // Start playing background music
    startBackgroundMusic() {
        if (!this.isMuted) {
            this.backgroundMusic.play().catch(error => {
                console.error('Error playing background music:', error);
            });
        }
    }

    // Stop background music
    stopBackgroundMusic() {
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
    }

    // Play shoot sound
    playShootSound() {
        if (!this.isMuted) {
            // Clone the audio to allow multiple simultaneous plays
            const shootSoundClone = this.shootSound.cloneNode();
            shootSoundClone.play().catch(error => {
                console.error('Error playing shoot sound:', error);
            });
        }
    }

    // Toggle mute state
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.backgroundMusic.muted = this.isMuted;
        return this.isMuted;
    }

    // Set volume for all sounds
    setVolume(volume) {
        const normalizedVolume = Math.max(0, Math.min(1, volume));
        this.backgroundMusic.volume = normalizedVolume * 0.3;
        this.shootSound.volume = normalizedVolume * 0.4;
    }
}

// Create and export a single instance
export const audioManager = new AudioManager(); 