import { chromium } from "playwright";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};

const server = createServer(async (req, res) => {
  const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "Content-Type": mime[extname(path)] || "text/plain" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const hasCanvas = await page.evaluate(() => {
  const c = document.getElementById("game");
  return c && c.width === 960 && typeof Game !== "undefined";
});

await page.keyboard.press("Enter");
await page.waitForTimeout(300);

await page.screenshot({ path: "/opt/cursor/artifacts/gameplay-screenshot.png" });

await browser.close();
server.close();

if (errors.length) {
  console.error("Console errors:", errors);
  process.exit(1);
}
if (!hasCanvas) {
  console.error("Game failed to initialize");
  process.exit(1);
}
console.log("OK: game loaded, screenshot saved");
