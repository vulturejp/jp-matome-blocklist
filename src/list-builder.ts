import { ALLOW_HOSTS, EXCLUDE_HOSTS, type Source } from "./sources.js";

export interface CollectedSite {
  url: string;
  host: string;
  firstSeenAt: string;
  sources: string[];
}

export interface BuildResult {
  generatedAt: string;
  sites: CollectedSite[];
  files: Record<string, string>;
}

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid"
];

export function extractUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const hrefPattern = /\bhref\s*=\s*(["'])(.*?)\1/giu;

  for (const match of html.matchAll(hrefPattern)) {
    const rawHref = decodeHtml(match[2]?.trim() ?? "");
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) {
      continue;
    }

    const normalized = normalizeUrl(rawHref, baseUrl);
    if (normalized) {
      urls.add(normalized);
    }
  }

  return [...urls].sort();
}

export function extractSourceUrls(source: Source, html: string): string[] {
  if (source.strategy === "hatena-favicon-url") {
    return extractHatenaFaviconUrls(html, source.url);
  }

  if (source.strategy === "blog-count-links") {
    return extractBlogCountLinks(html, source.url);
  }

  return extractMoudamepoOutLinks(html, source.url);
}

export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  try {
    const url = new URL(rawUrl, baseUrl);
    const redirected = unwrapRedirectUrl(url);

    if (redirected) {
      return normalizeUrl(redirected);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    url.hash = "";
    url.username = "";
    url.password = "";

    for (const param of TRACKING_PARAMS) {
      url.searchParams.delete(param);
    }

    url.hostname = canonicalHost(url.hostname);

    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
      url.port = "";
    }

    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/u, "");
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function canonicalHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./u, "");
}

export function hostFromUrl(url: string): string {
  return canonicalHost(new URL(url).hostname);
}

export function isCandidateMatomeUrl(url: string): boolean {
  const parsed = new URL(url);
  const host = canonicalHost(parsed.hostname);

  if (EXCLUDE_HOSTS.some((excluded) => host === excluded || host.endsWith(`.${excluded}`))) {
    return false;
  }

  if (ALLOW_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    return false;
  }

  return /\.(blog|com|net|jp|info|org)$/u.test(host) || host.includes("blog");
}

export function mergeSites(
  sourceId: string,
  urls: string[],
  existing: CollectedSite[],
  now: string,
  historical: CollectedSite[] = []
): CollectedSite[] {
  const byHost = new Map(
    existing
      .filter((site) => isCandidateMatomeUrl(site.url))
      .map((site) => [site.host, { ...site, sources: [...site.sources] }])
  );
  const historicalByHost = new Map(
    historical
      .filter((site) => isCandidateMatomeUrl(site.url))
      .map((site) => [site.host, { ...site, sources: [...site.sources] }])
  );

  for (const url of urls) {
    if (!isCandidateMatomeUrl(url)) {
      continue;
    }

    const host = hostFromUrl(url);
    const current = byHost.get(host);

    if (current) {
      if (!current.sources.includes(sourceId)) {
        current.sources.push(sourceId);
        current.sources.sort();
      }
      continue;
    }

    const existingSite = historicalByHost.get(host);
    byHost.set(host, {
      url: originUrl(url),
      host,
      firstSeenAt: existingSite?.firstSeenAt ?? now,
      sources: [sourceId]
    });
  }

  return [...byHost.values()].sort((a, b) => a.host.localeCompare(b.host));
}

export function buildLists(sites: CollectedSite[], generatedAt: string): BuildResult {
  return {
    generatedAt,
    sites,
    files: {
      "urls.txt": renderUrls(sites),
      "ublock.txt": renderUblock(sites, generatedAt),
      "adguard.txt": renderAdGuard(sites, generatedAt),
      "ublacklist.txt": renderUBlacklist(sites),
      "sites.json": `${JSON.stringify({ generatedAt, sites }, null, 2)}\n`
    }
  };
}

