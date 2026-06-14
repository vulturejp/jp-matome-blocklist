export interface Source {
  id: string;
  url: string;
  note?: string;
}

const WAROTA_RANK_STARTS = [1, 31, 61, 91, 121, 151, 181, 211];

export const SOURCES: Source[] = [
  {
    id: "2ch-c",
    url: "https://2ch-c.net/",
    note: "2ch matome antenna"
  },
  {
    id: "2ch-c-sites",
    url: "https://2ch-c.net/?p=site",
    note: "2ch matome antenna site directory"
  },
  {
    id: "2ch-c-ranking",
    url: "https://2ch-c.net/?p=ranking",
    note: "2ch matome antenna ranking"
  },
  {
    id: "matomeantena",
    url: "https://matomeantena.com/",
    note: "Matome antenna"
  },
  {
    id: "matomeantena-blogs",
    url: "https://matomeantena.com/blogs",
    note: "Matome antenna blog directory"
  },
  ...WAROTA_RANK_STARTS.map((rank) => ({
    id: `matomeantena-rank-${rank}`,
    url: `https://matomeantena.com/index?rank=${rank}`,
    note: `Matome antenna ranking from ${rank}`
  })),
  {
    id: "owata",
    url: "https://owata-net.com/",
    note: "Owata antenna"
  }
];

export const ALLOW_HOSTS = [
  "2ch-c.net",
  "matomeantena.com",
  "owata-net.com"
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
  "google.com",
  "google-analytics.com",
  "googlesyndication.com",
  "googletagmanager.com",
  "doubleclick.net",
  "github.com"
];
