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

    // Game state
    this.gameState = 'menu';

    this.pauseMenu = {
      selectedOption: 0,
      options: CONFIG.MENUS.PAUSE.OPTIONS
    };

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
      console.log('Key pressed:', e.key);

      if (e.key === 'Escape') {
        if (this.gameState === 'playing') {
          this.pauseGame();
        } else if (this.gameState === 'paused') {
          this.resumeGame();
        }
        return;
      }

      // Handle pause menu navigation
      if (this.gameState === 'paused') {
        this.handlePauseMenuInput(e.key);
        return;
      }

      if (this.gameState === 'menu') {
        this.menuSystem.handleInput(e.key);
        return;
      }

      // Normal gameplay input
      if (this.keys.hasOwnProperty(e.key)) {
        if (!this.keys[e.key]) {
          this.keys[e.key] = true;
          document.getElementById(`key-${e.key}`).classList.add('active');
          this.handleKeyPress(e.key);
        }
      }

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

  startSong(songData) {
    console.log('Starting song:', songData.title);
    this.currentSong = songData;
    this.gameState = 'playing';
    this.score = 0;
    this.combo = 0;
    this.stats = { perfect: 0, good: 0, miss: 0 };
    this.arrows = [];
    this.nextArrowIndex = 0;

    setTimeout(() => {
      this.songStartTime = performance.now();
      console.log('Song started at:', this.songStartTime);
      this.currentSong.audio.currentTime = 0;
      this.currentSong.audio.play();
    }, 3000);
  }

  updateArrowSpawning(currentTime) {
    const songTime = currentTime - this.songStartTime;

    while (
      this.nextArrowIndex < this.currentSong.arrows.length &&
      this.currentSong.arrows[this.nextArrowIndex].time <= songTime + CONFIG.TIMING.SPAWN_AHEAD
    ) {
      // Get all arrows that should spawn in this frame
      const nextArrows = this.currentSong.arrows.filter((arrow, index) => {
        return index >= this.nextArrowIndex &&
          arrow.time <= songTime + CONFIG.TIMING.SPAWN_AHEAD &&
          arrow.time > songTime + CONFIG.TIMING.SPAWN_AHEAD - 16; // Group within same frame
      });

      if (nextArrows.length === 0) break;

      nextArrows.forEach(arrowData => {
        const targetTime = arrowData.time + this.songStartTime;
        this.arrows.push(new Arrow(arrowData.lane, targetTime, arrowData.groupId));
      });

      this.nextArrowIndex += nextArrows.length;
    }
  }

  handleKeyPress(key) {
    const laneIndex = CONFIG.KEYS.indexOf(key);
    const currentTime = performance.now();

    // Find all arrows in this lane that could be hit
    const hitableArrows = this.arrows.filter(arrow => {
      if (arrow.lane === laneIndex && !arrow.hit && !arrow.missed) {
        const arrowY = arrow.calculateY(currentTime);
        const distanceFromTarget = Math.abs(arrowY - CONFIG.GAMEPLAY.TARGET_Y);
        const timeDistance = (distanceFromTarget / CONFIG.GAMEPLAY.TARGET_Y) * CONFIG.TIMING.SPAWN_AHEAD;
        return timeDistance <= CONFIG.TIMING.GOOD_WINDOW;
      }
      return false;
    });

    if (hitableArrows.length > 0) {
      // Find the closest arrow to the target line
      const closestArrow = hitableArrows.reduce((closest, current) => {
        const currentY = current.calculateY(currentTime);
        const currentDistance = Math.abs(currentY - CONFIG.GAMEPLAY.TARGET_Y);
        const closestY = closest.calculateY(currentTime);
        const closestDistance = Math.abs(closestY - CONFIG.GAMEPLAY.TARGET_Y);
        return currentDistance < closestDistance ? current : closest;
      }, hitableArrows[0]);

      const arrowY = closestArrow.calculateY(currentTime);
      const distanceFromTarget = Math.abs(arrowY - CONFIG.GAMEPLAY.TARGET_Y);
      const timeDistance = (distanceFromTarget / CONFIG.GAMEPLAY.TARGET_Y) * CONFIG.TIMING.SPAWN_AHEAD;

      // Check if other arrows in the same group are ready to be hit
      const groupArrows = this.arrows.filter(arrow =>
        arrow.groupId === closestArrow.groupId &&
        !arrow.hit &&
        !arrow.missed
      );

      if (timeDistance <= CONFIG.TIMING.PERFECT_WINDOW) {
        this.registerHit('perfect', closestArrow, groupArrows);
      } else if (timeDistance <= CONFIG.TIMING.GOOD_WINDOW) {
        this.registerHit('good', closestArrow, groupArrows);
      }
    }
  }

  registerHit(type, arrow, groupArrows) {
    // Mark all arrows in the group as hit
    groupArrows.forEach(groupArrow => {
      groupArrow.hit = true;
    });

    this.hitFeedback.show(type);

    const baseScore = type === 'perfect' ?
      CONFIG.SCORING.PERFECT : CONFIG.SCORING.GOOD;

    // Award score based on how many arrows were in the group
    this.score += baseScore * groupArrows.length *
      (1 + this.combo * CONFIG.SCORING.COMBO_MULTIPLIER);

    this.stats[type]++;
    this.combo++;
    this.updateUI();
  }

  registerMiss(arrow) {
    if (!arrow.hit && !arrow.missed) {
      // Find all arrows in the same group
      const groupArrows = this.arrows.filter(a =>
        a.groupId === arrow.groupId &&
        !a.hit &&
        !a.missed
      );

      // Mark all group arrows as missed
      groupArrows.forEach(groupArrow => {
        groupArrow.missed = true;
      });

      this.stats.miss++;
      this.combo = 0;
      this.hitFeedback.show('miss');
      this.updateUI();
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

    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.gameState === 'menu') {
      this.menuSystem.draw(this.ctx);
    } else if (this.gameState === 'playing') {
      this.update(currentTime);
      this.draw();
    } else if (this.gameState === 'paused') {
      // Draw the game state underneath
      this.draw();
      // Draw the pause menu overlay
      this.drawPauseMenu();
    }

    this.debugInfo.textContent = `
          FPS: ${Math.round(1 / this.deltaTime)}
          State: ${this.gameState}
          Active Arrows: ${this.arrows.filter(a => !a.hit && !a.missed).length}
          ${this.currentSong ? `Song Time: ${((currentTime - this.songStartTime) / 1000).toFixed(2)}s` : ''}
      `;

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(currentTime) {
    if (this.gameState === 'playing' && this.currentSong) {
      // Spawn new arrows
      this.updateArrowSpawning(currentTime);

      // Update and clean up arrows
      this.arrows = this.arrows.filter(arrow => {
        arrow.update(currentTime);

        // Check for misses
        const arrowY = arrow.calculateY(currentTime);
        if (!arrow.hit && !arrow.missed &&
          arrowY > CONFIG.GAMEPLAY.TARGET_Y + CONFIG.TIMING.GOOD_WINDOW) {
          this.registerMiss(arrow);
        }

        // Keep arrows that haven't gone too far past the target
        return arrowY < CONFIG.CANVAS.HEIGHT + CONFIG.ARROWS.SIZE;
      });

      // Check if song is finished
      if (this.nextArrowIndex >= this.currentSong.arrows.length &&
        this.arrows.length === 0 &&
        currentTime - this.songStartTime > this.currentSong.audio.duration * 1000) {
        console.log('Song finished');
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
  }


  pauseGame() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.currentSong.audio.pause();
      this.pauseTime = performance.now();
    }
  }

  resumeGame() {
    if (this.gameState === 'paused') {
      const pauseDuration = performance.now() - this.pauseTime;
      // Adjust all timing-related values by pause duration
      this.songStartTime += pauseDuration;
      this.arrows.forEach(arrow => {
        arrow.targetTime += pauseDuration;
      });

      this.gameState = 'playing';
      this.currentSong.audio.play();
    }
  }

  handlePauseMenuInput(key) {
    switch (key) {
      case 'ArrowUp':
        this.pauseMenu.selectedOption = (this.pauseMenu.selectedOption - 1 + this.pauseMenu.options.length) % this.pauseMenu.options.length;
        break;
      case 'ArrowDown':
        this.pauseMenu.selectedOption = (this.pauseMenu.selectedOption + 1) % this.pauseMenu.options.length;
        break;
      case 'Enter':
        this.executePauseMenuOption();
        break;
    }
  }

  executePauseMenuOption() {
    switch (this.pauseMenu.options[this.pauseMenu.selectedOption]) {
      case 'Resume':
        this.resumeGame();
        break;
      case 'Restart':
        this.currentSong.audio.pause();
        this.currentSong.audio.currentTime = 0;
        this.startSong(this.currentSong);
        break;
      case 'Exit to Menu':
        this.currentSong.audio.pause();
        this.gameState = 'menu';
        this.currentSong = null;
        break;
    }
  }

  drawPauseMenu() {
    // Darken the background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw pause menu
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('PAUSED', this.canvas.width / 2, 200);

    // Draw options
    this.ctx.font = '32px Arial';
    this.pauseMenu.options.forEach((option, index) => {
      this.ctx.fillStyle = index === this.pauseMenu.selectedOption ?
        CONFIG.MENUS.PAUSE.SELECTED_COLOR :
        CONFIG.MENUS.PAUSE.UNSELECTED_COLOR;
      this.ctx.fillText(
        option,
        this.canvas.width / 2,
        300 + (index * 50)
      );
    });
  }

}