export async function collectFromSources(
  sources: Source[],
  fetcher: typeof fetch,
  existing: CollectedSite[] = [],
  now = new Date().toISOString(),
  userAgent = "jp-matome-blocklist-bot/0.1"
): Promise<CollectedSite[]> {
  const historical = existing;
  let sites: CollectedSite[] = [];

  for (const source of sources) {
    try {
      const response = await fetcher(source.url, {
        headers: {
          "user-agent": userAgent,
          "accept": "text/html,application/xhtml+xml",
          "accept-language": "ja,en-US;q=0.8,en;q=0.6"
        },
        redirect: "follow"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      sites = mergeSites(source.id, extractSourceUrls(source, html), sites, now, historical);
    } catch (error) {
      console.warn(`Skipping ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
      sites = retainHistoricalSource(source.id, historical, sites);
    }
  }

  return sites;
}

function originUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${hostFromUrl(url)}/`;
}

function unwrapRedirectUrl(url: URL): string | null {
  const keys = ["url", "u", "uri", "to", "target", "link", "redirect", "redirect_url"];

  for (const key of keys) {
    const value = url.searchParams.get(key);
    if (!value) {
      continue;
    }

    try {
      const decoded = decodeURIComponent(value);
      const parsed = new URL(decoded);

      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return decoded;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractHatenaFaviconUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const faviconPattern = /favicon\.hatena\.ne\.jp\/\?url=([^"'\s>]+)/giu;

  for (const match of html.matchAll(faviconPattern)) {
    const rawUrl = decodeHtml(match[1] ?? "");
    const normalized = normalizeUrl(rawUrl, baseUrl);
    if (normalized) {
      urls.add(normalized);
    }
  }

  return [...urls].sort();
}

function extractBlogCountLinks(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const blogLinkPattern = /<a\b(?=[^>]*\bclass=(["'])[^"']*\bblog-count\b[^"']*\1)[^>]*\bhref=(["'])(.*?)\2/giu;

  for (const match of html.matchAll(blogLinkPattern)) {
    const normalized = normalizeUrl(decodeHtml(match[3] ?? ""), baseUrl);
    if (normalized) {
      urls.add(normalized);
    }
  }

  return [...urls].sort();
}

function extractMoudamepoOutLinks(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const outLinkPattern = /<a\b[^>]*\bhref=(["'])out\.cgi\?\d+=(https?:\/\/.*?)\1/giu;

  for (const match of html.matchAll(outLinkPattern)) {
    const normalized = normalizeUrl(decodeHtml(match[2] ?? ""), baseUrl);
    if (normalized) {
      urls.add(normalized);
    }
  }

  return [...urls].sort();
}

function retainHistoricalSource(sourceId: string, historical: CollectedSite[], current: CollectedSite[]): CollectedSite[] {
  const byHost = new Map(current.map((site) => [site.host, { ...site, sources: [...site.sources] }]));

  for (const site of historical) {
    if (!site.sources.includes(sourceId) || !isCandidateMatomeUrl(site.url)) {
      continue;
    }

    const existing = byHost.get(site.host);
    if (existing) {
      if (!existing.sources.includes(sourceId)) {
        existing.sources.push(sourceId);
        existing.sources.sort();
      }
      continue;
    }

    byHost.set(site.host, {
      ...site,
      sources: [sourceId]
    });
  }

  return [...byHost.values()].sort((a, b) => a.host.localeCompare(b.host));
}

function renderUrls(sites: CollectedSite[]): string {
  return `${sites.map((site) => site.url).join("\n")}\n`;
}

function renderUblock(sites: CollectedSite[], generatedAt: string): string {
  const lines = [
    "! Title: Japanese Matome Blog Blocklist",
    `! Last modified: ${generatedAt}`,
    "! Expires: 7 days",
    "! Homepage: https://github.com/vulturejp/jp-matome-blocklist",
    ...sites.map((site) => `||${site.host}^`)
  ];

  return `${lines.join("\n")}\n`;
}

function renderAdGuard(sites: CollectedSite[], generatedAt: string): string {
  const lines = [
    "! Title: Japanese Matome Blog Blocklist for AdGuard",
    `! Last modified: ${generatedAt}`,
    "! Expires: 7 days",
    ...sites.map((site) => `||${site.host}^`)
  ];

  return `${lines.join("\n")}\n`;
}

function renderUBlacklist(sites: CollectedSite[]): string {
  return `${sites.map((site) => `*://${site.host}/*`).join("\n")}\n`;
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
