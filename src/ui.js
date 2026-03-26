import { TILE_SIZE, COLS, ROWS } from './map.js';

const CANVAS_W = COLS * TILE_SIZE;  // 560
const CANVAS_H = ROWS * TILE_SIZE;  // 620

export class UI {
  constructor(ctx) {
    this.ctx = ctx;
  }

  drawHUD(score, lives, level) {
    const ctx = this.ctx;
    // Top bar (above map area — we draw score/level in top margin of canvas)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, 0); // no extra top bar; scores overlaid

    // Score top-left
    ctx.fillStyle = '#fff';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText(`SCORE: ${score}`, 4, 12);

    // Level top-center
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${level}`, CANVAS_W / 2, 12);
    ctx.textAlign = 'left';

    // Lives as small pac-man icons bottom bar
    ctx.fillStyle = '#000';
    ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 20);

    for (let i = 0; i < lives; i++) {
      const x = 16 + i * 22;
      const y = CANVAS_H - 10;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, 8, 0.3, Math.PI * 2 - 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawStartScreen() {
    const ctx = this.ctx;
    this._overlay(0.75);
    this._bigText('PAC-MAN', CANVAS_W / 2, CANVAS_H / 2 - 60, '#FFD700', '32px');
    this._medText('Press SPACE or tap to Start', CANVAS_W / 2, CANVAS_H / 2, '#fff');
    this._smallText('Arrow Keys / WASD to move', CANVAS_W / 2, CANVAS_H / 2 + 30, '#aaa');
    this._smallText('Swipe on mobile', CANVAS_W / 2, CANVAS_H / 2 + 50, '#aaa');
  }

  drawPauseScreen() {
    const ctx = this.ctx;
    this._overlay(0.6);
    this._bigText('PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 20, '#FFD700', '28px');
    this._medText('Press SPACE to continue', CANVAS_W / 2, CANVAS_H / 2 + 20, '#fff');
  }

  drawGameOverScreen(score) {
    const ctx = this.ctx;
    this._overlay(0.8);
    this._bigText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 60, '#ff4444', '30px');
    this._medText(`Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2, '#fff');
    this._smallText('Press SPACE or tap to restart', CANVAS_W / 2, CANVAS_H / 2 + 40, '#aaa');
  }

  drawLevelWinScreen(level) {
    const ctx = this.ctx;
    this._overlay(0.7);
    this._bigText(`LEVEL ${level} CLEAR!`, CANVAS_W / 2, CANVAS_H / 2 - 40, '#00ff88', '26px');
    this._smallText('Get ready…', CANVAS_W / 2, CANVAS_H / 2 + 20, '#fff');
  }

  drawVictoryScreen(score) {
    const ctx = this.ctx;
    this._overlay(0.8);
    this._bigText('YOU WIN!', CANVAS_W / 2, CANVAS_H / 2 - 60, '#FFD700', '34px');
    this._medText(`Final Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2, '#fff');
    this._smallText('Press SPACE or tap to play again', CANVAS_W / 2, CANVAS_H / 2 + 40, '#aaa');
  }

  drawGetReady() {
    const ctx = this.ctx;
    this._medText('GET READY!', CANVAS_W / 2, CANVAS_H / 2, '#FFD700');
  }

  drawGhostScore(points, x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(points, x, y);
    ctx.textAlign = 'left';
  }

  _overlay(alpha) {
    this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  _bigText(text, x, y, color, size = '28px') {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = `bold ${size} "Courier New", monospace`;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  _medText(text, x, y, color) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  _smallText(text, x, y, color) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }
}
