# Japanese Matome Blog Blocklist

Japanese Matome Blog Blocklist collects Japanese 5ch/2ch matome blog domains from antenna sites, deduplicates them by host, and publishes blocklists for common blockers and search-result filters.

Published formats:

- Plain URL list: `urls.txt`
- uBlock Origin filter list: `ublock.txt`
- AdGuard filter list: `adguard.txt`
- uBlacklist rule list: `ublacklist.txt`
- Machine-readable metadata: `sites.json`

## Published Files

Generated files are committed to `public/`:

```text
public/urls.txt
public/ublock.txt
public/adguard.txt
public/ublacklist.txt
public/sites.json
```

Raw GitHub URLs:

```text
https://raw.githubusercontent.com/vulturejp/jp-matome-blocklist/main/public/urls.txt
https://raw.githubusercontent.com/vulturejp/jp-matome-blocklist/main/public/ublock.txt
https://raw.githubusercontent.com/vulturejp/jp-matome-blocklist/main/public/adguard.txt
https://raw.githubusercontent.com/vulturejp/jp-matome-blocklist/main/public/ublacklist.txt
https://raw.githubusercontent.com/vulturejp/jp-matome-blocklist/main/public/sites.json
```

## Update Schedule

GitHub Actions runs the collector once a week:

```text
17 18 * * 0
```

GitHub Actions cron expressions use UTC, so this runs every Monday at 03:17 in Japan Standard Time.

## How It Works

1. GitHub Actions visits curated site-directory pages configured in `src/sources.ts`.
2. Each source uses a source-specific parser for its directory structure.
3. It normalizes tracking parameters, `www.` prefixes, fragments, and redirect-wrapper URLs.
4. It excludes source antenna sites, 5ch/2ch platform hosts, analytics hosts, and other configured non-target hosts.
5. It deduplicates by canonical host and stores first-seen timestamps plus source provenance in `sites.json`.
6. It writes generated lists to `public/`.
7. If generated files changed, GitHub Actions commits and pushes the update.

## Current Sources

The collector intentionally uses only registration/directory pages whose structure is understood:

- `https://2ch-c.net/?p=site`
- `https://nullpoantenna.com/blogs`
- `https://moudamepo.com/list.html`

It does not scrape arbitrary article pages, ranking pages, script payloads, analytics tags, JSON-LD, or generic embedded URLs.

## Local Development

```sh
npm install
npm run typecheck
npm test
npm run generate
```

The test script compiles TypeScript into `dist-test/` before running Node's built-in test runner.

## Manual Update

```sh
npm run generate
```

Commit the resulting `public/` changes if the generated output looks good.

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

Matome blogs and antenna sites change their URL structures frequently. Review `public/sites.json` after the first few weekly runs and add false positives to `EXCLUDE_HOSTS` as needed.

## Rollback

The previous Cloudflare Workers implementation is preserved at the `cloudflare-workers-backup` branch and the `cloudflare-workers-backup-20260614` tag.
