const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class InputHandler {
  constructor() {
    this.queuedDir = null;
    this._touchStartX = 0;
    this._touchStartY = 0;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchend', this._onTouchEnd, { passive: true });

    // D-pad buttons
    const btnMap = {
      'btn-up': 'up', 'btn-down': 'down',
      'btn-left': 'left', 'btn-right': 'right',
    };
    for (const [id, dir] of Object.entries(btnMap)) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('touchstart', e => { e.stopPropagation(); this.queuedDir = dir; }, { passive: true });
        el.addEventListener('mousedown', () => { this.queuedDir = dir; });
      }
    }
  }

  _onKeyDown(e) {
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': this.queuedDir = 'up';    e.preventDefault(); break;
      case 'ArrowDown':  case 's': case 'S': this.queuedDir = 'down';  e.preventDefault(); break;
      case 'ArrowLeft':  case 'a': case 'A': this.queuedDir = 'left';  e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': this.queuedDir = 'right'; e.preventDefault(); break;
    }
  }

  _onTouchStart(e) {
    const t = e.touches[0];
    this._touchStartX = t.clientX;
    this._touchStartY = t.clientY;
  }

  _onTouchEnd(e) {
    const t = e.changedTouches[0];
    const dx = t.clientX - this._touchStartX;
    const dy = t.clientY - this._touchStartY;
    const THRESHOLD = 30;
    if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.queuedDir = dx > 0 ? 'right' : 'left';
    } else {
      this.queuedDir = dy > 0 ? 'down' : 'up';
    }
  }

  /** Consume and return the queued direction */
  getQueuedDirection() {
    const dir = this.queuedDir;
    return dir;
  }

  /** Call after applying direction to clear it */
  consumeDirection() {
    this.queuedDir = null;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchend', this._onTouchEnd);
  }
}
