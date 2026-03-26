import { Map, TILE, TILE_SIZE, COLS, ROWS } from './map.js';
import { Pacman } from './pacman.js';
import { Ghost } from './ghost.js';
import { InputHandler } from './inputHandler.js';
import { UI } from './ui.js';
import { SoundManager } from './soundManager.js';

const STATE = {
  START:      'start',
  GET_READY:  'getReady',
  PLAYING:    'playing',
  PAUSED:     'paused',
  DYING:      'dying',
  LEVEL_WIN:  'levelWin',
  GAME_OVER:  'gameOver',
  VICTORY:    'victory',
};

const LEVEL_FILES = ['levels/level1.json', 'levels/level2.json'];
const INITIAL_LIVES = 3;
const DOT_POINTS    = 10;
const PELLET_POINTS = 50;
const GHOST_BASE    = 200;

class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.map    = new Map();
    this.input  = new InputHandler();
    this.ui     = new UI(this.ctx);
    this.sound  = new SoundManager();

    this.pacman = null;
    this.ghosts = [];

    this.score  = 0;
    this.lives  = INITIAL_LIVES;
    this.levelIndex = 0;
    this.state  = STATE.START;
    this.stateTimer = 0;

    this.ghostEatMultiplier = 1;
    this.frightenedFlash = false;
    this._flashTimer = 0;
    this._transitioning = false;

    // Ghost score popup
    this.scorePopups = [];

    this._lastTime = 0;
    this._rafId = null;

    // Pause / start via space or tap
    canvas.addEventListener('click', () => this._onAction());
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); this._onAction(); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Escape') { e.preventDefault(); this._onAction(); }
    });

    this._loadLevel(this.levelIndex).then(() => this._startLoop());
  }

  async _loadLevel(idx) {
    const url = LEVEL_FILES[idx];
    const res  = await fetch(url);
    const data = await res.json();
    this.map.load(data);
    this.pacman = new Pacman(this.map);
    this.ghosts = [0, 1, 2, 3].map(i => new Ghost(this.map, i));
    this.ghostEatMultiplier = 1;
  }

  _onAction() {
    this.sound.resume();
    switch (this.state) {
      case STATE.START:
        this._enterGetReady();
        break;
      case STATE.PLAYING:
        this.state = STATE.PAUSED;
        break;
      case STATE.PAUSED:
        this.state = STATE.PLAYING;
        break;
      case STATE.GAME_OVER:
        this._restart();
        break;
      case STATE.VICTORY:
        this._restart();
        break;
    }
  }

  _enterGetReady() {
    this.state = STATE.GET_READY;
    this.stateTimer = 2000; // 2s countdown
  }

  async _restart() {
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.levelIndex = 0;
    this._transitioning = false;
    await this._loadLevel(0);
    this._enterGetReady();
  }

  async _nextLevel() {
    this.levelIndex++;
    if (this.levelIndex >= LEVEL_FILES.length) {
      this.state = STATE.VICTORY;
      this._transitioning = false;
      this.sound.levelWin();
      return;
    }
    await this._loadLevel(this.levelIndex);
    this._transitioning = false;
    this._enterGetReady();
  }

  _startLoop() {
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _loop(timestamp) {
    const dt = Math.min(timestamp - this._lastTime, 50); // cap at 50ms
    this._lastTime = timestamp;

    this._update(dt);
    this._render();

    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _update(dt) {
    switch (this.state) {
      case STATE.GET_READY:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = STATE.PLAYING;
        break;

      case STATE.PLAYING:
        this._updatePlaying(dt);
        break;

      case STATE.DYING:
        this.pacman.update();
        if (this.pacman.isDeathDone()) {
          this.lives--;
          if (this.lives <= 0) {
            this.state = STATE.GAME_OVER;
            this.sound.gameOver();
          } else {
            this.pacman.reset();
            this.ghosts.forEach(g => g.reset());
            this._enterGetReady();
          }
        }
        break;

      case STATE.LEVEL_WIN:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0 && !this._transitioning) {
          this._transitioning = true;
          this._nextLevel();
        }
        break;
    }
  }

  _updatePlaying(dt) {
    // Input
    const queued = this.input.getQueuedDirection();
    if (queued) { this.pacman.setNextDir(queued); this.input.consumeDirection(); }

    // Frightened flash (last 2 seconds)
    const minFrightened = this.ghosts.reduce((m, g) =>
      g.mode === 'frightened' ? Math.min(m, g.frightenedTimer) : m, Infinity);
    this._flashTimer += dt;
    if (minFrightened < 2000 && minFrightened !== Infinity) {
      this.frightenedFlash = (Math.floor(this._flashTimer / 250) % 2 === 0);
    } else {
      this.frightenedFlash = false;
    }

    // Update entities
    this.pacman.update();
    this.ghosts.forEach(g => g.update(dt, this.pacman));

    // Pac-Man tile
    const pc = this.pacman.col;
    const pr = this.pacman.row;

    // Dot / Pellet collection
    const removed = this.map.removeDot(pc, pr);
    if (removed === TILE.DOT) {
      this.score += DOT_POINTS;
      this.sound.eatDot();
    } else if (removed === TILE.PELLET) {
      this.score += PELLET_POINTS;
      this.sound.eatPellet();
      this.ghostEatMultiplier = 1;
      this.ghosts.forEach(g => g.frighten(this.map.config.frightenedDuration || 8000));
    }

    // Ghost collision
    for (const ghost of this.ghosts) {
      if (!ghost.active) continue;
      const dx = Math.abs(ghost.x - this.pacman.x);
      const dy = Math.abs(ghost.y - this.pacman.y);
      if (dx < TILE_SIZE * 0.7 && dy < TILE_SIZE * 0.7) {
        if (ghost.isEatable()) {
          ghost.eat();
          const pts = GHOST_BASE * this.ghostEatMultiplier;
          this.score += pts;
          this.ghostEatMultiplier *= 2;
          this.sound.eatGhost();
          this.scorePopups.push({ x: ghost.x, y: ghost.y, pts, timer: 1500 });
        } else if (ghost.mode !== 'eaten') {
          // Death
          this.pacman.startDeath();
          this.state = STATE.DYING;
          this.sound.death();
          this.ghosts.forEach(g => g.active = false);
          return;
        }
      }
    }

    // Score popups
    this.scorePopups = this.scorePopups.filter(p => { p.timer -= dt; return p.timer > 0; });

    // Win condition
    if (this.map.getRemainingDots() === 0) {
      this.state = STATE.LEVEL_WIN;
      this.stateTimer = 3000;
      this.sound.levelWin();
    }
  }

  _render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.map.render(ctx);
    this.pacman.draw(ctx);
    this.ghosts.forEach(g => g.draw(ctx, this.frightenedFlash));

    // Score popups
    for (const p of this.scorePopups) {
      this.ui.drawGhostScore(p.pts, p.x, p.y);
    }

    this.ui.drawHUD(this.score, this.lives, this.levelIndex + 1);

    // Overlays
    switch (this.state) {
      case STATE.START:      this.ui.drawStartScreen(); break;
      case STATE.GET_READY:  this.ui.drawGetReady(); break;
      case STATE.PAUSED:     this.ui.drawPauseScreen(); break;
      case STATE.GAME_OVER:  this.ui.drawGameOverScreen(this.score); break;
      case STATE.LEVEL_WIN:  this.ui.drawLevelWinScreen(this.levelIndex + 1); break;
      case STATE.VICTORY:    this.ui.drawVictoryScreen(this.score); break;
    }
  }
}

// Bootstrap
const canvas = document.getElementById('gameCanvas');
new GameEngine(canvas);
