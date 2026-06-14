# Japanese Matome Blog Blocklist

Japanese Matome Blog Blocklist is a Cloudflare Workers project that collects Japanese 5ch/2ch matome blog domains from antenna sites, deduplicates them by host, and publishes blocklists for common blockers and search-result filters.

Published formats:

- Plain URL list: `urls.txt`
- uBlock Origin filter list: `ublock.txt`
- AdGuard filter list: `adguard.txt`
- uBlacklist rule list: `ublacklist.txt`
- Machine-readable metadata: `sites.json`

## Public Endpoints

The current Cloudflare Worker serves:

```text
https://jp-matome-blocklist.vulturejp-dev.workers.dev/urls.txt
https://jp-matome-blocklist.vulturejp-dev.workers.dev/ublock.txt
https://jp-matome-blocklist.vulturejp-dev.workers.dev/adguard.txt
https://jp-matome-blocklist.vulturejp-dev.workers.dev/ublacklist.txt
https://jp-matome-blocklist.vulturejp-dev.workers.dev/sites.json
```

## Update Schedule

Cloudflare Cron Triggers run the collector once a week:

```text
17 18 * * 0
```

Cloudflare cron expressions use UTC, so this runs every Monday at 03:17 in Japan Standard Time.

## How It Works

1. The Worker visits antenna pages configured in `src/sources.ts`.
2. It extracts URLs from normal HTML links and embedded script payloads such as escaped Nuxt data.
3. It normalizes tracking parameters, `www.` prefixes, fragments, and redirect-wrapper URLs.
4. It excludes source antenna sites, 5ch/2ch platform hosts, analytics hosts, and other configured non-target hosts.
5. It deduplicates by canonical host and stores first-seen timestamps plus source provenance in `sites.json`.
6. It writes generated lists to Workers KV and serves them from the Worker HTTP endpoint.

## Cloudflare Resources

This repository is configured for:

- Cloudflare account: `26c7e8e9cacd87df91ea5ae48d205794`
- Workers KV binding: `BLOCKLIST_KV`
- Workers KV namespace: `4b6eb4392fd64968a00ab1c45209a975`
- Worker name: `jp-matome-blocklist`

Do not commit Cloudflare API tokens. Pass them through environment variables when running Wrangler commands.

## Local Development

```sh
npm install
npm run typecheck
npm test
npm run dev
```

The test script compiles TypeScript into `dist-test/` before running Node's built-in test runner.

## Deploy

```sh
CLOUDFLARE_API_TOKEN=<token> npm run deploy
```

## Seed KV Manually

Use `npm run seed` to collect sources locally and upload generated files to Workers KV immediately, without waiting for the weekly Cron Trigger.

```sh
CLOUDFLARE_ACCOUNT_ID=26c7e8e9cacd87df91ea5ae48d205794 \
CLOUDFLARE_KV_NAMESPACE_ID=4b6eb4392fd64968a00ab1c45209a975 \
CLOUDFLARE_API_TOKEN=<token> \
npm run seed
```

## Adding Sources

Add antenna pages to `SOURCES` in `src/sources.ts`. Add the same host to `ALLOW_HOSTS` so the source antenna site itself does not appear in generated blocklists.

```ts
export const SOURCES = [
  {
    id: "example",
    url: "https://example.com/",
    note: "Additional antenna site"
  }
];
```

## Maintenance Notes

Matome blogs and antenna sites change their URL structures frequently. Review `sites.json` after the first few weekly runs and add false positives to `EXCLUDE_HOSTS` as needed.
