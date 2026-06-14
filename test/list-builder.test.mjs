import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLists,
  extractUrls,
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

test("extractUrls reads embedded escaped URLs from script payloads", () => {
  const html = String.raw`
    <script>
      window.__payload = ["https:\u002F\u002Fexample.com\u002Fentry\u002F1","http:\/\/blog.example.net\/post"];
    </script>
  `;

  assert.deepEqual(extractUrls(html, "https://antenna.example/"), [
    "http://blog.example.net/post",
    "https://example.com/entry/1"
  ]);
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
