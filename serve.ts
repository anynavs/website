import { join } from "node:path";

const dist = join(import.meta.dir, "dist");

const server = Bun.serve({
  port: 3366,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(join(dist, path));

    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not Found", { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
