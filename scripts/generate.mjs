import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { buildLists, collectFromSources } from "../dist/list-builder.js";
import { SOURCES } from "../dist/sources.js";

const outputDir = new URL("../public/", import.meta.url);
const generatedAt = new Date().toISOString();
const userAgent = process.env.USER_AGENT ?? "jp-matome-blocklist-bot/0.1 (+https://github.com/vulturejp/jp-matome-blocklist)";

await mkdir(outputDir, { recursive: true });

const existing = await readExistingSites();
const sites = await collectFromSources(SOURCES, fetch, existing, generatedAt, userAgent);
const result = buildLists(sites, generatedAt);

for (const [filename, body] of Object.entries(result.files)) {
  await writeFile(join(outputDir.pathname, filename), body);
}

console.log(`Generated ${sites.length} sites in ${outputDir.pathname}`);

async function readExistingSites() {
  try {
    const raw = await readFile(join(outputDir.pathname, "sites.json"), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.sites) ? parsed.sites : [];
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
