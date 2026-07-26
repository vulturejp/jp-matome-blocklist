export interface Source {
  id: string;
  url: string;
  strategy:
    | "hatena-favicon-url"
    | "blog-count-links"
    | "out-cgi-links"
    | "category-list-links"
    | "registered-table-links"
    | "post-links"
    | "site-heading-links"
    | "go-param-links";
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
    strategy: "out-cgi-links",
    note: "Moudamepo antenna site directory"
  },
  {
    id: "2channeler-list",
    url: "https://2channeler.com/list.html",
    strategy: "out-cgi-links",
    note: "2channeler registered site directory"
  },
  {
    id: "wadaiantenna-blogs",
    url: "https://wadaiantenna.com/blogs",
    strategy: "category-list-links",
    note: "Wadai Antenna registered blog directory"
  },
  {
    id: "nwantenna-blogs",
    url: "https://nwantenna.com/about",
    strategy: "registered-table-links",
    note: "New World Antenna registered blog table"
  },
  {
    id: "5chmm-allpost",
    url: "https://5chmm.jp/allpost.html",
    strategy: "post-links",
    note: "5ch Matome no Matome all-site recent posts"
  },
  {
    id: "2chmatome-sites",
    url: "https://www.2chmatome.jp/",
    strategy: "site-heading-links",
    note: "2ch Matome App site directory"
  },
  {
    id: "newmatoan-posts",
    url: "https://newmatoan.com/",
    strategy: "go-param-links",
    note: "NEW Matome Site Antenna recent posts"
  }
];

export const ALLOW_HOSTS = [
  "2ch-c.net",
  "nullpoantenna.com",
  "moudamepo.com",
  "2channeler.com",
  "wadaiantenna.com",
  "nwantenna.com",
  "5chmm.jp",
  "2chmatome.jp",
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
