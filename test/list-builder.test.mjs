import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLists,
  collectFromSources,
  extractUrls,
  extractSourceUrls,
  isCandidateMatomeUrl,
  mergeSites,
  normalizeUrl
} from "../dist-test/list-builder.js";

test("extractUrls resolves relative links and strips tracking parameters", () => {
  const html = `
    <a href="/jump?url=https%3A%2F%2Fexample.com%2Farticle%3Futm_source%3Dfeed">jump</a>
    <a href="https://www.blog.example.com/path/?utm_source=x#hash">blog</a>
    <a href="javascript:void(0)">skip</a>
  `;

  assert.deepEqual(extractUrls(html, "https://antenna.example/"), [
    "https://blog.example.com/path",
    "https://example.com/article"
  ]);
});

test("extractUrls ignores embedded script URLs", () => {
  const html = String.raw`
    <script>
      window.__payload = ["https:\u002F\u002Fexample.com\u002Fentry\u002F1","http:\/\/blog.example.net\/post"];
    </script>
  `;

  assert.deepEqual(extractUrls(html, "https://antenna.example/"), []);
});

test("extractSourceUrls reads 2ch-c site directory favicon URLs only", () => {
  const html = `
    <script type="application/ld+json">{"@context":"https://schema.org"}</script>
    <img src="//favicon.hatena.ne.jp/?url=https://example.com/">
    <a href="./?p=site&sid=1">new entries</a>
  `;

  assert.deepEqual(
    extractSourceUrls(
      {
        id: "2ch-c-sites",
        url: "https://2ch-c.net/?p=site",
        strategy: "hatena-favicon-url"
      },
      html
    ),
    ["https://example.com/"]
  );
});

test("extractSourceUrls reads newmatoan table rows only", () => {
  const html = `
    <a href="https://newmatoan.com/">top</a>
    <table class="table-a">
      <tr><th><a href="https://example.com/" target="_blank" rel="noopener">Example</a></th><td>総合</td></tr>
    </table>
    <a href="https://w3.org/">outside table</a>
  `;

  assert.deepEqual(
    extractSourceUrls(
      {
        id: "newmatoan-sites",
        url: "https://newmatoan.com/tourokusaitoitiran/",
        strategy: "table-a-links"
      },
      html
    ),
    ["https://example.com/"]
  );
});

test("normalizeUrl canonicalizes hosts and removes default ports", () => {
  assert.equal(normalizeUrl("https://WWW.Example.COM:443/foo/?utm_campaign=x#bar"), "https://example.com/foo");
});

test("isCandidateMatomeUrl excludes source and platform hosts", () => {
  assert.equal(isCandidateMatomeUrl("https://blog.example.com/"), true);
  assert.equal(isCandidateMatomeUrl("https://5ch.io/test/read.cgi/news4vip/1"), false);
  assert.equal(isCandidateMatomeUrl("https://2chnavi.net/"), false);
  assert.equal(isCandidateMatomeUrl("https://googletagmanager.com/gtm.js"), false);
  assert.equal(isCandidateMatomeUrl("https://blog.livedoor.jp/"), false);
  assert.equal(isCandidateMatomeUrl("https://schema.org/"), false);
  assert.equal(isCandidateMatomeUrl("https://w3.org/"), false);
  assert.equal(isCandidateMatomeUrl("https://static.cloudflareinsights.com/beacon.min.js"), false);
});

test("mergeSites deduplicates by canonical host and keeps source provenance", () => {
  const merged = mergeSites(
    "source-a",
    ["https://www.example.com/a", "https://example.com/b"],
    [],
    "2026-06-14T00:00:00.000Z"
  );

  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], {
    url: "https://example.com/",
    host: "example.com",
    firstSeenAt: "2026-06-14T00:00:00.000Z",
    sources: ["source-a"]
  });
});

test("mergeSites drops existing entries that are now excluded", () => {
  const merged = mergeSites(
    "source-a",
    ["https://example.com/a"],
    [
      {
        url: "https://googletagmanager.com/",
        host: "googletagmanager.com",
        firstSeenAt: "2026-06-14T00:00:00.000Z",
        sources: ["old-source"]
      }
    ],
    "2026-06-14T00:00:00.000Z"
  );

  assert.deepEqual(
    merged.map((site) => site.host),
    ["example.com"]
  );
});

test("mergeSites keeps accumulated current-run sites and preserves historical firstSeenAt", () => {
  const first = mergeSites(
    "source-a",
    ["https://a.example.com/post"],
    [],
    "2026-06-14T00:00:00.000Z",
    [
      {
        url: "https://a.example.com/",
        host: "a.example.com",
        firstSeenAt: "2026-01-01T00:00:00.000Z",
        sources: ["old-source"]
      }
    ]
  );
  const second = mergeSites("source-b", ["https://b.example.com/post"], first, "2026-06-14T00:00:00.000Z");

  assert.deepEqual(
    second.map((site) => [site.host, site.firstSeenAt, site.sources]),
    [
      ["a.example.com", "2026-01-01T00:00:00.000Z", ["source-a"]],
      ["b.example.com", "2026-06-14T00:00:00.000Z", ["source-b"]]
    ]
  );
});

test("buildLists renders each target format", () => {
  const result = buildLists(
    [
      {
        url: "https://example.com/",
        host: "example.com",
        firstSeenAt: "2026-06-14T00:00:00.000Z",
        sources: ["source-a"]
      }
    ],
    "2026-06-14T00:00:00.000Z"
  );

  assert.match(result.files["ublock.txt"], /\|\|example\.com\^/);
  assert.match(result.files["adguard.txt"], /\|\|example\.com\^/);
  assert.match(result.files["ublacklist.txt"], /\*:\/\//);
  assert.match(result.files["sites.json"], /"host": "example.com"/);
});

test("collectFromSources retains historical source entries when a source fetch fails", async () => {
  const sites = await collectFromSources(
    [
      {
        id: "source-a",
        url: "https://source-a.example/",
        strategy: "table-a-links"
      },
      {
        id: "source-b",
        url: "https://source-b.example/",
        strategy: "table-a-links"
      }
    ],
    async (url) => {
      if (url === "https://source-a.example/") {
        return new Response("blocked", { status: 403 });
      }

      return new Response(`
        <table class="table-a">
          <tr><th><a href="https://fresh.example.com/">Fresh</a></th></tr>
        </table>
      `);
    },
    [
      {
        url: "https://kept.example.com/",
        host: "kept.example.com",
        firstSeenAt: "2026-01-01T00:00:00.000Z",
        sources: ["source-a"]
      }
    ],
    "2026-06-14T00:00:00.000Z"
  );

  assert.deepEqual(
    sites.map((site) => [site.host, site.sources]),
    [
      ["fresh.example.com", ["source-b"]],
      ["kept.example.com", ["source-a"]]
    ]
  );
});
