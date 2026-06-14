# matomesaito

matomesaito is a Cloudflare Workers project that collects 5ch/2ch matome blog URLs from well-known antenna sites, deduplicates them by host, and publishes blocklists in multiple formats.

- Plain URL list: `urls.txt`
- uBlock Origin / AdGuard filters: `ublock.txt`, `adguard.txt`
- uBlacklist rules: `ublacklist.txt`
- Machine-readable metadata: `sites.json`

## How It Works

1. The Worker visits antenna sites configured in `src/sources.ts` on a Cron Trigger.
2. It extracts links from HTML and normalizes tracking parameters, `www.` prefixes, fragments, and redirect-wrapper URLs.
3. It excludes source antenna sites, 5ch/2ch platform hosts, and other configured non-target hosts.
4. It deduplicates by canonical host and stores first-seen timestamps plus source provenance in `sites.json`.
5. It writes each generated blocklist to Workers KV and serves them from the Worker HTTP endpoint.

## Initial Setup

```sh
npm install
npx wrangler kv namespace create BLOCKLIST_KV
npm run seed
npm run deploy
```

Update the `USER_AGENT` value in `wrangler.toml` and the GitHub URL in the generated filter headers before publishing a public list.

This repository is currently configured for Cloudflare account `26c7e8e9cacd87df91ea5ae48d205794` and KV namespace `4b6eb4392fd64968a00ab1c45209a975`.

## Local Development

```sh
npm install
npm run typecheck
npm test
npm run dev
```

The test script compiles TypeScript into `dist-test/` before running Node's built-in test runner.

```sh
npm test
```

## Adding Sources

Add antenna sites to `SOURCES` in `src/sources.ts`. Add the same host to `ALLOW_HOSTS` so the source antenna site itself does not appear in the generated blocklists.

```ts
export const SOURCES = [
  {
    id: "example",
    url: "https://example.com/",
    note: "Additional antenna site"
  }
];
```

## Published URLs

After deployment, the Worker index page lists each generated file URL.

```text
https://<worker-domain>/urls.txt
https://<worker-domain>/ublock.txt
https://<worker-domain>/adguard.txt
https://<worker-domain>/ublacklist.txt
https://<worker-domain>/sites.json
```

## Operational Notes

Matome blogs and antenna sites change their URL structures frequently. Review `sites.json` after the first few runs and add false positives to `EXCLUDE_HOSTS` as needed.

The Cloudflare API token should be provided through the `CLOUDFLARE_API_TOKEN` environment variable when running Wrangler commands. Do not commit API tokens to the repository.

## Seeding KV Manually

Use `npm run seed` to collect sources locally and upload the generated files to Workers KV immediately, without waiting for the next Cron Trigger.

```sh
CLOUDFLARE_ACCOUNT_ID=26c7e8e9cacd87df91ea5ae48d205794 \
CLOUDFLARE_KV_NAMESPACE_ID=4b6eb4392fd64968a00ab1c45209a975 \
CLOUDFLARE_API_TOKEN=<token> \
npm run seed
```
