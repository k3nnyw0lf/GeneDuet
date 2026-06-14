// Minimal static file server (pure Node) for local preview / GitHub-Pages-style hosting.
// Serves the project root so /web/index.html can import /data/catalog.mjs as ES modules.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, normalize, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Serve the project root (parent of tools/) regardless of the launcher's cwd.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || 8099;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".txt": "text/plain", ".csv": "text/csv" };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/web/index.html";
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(PORT, () => console.log(`GeneDuet preview on http://localhost:${PORT}/web/index.html`));
