export const TILE = {
  EMPTY: 0,
  WALL: 1,
  DOT: 2,
  PELLET: 3,
  PACMAN_SPAWN: 4,
  GHOST_SPAWN: 5,
};

export const TILE_SIZE = 20;
export const COLS = 28;
export const ROWS = 31;

export class Map {
  constructor() {
    this.tiles = [];
    this.dotCount = 0;
    this.config = {};
  }

  load(levelData) {
    this.config = levelData;
    this.tiles = levelData.tiles.map(row => [...row]);
    this.dotCount = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.tiles[r][c];
        if (t === TILE.DOT || t === TILE.PELLET) this.dotCount++;
      }
    }
  }

  getTile(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return TILE.WALL;
    return this.tiles[row][col];
  }

  isWall(col, row) {
    return this.getTile(col, row) === TILE.WALL;
  }

  removeDot(col, row) {
    const t = this.tiles[row][col];
    if (t === TILE.DOT || t === TILE.PELLET) {
      this.tiles[row][col] = TILE.EMPTY;
      this.dotCount--;
      return t;
    }
    return null;
  }

  getRemainingDots() {
    return this.dotCount;
  }

  /** Convert pixel position to tile column/row */
  pixelToTile(px, py) {
    return { col: Math.floor(px / TILE_SIZE), row: Math.floor(py / TILE_SIZE) };
  }

  /** Return pixel center of a tile */
  tileCenter(col, row) {
    return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
  }

  /** Find first tile matching given value */
  findTile(value) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.tiles[r][c] === value) return { col: c, row: r };
      }
    }
    return null;
  }

  /** Find all tiles matching given value */
  findAllTiles(value) {
    const results = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.tiles[r][c] === value) results.push({ col: c, row: r });
      }
    }
    return results;
  }

  /**
   * BFS from (startCol, startRow) to (targetCol, targetRow).
   * Returns the first direction to move, or null if no path.
   * walkableTiles: array of tile values considered passable (default excludes walls).
   */
  bfsNextDirection(startCol, startRow, targetCol, targetRow, excludeDir = null) {
    if (startCol === targetCol && startRow === targetRow) return null;

    const DIRS = [
      { dc: 0, dr: -1, name: 'up' },
      { dc: 0, dr: 1,  name: 'down' },
      { dc: -1, dr: 0, name: 'left' },
      { dc: 1,  dr: 0, name: 'right' },
    ];

    const key = (c, r) => r * COLS + c;
    const visited = new Set();
    visited.add(key(startCol, startRow));

    // Queue entries: { col, row, firstDir }
    const queue = [];

    for (const dir of DIRS) {
      if (excludeDir && dir.name === excludeDir) continue;
      const nc = startCol + dir.dc;
      const nr = startRow + dir.dr;
      // Allow wrapping on row 14 (tunnel)
      const wc = (nc + COLS) % COLS;
      if (!this.isWall(wc, nr)) {
        const k = key(wc, nr);
        if (!visited.has(k)) {
          visited.add(k);
          queue.push({ col: wc, row: nr, firstDir: dir.name });
        }
      }
    }

    let head = 0;
    while (head < queue.length) {
      const { col, row, firstDir } = queue[head++];
      if (col === targetCol && row === targetRow) return firstDir;

      for (const dir of DIRS) {
        const nc = col + dir.dc;
        const nr = row + dir.dr;
        const wc = (nc + COLS) % COLS;
        if (!this.isWall(wc, nr)) {
          const k = key(wc, nr);
          if (!visited.has(k)) {
            visited.add(k);
            queue.push({ col: wc, row: nr, firstDir });
          }
        }
      }
    }
    return null;
  }

  render(ctx) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.tiles[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (t === TILE.WALL) {
          ctx.fillStyle = '#1a1aff';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          // Inner shadow effect
          ctx.fillStyle = '#0000aa';
          ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else if (t === TILE.DOT) {
          ctx.fillStyle = '#ffb8ae';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (t === TILE.PELLET) {
          ctx.fillStyle = '#ffb8ae';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
