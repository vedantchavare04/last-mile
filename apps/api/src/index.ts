export type Env = { APP_ENV: string; DATABASE_URL?: string };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" } });
    if (url.pathname === "/health") return json({ ok: true, service: "last-mile-api", environment: env.APP_ENV });
    if (url.pathname === "/api/operations" && request.method === "GET") return json({ mode: "cloudflare-adapter", message: "Connect this route to @last-mile/database for Neon-backed state." });
    return json({ error: "Not found" }, 404);
  },
};
