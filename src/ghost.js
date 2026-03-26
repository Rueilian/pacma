import { TILE, TILE_SIZE, COLS, ROWS } from './map.js';

const GHOST_MODE = { SCATTER: 'scatter', CHASE: 'chase', FRIGHTENED: 'frightened', EATEN: 'eaten' };

const DIR_VECTOR = {
  up:    { dx: 0,  dy: -1 },
  down:  { dx: 0,  dy: 1  },
  left:  { dx: -1, dy: 0  },
  right: { dx: 1,  dy: 0  },
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// Fixed scatter corners per ghost index
const SCATTER_CORNERS = [
  { col: 25, row: 0  }, // Blinky - top-right
  { col: 2,  row: 0  }, // Pinky  - top-left
  { col: 27, row: 30 }, // Inky   - bottom-right
  { col: 0,  row: 30 }, // Clyde  - bottom-left
];

const GHOST_COLORS = ['#FF0000', '#FFB8FF', '#00FFFF', '#FFB852'];
const GHOST_NAMES  = ['Blinky', 'Pinky', 'Inky', 'Clyde'];

// Mode schedule (ms): [scatter, chase, scatter, chase, ...]
const MODE_SCHEDULE = [7000, 20000, 7000, 20000, 5000, 20000, 5000, Infinity];

export class Ghost {
  constructor(map, index) {
    this.map = map;
    this.index = index;
    this.color = GHOST_COLORS[index];
    this.name  = GHOST_NAMES[index];
    this.reset();
  }

  reset() {
    const spawns = this.map.findAllTiles(TILE.GHOST_SPAWN);
    const spawn = spawns[this.index % spawns.length] || { col: 13, row: 14 };
    const center = this.map.tileCenter(spawn.col, spawn.row);
    this.x = center.x;
    this.y = center.y;
    this.col = spawn.col;
    this.row = spawn.row;
    this.dir = 'left';
    this.mode = GHOST_MODE.SCATTER;
    this.speed = this.map.config.ghostSpeed || 1.5;
    this.modeTimer = 0;
    this.modeIndex = 0;
    this.frightenedTimer = 0;
    this.active = false;       // wait before leaving house
    this.releaseDelay = index * 3000; // stagger release
    this.releaseTimer = 0;
    this.eyeBlinkTimer = 0;
    this.eaten = false;
  }

  frighten(duration) {
    if (this.mode === GHOST_MODE.EATEN) return;
    this.mode = GHOST_MODE.FRIGHTENED;
    this.frightenedTimer = duration;
    // Reverse direction
    this.dir = OPPOSITE[this.dir] || 'up';
  }

  eat() {
    this.mode = GHOST_MODE.EATEN;
    this.eaten = true;
  }

  isEatable() {
    return this.mode === GHOST_MODE.FRIGHTENED;
  }

  _snapToCenter() {
    const { x: cx, y: cy } = this.map.tileCenter(this.col, this.row);
    this.x = cx;
    this.y = cy;
  }

  _nearCenter() {
    const { x: cx, y: cy } = this.map.tileCenter(this.col, this.row);
    return Math.abs(this.x - cx) <= this.speed + 1 && Math.abs(this.y - cy) <= this.speed + 1;
  }

  _canMoveDir(col, row, dir) {
    const v = DIR_VECTOR[dir];
    const nc = (col + v.dx + COLS) % COLS;
    const nr = row + v.dy;
    return !this.map.isWall(nc, nr);
  }

  _chooseDirection(targetCol, targetRow) {
    const opp = OPPOSITE[this.dir];
    const dirs = ['up', 'down', 'left', 'right'].filter(d => {
      if (d === opp) return false;
      return this._canMoveDir(this.col, this.row, d);
    });

    if (dirs.length === 0) return OPPOSITE[this.dir]; // stuck, reverse

    if (this.mode === GHOST_MODE.FRIGHTENED) {
      // Random
      return dirs[Math.floor(Math.random() * dirs.length)];
    }

    // Use BFS for reliable pathfinding
    const nextDir = this.map.bfsNextDirection(this.col, this.row, targetCol, targetRow, opp);
    if (nextDir && dirs.includes(nextDir)) return nextDir;

    // Fallback: pick dir that minimizes Manhattan distance to target
    let best = null, bestDist = Infinity;
    for (const d of dirs) {
      const v = DIR_VECTOR[d];
      const nc = (this.col + v.dx + COLS) % COLS;
      const nr = this.row + v.dy;
      const dist = Math.abs(nc - targetCol) + Math.abs(nr - targetRow);
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    return best || dirs[0];
  }

  _getTarget(pacman) {
    if (this.mode === GHOST_MODE.SCATTER) {
      return SCATTER_CORNERS[this.index];
    }
    if (this.mode === GHOST_MODE.EATEN) {
      return this.map.findAllTiles(TILE.GHOST_SPAWN)[0] || { col: 13, row: 14 };
    }
    // CHASE
    switch (this.index) {
      case 0: // Blinky: target Pac-Man directly
        return { col: pacman.col, row: pacman.row };
      case 1: // Pinky: 4 tiles ahead of Pac-Man
        {
          const v = DIR_VECTOR[pacman.dir] || { dx: 0, dy: 0 };
          return { col: pacman.col + v.dx * 4, row: pacman.row + v.dy * 4 };
        }
      case 2: // Inky: uses Blinky position (index 0) — simplified to random patrol
        return { col: pacman.col, row: pacman.row };
      case 3: // Clyde: chase when far, scatter when close
        {
          const dist = Math.abs(this.col - pacman.col) + Math.abs(this.row - pacman.row);
          return dist > 8 ? { col: pacman.col, row: pacman.row } : SCATTER_CORNERS[3];
        }
      default:
        return { col: pacman.col, row: pacman.row };
    }
  }

  update(dt, pacman) {
    if (!this.active) {
      this.releaseTimer += dt;
      if (this.releaseTimer >= this.releaseDelay) this.active = true;
      else return;
    }

    // Mode timers
    if (this.mode === GHOST_MODE.FRIGHTENED) {
      this.frightenedTimer -= dt;
      if (this.frightenedTimer <= 0) {
        this.mode = GHOST_MODE.SCATTER;
        this.modeIndex = 0;
        this.modeTimer = 0;
      }
    } else if (this.mode !== GHOST_MODE.EATEN) {
      this.modeTimer += dt;
      const limit = MODE_SCHEDULE[this.modeIndex] || Infinity;
      if (this.modeTimer >= limit) {
        this.modeTimer = 0;
        this.modeIndex++;
        this.mode = (this.modeIndex % 2 === 0) ? GHOST_MODE.SCATTER : GHOST_MODE.CHASE;
      }
    }

    // Return home when eaten
    if (this.mode === GHOST_MODE.EATEN) {
      const home = this.map.findAllTiles(TILE.GHOST_SPAWN)[0] || { col: 13, row: 14 };
      if (this.col === home.col && this.row === home.row) {
        this.eaten = false;
        this.mode = GHOST_MODE.SCATTER;
        this.modeIndex = 0;
        this.modeTimer = 0;
      }
    }

    const currentSpeed = this.mode === GHOST_MODE.FRIGHTENED ? this.speed * 0.5 :
                         this.mode === GHOST_MODE.EATEN       ? this.speed * 2   : this.speed;

    if (this._nearCenter()) {
      this._snapToCenter();
      this.col = Math.round(this.x / TILE_SIZE - 0.5);
      this.row = Math.round(this.y / TILE_SIZE - 0.5);
      this.col = (this.col + COLS) % COLS;

      const target = this._getTarget(pacman);
      this.dir = this._chooseDirection(target.col, target.row);
    }

    if (this._canMoveDir(this.col, this.row, this.dir)) {
      const v = DIR_VECTOR[this.dir];
      this.x += v.dx * currentSpeed;
      this.y += v.dy * currentSpeed;
      this.col = Math.floor(this.x / TILE_SIZE);
      this.row = Math.floor(this.y / TILE_SIZE);
      this.col = (this.col + COLS) % COLS;
    }
  }

  draw(ctx, frightenedFlash) {
    if (!this.active) return;

    const x = this.x;
    const y = this.y;
    const r = TILE_SIZE / 2 - 1;

    let bodyColor = this.color;
    if (this.mode === GHOST_MODE.FRIGHTENED) {
      bodyColor = frightenedFlash ? '#ffffff' : '#2121DE';
    } else if (this.mode === GHOST_MODE.EATEN) {
      // Draw only eyes when eaten
      this._drawEyes(ctx, x, y, r, true);
      return;
    }

    // Ghost body: D-shape (half circle top, rectangular bottom with wavy edge)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.1, r, Math.PI, 0, false); // semi-circle top
    ctx.lineTo(x + r, y + r);

    // Wavy bottom
    const waves = 3;
    const waveWidth = (r * 2) / waves;
    for (let i = waves; i >= 0; i--) {
      const wx = x + r - i * waveWidth;
      const wy = (i % 2 === 0) ? y + r - 4 : y + r;
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(x - r, y + r);
    ctx.closePath();
    ctx.fill();

    this._drawEyes(ctx, x, y, r, false);
  }

  _drawEyes(ctx, x, y, r, eatMode) {
    const eyeOffsetX = r * 0.35;
    const eyeOffsetY = r * 0.1;
    const eyeR = r * 0.25;
    const irisR = r * 0.15;

    const v = DIR_VECTOR[this.dir] || { dx: 1, dy: 0 };

    for (const side of [-1, 1]) {
      const ex = x + side * eyeOffsetX;
      const ey = y - eyeOffsetY;

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00f';
      ctx.beginPath();
      ctx.arc(ex + v.dx * irisR, ey + v.dy * irisR, irisR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (eatMode) return;

    // Frightened mouth
    if (this.mode === GHOST_MODE.FRIGHTENED) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y + r * 0.3);
      ctx.lineTo(x - r * 0.25, y + r * 0.2);
      ctx.lineTo(x, y + r * 0.35);
      ctx.lineTo(x + r * 0.25, y + r * 0.2);
      ctx.lineTo(x + r * 0.5, y + r * 0.3);
      ctx.stroke();
    }
  }
}
