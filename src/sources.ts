export interface Source {
  id: string;
  url: string;
  strategy: "hatena-favicon-url" | "table-a-links";
  note?: string;
}

export const SOURCES: Source[] = [
  {
    id: "2ch-c-sites",
    url: "https://2ch-c.net/?p=site",
    strategy: "hatena-favicon-url",
    note: "2ch matome antenna site directory"
  },
  {
    id: "newmatoan-sites",
    url: "https://newmatoan.com/tourokusaitoitiran/",
    strategy: "table-a-links",
    note: "NEW matome antenna site directory"
  }
];

export const ALLOW_HOSTS = [
  "2ch-c.net",
  "newmatoan.com"
];

export const EXCLUDE_HOSTS = [
  "5ch.net",
  "5ch.io",
  "2ch.sc",
  "2ch.net",
  "2chnavi.net",
  "bbspink.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "blog.livedoor.jp",
  "schema.org",
  "w3.org",
  "cloudflareinsights.com",
  "google.com",
  "google-analytics.com",
  "googlesyndication.com",
  "googletagmanager.com",
  "doubleclick.net",
  "github.com"
];
