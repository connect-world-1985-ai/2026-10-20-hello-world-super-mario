# Hello World Super Mario

A simple side-scrolling platformer inspired by classic Mario games, built with **HTML5 Canvas** and **vanilla JavaScript**. No build step, no npm, and no external dependencies—just open the page and play.

All graphics are drawn with code (simple shapes). There are no Nintendo copyrighted sprites, music, or assets.

## How to run

**Locally:** open [`index.html`](index.html) in any modern browser (Chrome, Firefox, Safari, Edge).

**GitHub Pages:** enable Pages for this repo with the default branch root; visit your published URL and load `index.html` (or set it as the site entry if you use `docs/` or root hosting).

## Controls

| Action | Keys |
|--------|------|
| Move left / right | Arrow keys or **A** / **D** |
| Jump | **Space**, **Up**, or **W** |
| Start game (title screen) | **Enter** or **Space** |
| Restart (game over / win) | **Enter**, **Space**, or **R** |

## Gameplay

- Run and jump across ground and floating platforms.
- Bump **?** blocks from below to collect coins and score points.
- Stomp walking enemies for bonus points.
- Avoid pits—you lose a life if you fall in.
- Reach the **flag** at the end of the level to win.
- Track your **score**, **coins**, and **lives** in the HUD.

Sound effects are generated with the Web Audio API (no audio files).

## Project layout

```
index.html      — page shell and script tags
css/style.css   — page layout
js/main.js      — bootstrap
js/game.js      — game loop, rendering, physics
js/level.js     — tile map and level data
js/entities.js  — player, enemies, particles
js/audio.js     — procedural sound effects
```

## License

This is a learning/demo project. It is not affiliated with Nintendo.
