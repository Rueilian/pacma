import { TILE, TILE_SIZE, COLS } from './map.js';

const DIR_VECTOR = {
  up:    { dx: 0,  dy: -1 },
  down:  { dx: 0,  dy: 1  },
  left:  { dx: -1, dy: 0  },
  right: { dx: 1,  dy: 0  },
};

export class Pacman {
  constructor(map) {
    this.map = map;
    this.reset();
  }

  reset() {
    const spawn = this.map.findTile(TILE.PACMAN_SPAWN);
    const col = spawn ? spawn.col : 13;
    const row = spawn ? spawn.row : 23;
    const center = this.map.tileCenter(col, row);
    this.x = center.x;
    this.y = center.y;
    this.col = col;
    this.row = row;
    this.dir = 'left';
    this.nextDir = 'left';
    this.speed = (this.map.config.pacmanSpeed || 2);
    this.mouthAngle = 0;
    this.mouthDir = 1;       // 1 = opening, -1 = closing
    this.mouthSpeed = 0.15;  // radians per frame
    this.alive = true;
    this.deathFrame = 0;
    this.dying = false;
  }

  setNextDir(dir) {
    if (dir) this.nextDir = dir;
  }

  /** Returns true if the pixel position is close enough to a tile center to turn */
  _nearCenter() {
    const { x: cx, y: cy } = this.map.tileCenter(this.col, this.row);
    return Math.abs(this.x - cx) < this.speed + 1 && Math.abs(this.y - cy) < this.speed + 1;
  }

  _snapToCenter() {
    const { x: cx, y: cy } = this.map.tileCenter(this.col, this.row);
    this.x = cx;
    this.y = cy;
  }

  _canMove(dir) {
    const v = DIR_VECTOR[dir];
    const nextCol = (this.col + v.dx + COLS) % COLS;
    const nextRow = this.row + v.dy;
    const t = this.map.getTile(nextCol, nextRow);
    return t !== TILE.WALL;
  }

  update() {
    if (this.dying) {
      this.deathFrame++;
      return;
    }

    // Animate mouth
    this.mouthAngle += this.mouthDir * this.mouthSpeed;
    if (this.mouthAngle >= Math.PI / 4) { this.mouthAngle = Math.PI / 4; this.mouthDir = -1; }
    if (this.mouthAngle <= 0)           { this.mouthAngle = 0;           this.mouthDir = 1;  }

    if (this._nearCenter()) {
      this._snapToCenter();
      this.col = Math.round(this.x / TILE_SIZE - 0.5);
      this.row = Math.round(this.y / TILE_SIZE - 0.5);
      // Wrap tunnel
      this.col = (this.col + COLS) % COLS;

      // Try queued direction first
      if (this.nextDir && this._canMove(this.nextDir)) {
        this.dir = this.nextDir;
      }
      // If can't move in current direction, stop
      if (!this._canMove(this.dir)) return;
    }

    const v = DIR_VECTOR[this.dir];
    this.x += v.dx * this.speed;
    this.y += v.dy * this.speed;

    // Update tile coords from pixel position
    this.col = Math.floor(this.x / TILE_SIZE);
    this.row = Math.floor(this.y / TILE_SIZE);
    this.col = (this.col + COLS) % COLS;
  }

  startDeath() {
    this.dying = true;
    this.deathFrame = 0;
  }

  isDeathDone() {
    return this.dying && this.deathFrame > 60; // 1 second @ 60fps
  }

  draw(ctx) {
    if (!this.alive) return;

    const r = TILE_SIZE / 2 - 1;
    const x = this.x;
    const y = this.y;

    if (this.dying) {
      // Shrink animation
      const progress = Math.min(this.deathFrame / 60, 1);
      const angle = progress * Math.PI;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r * (1 - progress * 0.5), angle, Math.PI * 2 - angle);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Rotation based on direction
    const rotMap = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    const rot = rotMap[this.dir] || 0;

    const mouth = this.mouthAngle + 0.05;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, mouth, Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(r * 0.2, -r * 0.5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
