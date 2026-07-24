/**
 * 本地预览 dist/（先 npm run build）
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const dist = resolve(__dirname, "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const rel = pathname.replace(/^\/+/, "") || "index.html";
  if (rel.includes("..")) {
    res.writeHead(403);
    res.end();
    return;
  }
  const filePath = resolve(dist, rel);
  if (relative(dist, filePath).startsWith("..")) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const buf = await readFile(filePath);
    const ext = extname(filePath);
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
}).listen(23366, () => {
  console.log("http://localhost:23366");
});
