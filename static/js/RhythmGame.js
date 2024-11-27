// js/RhythmGame.js
class RhythmGame {
    constructor() {
        console.log('Initializing RhythmGame...');
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.debugInfo = document.getElementById('debugInfo');

        // Initialize components
        this.assetLoader = new AssetLoader();
        this.songLoader = new SongLoader();
        this.hitFeedback = new HitFeedback();
        this.menuSystem = new MenuSystem(this);
        this.multiplayerHandler = new MultiplayerHandler(this);

        // Game state
        this.gameState = 'menu'; // 'menu', 'playing', 'multiplayer'
        this.currentSong = null;
        this.songStartTime = 0;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.score = 0;
        this.combo = 0;
        this.stats = { perfect: 0, good: 0, miss: 0 };
        this.keys = Object.fromEntries(CONFIG.KEYS.map(key => [key, false]));

        // Game objects
        this.arrows = [];
        this.nextArrowIndex = 0;  // Index for next arrow to spawn from song data

        // Target position
        this.targetY = this.canvas.height - 150;

        // Start initialization
        this.init();
    }

    async init() {
        try {
            console.log('Loading assets...');
            await this.assetLoader.loadAssets();
            await this.menuSystem.initialize(this.songLoader);

            console.log('Binding input handlers...');
            this.bindKeyHandlers();

            console.log('Starting game loop...');
            requestAnimationFrame(this.gameLoop.bind(this));
        } catch (error) {
            console.error('Game initialization failed:', error);
        }
    }

    bindKeyHandlers() {
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'menu') {
                this.menuSystem.handleInput(e.key);
                return;
            }

