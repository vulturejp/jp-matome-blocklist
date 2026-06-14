import { buildLists, collectFromSources } from "../dist/list-builder.js";
import { SOURCES } from "../dist/sources.js";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const userAgent = process.env.USER_AGENT ?? "matomesaito-bot/0.1";

if (!accountId || !namespaceId || !token) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_KV_NAMESPACE_ID, and CLOUDFLARE_API_TOKEN are required.");
}

const generatedAt = new Date().toISOString();
const sites = await collectFromSources(SOURCES, fetch, [], generatedAt, userAgent);
const result = buildLists(sites, generatedAt);

for (const [key, body] of Object.entries(result.files)) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": key.endsWith(".json") ? "application/json; charset=utf-8" : "text/plain; charset=utf-8"
      },
      body
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to upload ${key}: ${response.status} ${await response.text()}`);
  }
}

console.log(`Seeded ${sites.length} sites into KV namespace ${namespaceId}.`);
