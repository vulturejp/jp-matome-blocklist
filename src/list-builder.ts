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
  const rawUrlPattern = /https?:\/\/[^\s"'<>\\)]+/giu;

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

  for (const match of decodeEmbeddedUrl(html).matchAll(rawUrlPattern)) {
    const rawUrl = match[0];
    const normalized = normalizeUrl(rawUrl, baseUrl);
    if (normalized) {
      urls.add(normalized);
    }
  }

  return [...urls].sort();
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

export function mergeSites(sourceId: string, urls: string[], existing: CollectedSite[], now: string): CollectedSite[] {
  const byHost = new Map(
    existing
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

    byHost.set(host, {
      url: originUrl(url),
      host,
      firstSeenAt: now,
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
  userAgent = "matomesaito-bot/0.1"
): Promise<CollectedSite[]> {
  let sites = existing;

  for (const source of sources) {
    const response = await fetcher(source.url, {
      headers: {
        "user-agent": userAgent,
        "accept": "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.id}: ${response.status}`);
    }

    const html = await response.text();
    sites = mergeSites(source.id, extractUrls(html, source.url), sites, now);
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

function renderUrls(sites: CollectedSite[]): string {
  return `${sites.map((site) => site.url).join("\n")}\n`;
}

function renderUblock(sites: CollectedSite[], generatedAt: string): string {
  const lines = [
    "! Title: Matomesaito 5ch Matome Blocklist",
    `! Last modified: ${generatedAt}`,
    "! Expires: 1 day",
    "! Homepage: https://github.com/yourname/matomesaito",
    ...sites.map((site) => `||${site.host}^`)
  ];

  return `${lines.join("\n")}\n`;
}

function renderAdGuard(sites: CollectedSite[], generatedAt: string): string {
  const lines = [
    "! Title: Matomesaito 5ch Matome Blocklist for AdGuard",
    `! Last modified: ${generatedAt}`,
    "! Expires: 1 day",
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

function decodeEmbeddedUrl(value: string): string {
  return decodeHtml(value)
    .replaceAll("\\u002F", "/")
    .replaceAll("\\/", "/")
    .replaceAll("\\u003A", ":")
    .replace(/[),.;]+$/u, "");
}
