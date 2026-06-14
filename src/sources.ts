export interface Source {
  id: string;
  url: string;
  strategy: "hatena-favicon-url" | "blog-count-links" | "moudamepo-out-links";
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
    id: "nullpoantenna-blogs",
    url: "https://nullpoantenna.com/blogs",
    strategy: "blog-count-links",
    note: "Nullpo antenna blog directory"
  },
  {
    id: "moudamepo-list",
    url: "https://moudamepo.com/list.html",
    strategy: "moudamepo-out-links",
    note: "Moudamepo antenna site directory"
  }
];

export const ALLOW_HOSTS = [
  "2ch-c.net",
  "nullpoantenna.com",
  "moudamepo.com"
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
