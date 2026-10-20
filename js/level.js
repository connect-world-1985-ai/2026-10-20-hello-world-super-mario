/** Tile types and level layout (tile size 32px). */
const TILE = 32;

const TileType = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  QUESTION: 3,
  QUESTION_USED: 4,
  PLATFORM: 5,
  FLAG_POLE: 6,
  FLAG_TOP: 7,
};

/** Level width/height in tiles. Pits are EMPTY below ground line. */
function buildLevel() {
  const W = 120;
  const H = 18;
  const groundY = H - 3;
  const tiles = [];
  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    for (let x = 0; x < W; x++) {
      tiles[y][x] = TileType.EMPTY;
    }
  }

  function fillGround(fromX, toX) {
    for (let x = fromX; x <= toX; x++) {
      for (let y = groundY; y < H; y++) {
        tiles[y][x] = TileType.GROUND;
      }
    }
  }

  fillGround(0, 25);
  // pit
  fillGround(32, 55);
  fillGround(62, W - 1);

  // floating platforms
  const platforms = [
    [8, groundY - 4, 4],
    [14, groundY - 6, 3],
    [28, groundY - 3, 2],
    [36, groundY - 5, 4],
    [44, groundY - 7, 3],
    [50, groundY - 4, 2],
    [68, groundY - 5, 5],
    [78, groundY - 8, 4],
    [88, groundY - 4, 6],
    [100, groundY - 6, 4],
  ];
  for (const [px, py, len] of platforms) {
    for (let i = 0; i < len; i++) {
      if (py >= 0 && py < H && px + i < W) {
        tiles[py][px + i] = TileType.PLATFORM;
      }
    }
  }

  // question blocks
  const questions = [
    [10, groundY - 5],
    [16, groundY - 7],
    [40, groundY - 6],
    [72, groundY - 6],
    [92, groundY - 5],
  ];
  for (const [qx, qy] of questions) {
    tiles[qy][qx] = TileType.QUESTION;
  }

  // bricks near start
  for (let x = 12; x <= 14; x++) {
    tiles[groundY - 4][x] = TileType.BRICK;
  }

  // flag at end
  const flagX = W - 4;
  for (let y = groundY - 8; y < groundY; y++) {
    tiles[y][flagX] = TileType.FLAG_POLE;
  }
  tiles[groundY - 9][flagX] = TileType.FLAG_TOP;

  return {
    width: W,
    height: H,
    tiles,
    groundY,
    flagTileX: flagX,
    flagTileY: groundY - 9,
    spawnX: 2 * TILE,
    spawnY: (groundY - 2) * TILE,
    enemySpawns: [
      { x: 18 * TILE, y: (groundY - 1) * TILE, minX: 16 * TILE, maxX: 24 * TILE },
      { x: 70 * TILE, y: (groundY - 1) * TILE, minX: 65 * TILE, maxX: 76 * TILE },
    ],
    pitRects: [
      { x: 26 * TILE, w: 6 * TILE, y: groundY * TILE, h: 3 * TILE },
      { x: 56 * TILE, w: 6 * TILE, y: groundY * TILE, h: 3 * TILE },
    ],
  };
}

function isSolid(type) {
  return (
    type === TileType.GROUND ||
    type === TileType.BRICK ||
    type === TileType.QUESTION ||
    type === TileType.QUESTION_USED ||
    type === TileType.PLATFORM ||
    type === TileType.FLAG_POLE
  );
}

function isPlatform(type) {
  return type === TileType.PLATFORM;
}
