const GameState = {
  TITLE: "title",
  PLAYING: "playing",
  GAME_OVER: "gameover",
  WIN: "win",
};

const GRAVITY = 0.55;
const MAX_FALL = 14;
const JUMP_VEL = -11.5;
const MOVE_SPEED = 4.2;
const FRICTION = 0.82;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.W = canvas.width;
    this.H = canvas.height;
    this.state = GameState.TITLE;
    this.keys = {};
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.level = null;
    this.player = null;
    this.enemies = [];
    this.coinParticles = [];
    this.floatTexts = [];
    this.cameraX = 0;
    this.flagReached = false;
    this.restartBlink = 0;
  }

  loadLevel() {
    this.level = buildLevel();
    this.player = new Player(this.level.spawnX, this.level.spawnY);
    this.enemies = this.level.enemySpawns.map(
      (e) => new Enemy(e.x, e.y - 24, e.minX, e.maxX)
    );
    this.coinParticles = [];
    this.floatTexts = [];
    this.flagReached = false;
    this.cameraX = 0;
  }

  startGame() {
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.loadLevel();
    this.state = GameState.PLAYING;
    GameAudio.init();
  }

  handleKeyDown(e) {
    this.keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    if (this.state === GameState.TITLE) {
      if (e.code === "Enter" || e.code === "Space") {
        this.startGame();
      }
    } else if (this.state === GameState.GAME_OVER || this.state === GameState.WIN) {
      if (e.code === "Enter" || e.code === "Space" || e.code === "KeyR") {
        if (this.state === GameState.WIN) {
          this.startGame();
        } else {
          this.loadLevel();
          this.state = GameState.PLAYING;
        }
      }
    }
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;
  }

  pressedLeft() {
    return this.keys["ArrowLeft"] || this.keys["KeyA"];
  }

  pressedRight() {
    return this.keys["ArrowRight"] || this.keys["KeyD"];
  }

  pressedJump() {
    return (
      this.keys["Space"] ||
      this.keys["ArrowUp"] ||
      this.keys["KeyW"]
    );
  }

  tileAt(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= this.level.width || ty >= this.level.height) {
      return TileType.EMPTY;
    }
    return this.level.tiles[ty][tx];
  }

  setTile(tx, ty, type) {
    if (tx >= 0 && ty >= 0 && tx < this.level.width && ty < this.level.height) {
      this.level.tiles[ty][tx] = type;
    }
  }

  getTileRect(tx, ty) {
    return { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
  }

  rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  playerRect() {
    const p = this.player;
    return { x: p.x, y: p.y, w: p.w, h: p.h };
  }

  resolveTileCollisions() {
    const p = this.player;
    p.onGround = false;

    p.vy = Math.min(p.vy + GRAVITY, MAX_FALL);
    p.x += p.vx;
    this.collideAxis("x");
    p.y += p.vy;
    this.collideAxis("y");
  }

  collideAxis(axis) {
    const p = this.player;
    const pr = this.playerRect();
    const minTx = Math.floor(pr.x / TILE) - 1;
    const maxTx = Math.floor((pr.x + pr.w) / TILE) + 1;
    const minTy = Math.floor(pr.y / TILE) - 1;
    const maxTy = Math.floor((pr.y + p.h) / TILE) + 1;

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const type = this.tileAt(tx * TILE, ty * TILE);
        if (!isSolid(type)) continue;
        const tr = this.getTileRect(tx, ty);
        const cur = { x: p.x, y: p.y, w: p.w, h: p.h };
        if (!this.rectsOverlap(cur, tr)) continue;

        if (axis === "x") {
          if (p.vx > 0) p.x = tr.x - p.w;
          else if (p.vx < 0) p.x = tr.x + tr.w;
          p.vx = 0;
        } else {
          if (p.vy > 0) {
            if (isPlatform(type) && p.y + p.h - p.vy <= tr.y + 4) {
              p.y = tr.y - p.h;
              p.vy = 0;
              p.onGround = true;
            } else if (!isPlatform(type)) {
              p.y = tr.y - p.h;
              p.vy = 0;
              p.onGround = true;
            }
          } else if (p.vy < 0) {
            const wasBelow = p.y + p.h <= tr.y + p.vy + 2;
            if (wasBelow || !isPlatform(type)) {
              p.y = tr.y + tr.h;
              p.vy = 0;
              if (type === TileType.QUESTION) {
                this.hitQuestion(tx, ty);
              } else if (type === TileType.BRICK) {
                GameAudio.bump();
              }
            }
          }
        }
      }
    }
  }

  hitQuestion(tx, ty) {
    this.setTile(tx, ty, TileType.QUESTION_USED);
    this.coins++;
    this.score += 100;
    GameAudio.coin();
    this.coinParticles.push(new Coin(tx * TILE + TILE / 2, ty * TILE));
    this.floatTexts.push(new FloatingText(tx * TILE, ty * TILE - 8, "+100"));
  }

  checkPits() {
    const p = this.player;
    if (p.y > this.level.height * TILE + 20) {
      this.hurtPlayer(true);
    }
    for (const pit of this.level.pitRects) {
      const pr = this.playerRect();
      if (
        pr.x + pr.w > pit.x &&
        pr.x < pit.x + pit.w &&
        pr.y + pr.h > pit.y + 8
      ) {
        if (!p.onGround || p.y > pit.y) {
          this.hurtPlayer(true);
        }
      }
    }
  }

  hurtPlayer(fall) {
    if (this.player.invuln > 0 && !fall) return;
    GameAudio.hurt();
    this.lives--;
    if (this.lives <= 0) {
      this.state = GameState.GAME_OVER;
      return;
    }
    this.player.reset(this.level.spawnX, this.level.spawnY);
    this.player.invuln = 90;
    this.cameraX = Math.max(0, this.player.x - this.W * 0.35);
  }

  updateEnemies() {
    for (const e of this.enemies) {
      if (!e.alive) {
        e.squishTimer--;
        if (e.squishTimer <= 0) e.alive = false;
        continue;
      }
      e.x += e.vx;
      if (e.x < e.minX) {
        e.x = e.minX;
        e.vx *= -1;
      }
      if (e.x + e.w > e.maxX) {
        e.x = e.maxX - e.w;
        e.vx *= -1;
      }

      const er = { x: e.x, y: e.y, w: e.w, h: e.h };
      const pr = this.playerRect();
      if (!this.rectsOverlap(er, pr)) continue;

      const p = this.player;
      if (p.vy > 0 && p.y + p.h - p.vy <= e.y + e.h * 0.5) {
        e.alive = false;
        e.squishTimer = 20;
        p.vy = JUMP_VEL * 0.55;
        this.score += 200;
        GameAudio.stomp();
        this.floatTexts.push(new FloatingText(e.x, e.y, "+200"));
      } else if (p.invuln <= 0) {
        this.hurtPlayer(false);
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive !== false || e.squishTimer > 0);
  }

  checkFlag() {
    const fx = this.level.flagTileX * TILE;
    const fy = (this.level.groundY - 1) * TILE;
    const pr = this.playerRect();
    const flagZone = { x: fx - 10, y: fy - 80, w: 40, h: 100 };
    if (this.rectsOverlap(pr, flagZone) && !this.flagReached) {
      this.flagReached = true;
      this.score += 1000;
      GameAudio.flag();
      setTimeout(() => GameAudio.win(), 300);
      this.state = GameState.WIN;
    }
  }

  updatePlaying() {
    const p = this.player;
    if (p.invuln > 0) p.invuln--;

    let move = 0;
    if (this.pressedLeft()) move -= 1;
    if (this.pressedRight()) move += 1;
    if (move !== 0) {
      p.vx = move * MOVE_SPEED;
      p.facing = move;
    } else {
      p.vx *= FRICTION;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    if (this.pressedJump() && p.onGround) {
      p.vy = JUMP_VEL;
      p.onGround = false;
      GameAudio.jump();
    }

    this.resolveTileCollisions();
    this.checkPits();
    this.updateEnemies();
    this.checkFlag();

    const levelW = this.level.width * TILE;
    const targetCam = p.x - this.W * 0.35;
    this.cameraX = Math.max(0, Math.min(targetCam, levelW - this.W));

    for (const c of this.coinParticles) {
      c.y += c.vy;
      c.vy += 0.25;
      c.life--;
    }
    this.coinParticles = this.coinParticles.filter((c) => c.life > 0);

    for (const t of this.floatTexts) {
      t.y -= 1;
      t.life--;
    }
    this.floatTexts = this.floatTexts.filter((t) => t.life > 0);
  }

  update() {
    this.restartBlink++;
    if (this.state === GameState.PLAYING) {
      this.updatePlaying();
    }
  }

  drawBackground() {
    const g = this.ctx;
    const grad = g.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, "#5c94fc");
    grad.addColorStop(0.55, "#8bb8ff");
    grad.addColorStop(0.55, "#c84c0c");
    grad.addColorStop(1, "#6b2f0a");
    g.fillStyle = grad;
    g.fillRect(0, 0, this.W, this.H);

    g.fillStyle = "#5cd65c";
    for (let i = 0; i < 8; i++) {
      const bx = ((i * 180 - this.cameraX * 0.3) % (this.W + 200)) - 100;
      g.beginPath();
      g.arc(bx, this.H * 0.52, 36 + i * 4, 0, Math.PI * 2);
      g.fill();
    }
  }

  drawTile(type, sx, sy) {
    const g = this.ctx;
    const x = sx - this.cameraX;
    const y = sy;
    if (x < -TILE || x > this.W + TILE) return;

    switch (type) {
      case TileType.GROUND:
        g.fillStyle = "#c84c0c";
        g.fillRect(x, y, TILE, TILE);
        g.fillStyle = "#6b2f0a";
        g.fillRect(x, y + TILE - 8, TILE, 8);
        g.strokeStyle = "#3d1f06";
        g.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        break;
      case TileType.BRICK:
        g.fillStyle = "#b85c38";
        g.fillRect(x, y, TILE, TILE);
        g.strokeStyle = "#6b3018";
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            g.strokeRect(x + col * 16, y + row * 16, 16, 16);
          }
        }
        break;
      case TileType.QUESTION:
      case TileType.QUESTION_USED:
        g.fillStyle = type === TileType.QUESTION ? "#f8b800" : "#8a6a20";
        g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        g.strokeStyle = "#6b4a00";
        g.lineWidth = 2;
        g.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        if (type === TileType.QUESTION) {
          g.fillStyle = "#fff";
          g.font = "bold 18px monospace";
          g.textAlign = "center";
          g.fillText("?", x + TILE / 2, y + 22);
        }
        g.lineWidth = 1;
        break;
      case TileType.PLATFORM:
        g.fillStyle = "#6b8e4e";
        g.fillRect(x, y + 12, TILE, 8);
        g.fillStyle = "#4a6b32";
        g.fillRect(x, y + 20, TILE, 12);
        break;
      case TileType.FLAG_POLE:
        g.fillStyle = "#e8e8e8";
        g.fillRect(x + 14, y, 4, TILE);
        break;
      case TileType.FLAG_TOP: {
        g.fillStyle = "#e8e8e8";
        g.fillRect(x + 14, y + 20, 4, TILE - 4);
        const wave = Math.sin(this.restartBlink * 0.08) * 3;
        g.fillStyle = "#2ecc40";
        g.beginPath();
        g.moveTo(x + 18, y + 22);
        g.lineTo(x + 42, y + 28 + wave);
        g.lineTo(x + 18, y + 38);
        g.closePath();
        g.fill();
        break;
      }
      default:
        break;
    }
  }

  drawLevel() {
    const startTx = Math.floor(this.cameraX / TILE);
    const endTx = startTx + Math.ceil(this.W / TILE) + 2;
    for (let ty = 0; ty < this.level.height; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        const type = this.level.tiles[ty][tx];
        if (type !== TileType.EMPTY) {
          this.drawTile(type, tx * TILE, ty * TILE);
        }
      }
    }
  }

  drawPlayer() {
    const p = this.player;
    const x = p.x - this.cameraX;
    const y = p.y;
    if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) return;

    const g = this.ctx;
    // body
    g.fillStyle = "#e52521";
    g.fillRect(x + 4, y + 10, 18, 14);
    // overalls
    g.fillStyle = "#2563eb";
    g.fillRect(x + 6, y + 18, 14, 10);
    // head
    g.fillStyle = "#ffc9a5";
    g.fillRect(x + 6, y + 2, 14, 12);
    // hat
    g.fillStyle = "#e52521";
    g.fillRect(x + 4, y, 18, 6);
    g.fillRect(x + 2, y + 4, 8, 4);
    // eyes
    g.fillStyle = "#1a1a1a";
    const eyeOff = p.facing > 0 ? 2 : 0;
    g.fillRect(x + 10 + eyeOff, y + 6, 3, 3);
    g.fillRect(x + 15 + eyeOff, y + 6, 3, 3);
  }

  drawEnemies() {
    const g = this.ctx;
    for (const e of this.enemies) {
      const x = e.x - this.cameraX;
      if (x < -40 || x > this.W + 40) continue;
      if (!e.alive) {
        g.fillStyle = "#4a3728";
        g.fillRect(x, e.y + 18, e.w, 6);
        continue;
      }
      g.fillStyle = "#8b4513";
      g.fillRect(x + 4, e.y + 8, e.w - 8, e.h - 8);
      g.fillStyle = "#f5c99a";
      g.fillRect(x + 6, e.y + 2, e.w - 12, 10);
      g.fillStyle = "#1a1a1a";
      g.fillRect(x + 8, e.y + 6, 4, 4);
      g.fillRect(x + e.w - 12, e.y + 6, 4, 4);
      // feet
      const step = Math.sin(this.restartBlink * 0.15 + e.x) > 0 ? 0 : 3;
      g.fillStyle = "#2d1810";
      g.fillRect(x + 6, e.y + e.h - 4 + step, 8, 4);
      g.fillRect(x + e.w - 14, e.y + e.h - 4 - step, 8, 4);
    }
  }

  drawCoins() {
    const g = this.ctx;
    for (const c of this.coinParticles) {
      const x = c.x - this.cameraX;
      g.fillStyle = "#ffd700";
      g.beginPath();
      g.arc(x, c.y, c.r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#b8860b";
      g.stroke();
    }
  }

  drawHUD() {
    const g = this.ctx;
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(8, 8, 220, 56);
    g.fillStyle = "#fff";
    g.font = "bold 16px monospace";
    g.textAlign = "left";
    g.fillText(`SCORE ${String(this.score).padStart(6, "0")}`, 16, 30);
    g.fillText(`COINS x${this.coins}`, 16, 52);
    g.fillText(`LIVES x${this.lives}`, 140, 52);

    for (const t of this.floatTexts) {
      g.fillStyle = "#fff";
      g.font = "bold 14px monospace";
      g.fillText(t.text, t.x - this.cameraX, t.y);
    }
  }

  drawTitle() {
    this.drawBackground();
    const g = this.ctx;
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(0, 0, this.W, this.H);

    g.fillStyle = "#fff";
    g.font = "bold 48px monospace";
    g.textAlign = "center";
    g.strokeStyle = "#e52521";
    g.lineWidth = 4;
    g.strokeText("Hello World!", this.W / 2, this.H * 0.32);
    g.fillText("Hello World!", this.W / 2, this.H * 0.32);

    g.font = "22px monospace";
    g.fillStyle = "#ffe566";
    g.fillText("Super Platform Adventure", this.W / 2, this.H * 0.42);

    if (Math.floor(this.restartBlink / 30) % 2 === 0) {
      g.font = "18px monospace";
      g.fillStyle = "#fff";
      g.fillText("Press ENTER or SPACE to start", this.W / 2, this.H * 0.62);
    }

    g.font = "14px monospace";
    g.fillStyle = "#ccc";
    g.fillText("Arrows / A D — move   Space / W / Up — jump", this.W / 2, this.H * 0.75);
  }

  drawOverlay(title, sub, hint) {
    const g = this.ctx;
    g.fillStyle = "rgba(0,0,0,0.65)";
    g.fillRect(0, 0, this.W, this.H);
    g.fillStyle = "#fff";
    g.font = "bold 40px monospace";
    g.textAlign = "center";
    g.fillText(title, this.W / 2, this.H * 0.4);
    g.font = "20px monospace";
    g.fillText(sub, this.W / 2, this.H * 0.5);
    if (Math.floor(this.restartBlink / 30) % 2 === 0) {
      g.font = "16px monospace";
      g.fillText(hint, this.W / 2, this.H * 0.62);
    }
  }

  draw() {
    if (this.state === GameState.TITLE) {
      this.drawTitle();
      return;
    }

    this.drawBackground();
    if (this.level) {
      this.drawLevel();
      this.drawCoins();
      this.drawEnemies();
      if (this.player) this.drawPlayer();
      this.drawHUD();
    }

    if (this.state === GameState.GAME_OVER) {
      this.drawOverlay(
        "GAME OVER",
        `Final score: ${this.score}`,
        "Press ENTER, SPACE, or R to retry"
      );
    } else if (this.state === GameState.WIN) {
      this.drawOverlay(
        "YOU WIN!",
        `Score: ${this.score}  Coins: ${this.coins}`,
        "Press ENTER or SPACE to play again"
      );
    }
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}
