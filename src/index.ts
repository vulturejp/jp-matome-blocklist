import { buildLists, collectFromSources, type CollectedSite } from "./list-builder.js";
import { SOURCES } from "./sources.js";

const CONTENT_TYPES: Record<string, string> = {
  "urls.txt": "text/plain; charset=utf-8",
  "ublock.txt": "text/plain; charset=utf-8",
  "adguard.txt": "text/plain; charset=utf-8",
  "ublacklist.txt": "text/plain; charset=utf-8",
  "sites.json": "application/json; charset=utf-8"
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/+/u, "") || "index";

    if (key === "index") {
      return indexResponse(url);
    }

    if (!(key in CONTENT_TYPES)) {
      return new Response("Not found\n", { status: 404 });
    }

    const body = await env.BLOCKLIST_KV.get(key);
    if (!body) {
      return new Response("List has not been generated yet. Run the scheduled worker first.\n", { status: 404 });
    }

    return new Response(body, {
      headers: {
        "content-type": CONTENT_TYPES[key],
        "cache-control": "public, max-age=900"
      }
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(updateLists(env));
  }
};

export async function updateLists(env: Env, now = new Date().toISOString()): Promise<void> {
  const existing = await readExistingSites(env);
  const sites = await collectFromSources(SOURCES, fetch, existing, now, env.USER_AGENT);
  const result = buildLists(sites, now);

  await Promise.all(
    Object.entries(result.files).map(([key, body]) =>
      env.BLOCKLIST_KV.put(key, body, {
        metadata: {
          contentType: CONTENT_TYPES[key] ?? "text/plain; charset=utf-8",
          generatedAt: now
        }
      })
    )
  );
}

async function readExistingSites(env: Env): Promise<CollectedSite[]> {
  const object = await env.BLOCKLIST_KV.get("sites.json", "json");
  if (!object) {
    return [];
  }

  const parsed = object as { sites?: CollectedSite[] };
  return Array.isArray(parsed.sites) ? parsed.sites : [];
}

function indexResponse(url: URL): Response {
  const base = `${url.origin}/`;
  const body = [
    "Japanese Matome Blog Blocklist",
    "",
    `URL list: ${base}urls.txt`,
    `uBlock Origin: ${base}ublock.txt`,
    `AdGuard: ${base}adguard.txt`,
    `uBlacklist: ${base}ublacklist.txt`,
    `JSON: ${base}sites.json`,
    ""
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}