            if (this.keys.hasOwnProperty(e.key)) {
                if (!this.keys[e.key]) {
                    this.keys[e.key] = true;
                    document.getElementById(`key-${e.key}`).classList.add('active');
                    this.handleKeyPress(e.key);
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
                document.getElementById(`key-${e.key}`).classList.remove('active');
            }
        });
    }

    async startSong(songData) {
        this.currentSong = songData;
        this.gameState = 'playing';
        this.score = 0;
        this.combo = 0;
        this.stats = { perfect: 0, good: 0, miss: 0 };
        this.arrows = [];
        this.nextArrowIndex = 0;

        // Preload a few seconds of arrows
        this.updateArrowSpawning(0);

        // Start the song with a slight delay to allow for arrow preload
        setTimeout(() => {
            this.songStartTime = performance.now();
            this.currentSong.audio.currentTime = 0;
            this.currentSong.audio.play();
        }, 3000);
    }

    async initMultiplayer() {
        try {
            await this.multiplayerHandler.connect();
            this.gameState = 'multiplayer';
            this.multiplayerHandler.createRoom();
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
            // Handle connection failure (return to menu, show error, etc.)
        }
    }

    handleDisconnect() {
        // Handle multiplayer disconnect
        this.gameState = 'menu';
        // Show disconnect message
    }

    updateArrowSpawning(currentTime) {
        const songTime = currentTime - this.songStartTime;
        const spawnAheadTime = 2000; // Spawn arrows 2 seconds ahead

        while (
            this.nextArrowIndex < this.currentSong.arrows.length &&
            this.currentSong.arrows[this.nextArrowIndex].time <= songTime + spawnAheadTime
        ) {
            const arrowData = this.currentSong.arrows[this.nextArrowIndex];
            this.arrows.push(new Arrow(arrowData.lane, arrowData.time + this.songStartTime));
            this.nextArrowIndex++;
        }
    }

    handleKeyPress(key) {
        const laneIndex = CONFIG.KEYS.indexOf(key);
        let closestArrow = null;
        let closestDistance = Infinity;

        const currentTime = performance.now();

        this.arrows.forEach(arrow => {
            if (arrow.lane === laneIndex && !arrow.hit && !arrow.missed) {
                const distance = Math.abs(currentTime - arrow.targetTime);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestArrow = arrow;
                }
            }
        });

        if (closestArrow) {
            if (closestDistance <= CONFIG.TIMING.PERFECT_WINDOW) {
                this.registerHit('perfect', closestArrow);
            } else if (closestDistance <= CONFIG.TIMING.GOOD_WINDOW) {
                this.registerHit('good', closestArrow);
            }
        }
    }

    registerHit(type, arrow) {
        arrow.hit = true;
        this.hitFeedback.show(type);

        const baseScore = type === 'perfect' ?
            CONFIG.SCORING.PERFECT : CONFIG.SCORING.GOOD;
        this.score += baseScore * (1 + this.combo * CONFIG.SCORING.COMBO_MULTIPLIER);

        this.stats[type]++;
        this.combo++;
        this.updateUI();

        if (this.gameState === 'multiplayer') {
            this.multiplayerHandler.updateScore(this.score, this.combo);
        }
    }

    registerMiss(arrow) {
        if (!arrow.hit && !arrow.missed) {
            arrow.missed = true;
            this.stats.miss++;
            this.combo = 0;
            this.hitFeedback.show('miss');
            this.updateUI();

            if (this.gameState === 'multiplayer') {
                this.multiplayerHandler.updateScore(this.score, this.combo);
            }
        }
    }

    updateUI() {
        Utils.updateUIElement('scoreDisplay', Math.floor(this.score));
        Utils.updateUIElement('comboDisplay', this.combo);
        Utils.updateUIElement('perfectCount', this.stats.perfect);
        Utils.updateUIElement('goodCount', this.stats.good);
        Utils.updateUIElement('missCount', this.stats.miss);
    }

    gameLoop(currentTime) {
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        if (this.gameState === 'menu') {
            this.menuSystem.draw(this.ctx);
        } else {
            this.update(currentTime);
            this.draw();
        }

        this.debugInfo.textContent = `
            FPS: ${Math.round(1 / this.deltaTime)}
            Active Arrows: ${this.arrows.filter(a => !a.hit && !a.missed).length}
            ${this.currentSong ? `Song Time: ${((currentTime - this.songStartTime) / 1000).toFixed(2)}s` : ''}
        `;

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(currentTime) {
        if (this.gameState === 'playing' || this.gameState === 'multiplayer') {
            // Update arrow spawning based on song time
            if (this.currentSong) {
                this.updateArrowSpawning(currentTime);
            }

            // Update and clean up arrows
            this.arrows = this.arrows.filter(arrow => {
                // Update arrow position
                arrow.update(currentTime);

                // Check for misses
                if (!arrow.hit && !arrow.missed &&
                    currentTime > arrow.targetTime + CONFIG.TIMING.GOOD_WINDOW) {
                    this.registerMiss(arrow);
                }

                // Keep arrows that are either still on screen or recently hit
                return currentTime - arrow.targetTime < 1000;
            });

            // Check if song is finished
            if (this.currentSong &&
                this.nextArrowIndex >= this.currentSong.arrows.length &&
                this.arrows.length === 0) {
                this.gameState = 'menu';
                this.currentSong.audio.pause();
                this.currentSong = null;
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw lanes
        for (let i = 0; i < CONFIG.LANES.COUNT; i++) {
            const x = Utils.calculateLaneX(i);

            // Lane background
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(x, 0, CONFIG.LANES.WIDTH, this.canvas.height);

            // Target zone
            this.ctx.fillStyle = this.keys[CONFIG.KEYS[i]] ? '#666' : '#444';
            this.ctx.fillRect(x, this.targetY, CONFIG.LANES.WIDTH, 10);

            // Perfect zone indicator
            this.ctx.fillStyle = '#00ff0044';
            this.ctx.fillRect(
                x,
                this.targetY - CONFIG.TIMING.PERFECT_WINDOW,
                CONFIG.LANES.WIDTH,
                CONFIG.TIMING.PERFECT_WINDOW * 2
            );

            // Good zone indicator
            this.ctx.fillStyle = '#ffff0022';
            this.ctx.fillRect(
                x,
                this.targetY - CONFIG.TIMING.GOOD_WINDOW,
                CONFIG.LANES.WIDTH,
                CONFIG.TIMING.GOOD_WINDOW * 2
            );

            // Lane key label
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                CONFIG.KEYS[i].toUpperCase(),
                x + CONFIG.LANES.WIDTH / 2,
                this.targetY + 50
            );
        }

        // Draw arrows
        this.arrows.forEach(arrow => arrow.draw(this.ctx, this.assetLoader));

        // Draw multiplayer scores if in multiplayer mode
        if (this.gameState === 'multiplayer') {
            this.drawMultiplayerScores();
        }
    }

    drawMultiplayerScores() {
        const scores = Array.from(this.multiplayerHandler.players.entries());
        scores.forEach(([playerId, player], index) => {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                `${player.username}: ${player.score} (${player.combo}x)`,
                this.canvas.width - 20,
                30 + index * 25
            );
        });
    }
}
