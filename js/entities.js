class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 26;
    this.h = 30;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.invuln = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.invuln = 0;
  }
}

class Enemy {
  constructor(x, y, minX, maxX) {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 24;
    this.vx = -1.2;
    this.minX = minX;
    this.maxX = maxX;
    this.alive = true;
    this.squishTimer = 0;
  }
}

class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 10;
    this.life = 45;
    this.vy = -4;
  }
}

class FloatingText {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.life = 40;
  }
}
