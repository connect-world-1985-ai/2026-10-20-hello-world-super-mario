(function () {
  const canvas = document.getElementById("game");
  if (!canvas) {
    console.error("Canvas #game not found");
    return;
  }
  const game = new Game(canvas);
  window.addEventListener("keydown", (e) => game.handleKeyDown(e));
  window.addEventListener("keyup", (e) => game.handleKeyUp(e));
  game.loop();
})();
