import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const moduleNames = (await readdir(new URL("../modules/", import.meta.url)))
  .filter((name) => name.startsWith("wloc."));
const moduleContents = await Promise.all(
  moduleNames.map(async (name) => ({
    name,
    content: await readFile(
      new URL(`../modules/${name}`, import.meta.url),
      "utf8",
    ),
  })),
);
const readme = await readFile(
  new URL("../README.md", import.meta.url),
  "utf8",
);
const shortcutGuide = await readFile(
  new URL("../docs/shortcut-guide.md", import.meta.url),
  "utf8",
);

test("operational URLs use this fork and its Worker domain", () => {
  const operationalText = [
    readme,
    shortcutGuide,
    ...moduleContents.map(({ content }) => content),
  ].join("\n");

  for (const staleUrl of [
    "raw.githubusercontent.com/Yu9191/wloc",
    "github.com/Yu9191/wloc",
    "wloc-spoofer.daoyufan.workers.dev",
    "wloc-spoofer.wloc.workers.dev",
    "wloc-pages.pages.dev",
  ]) {
    assert.equal(
      operationalText.includes(staleUrl),
      false,
      `found stale project URL: ${staleUrl}`,
    );
  }

  for (const { name, content } of moduleContents) {
    assert.ok(
      content.includes("https://wloc.gamesofts.net"),
      `${name} does not advertise the project Worker`,
    );
    assert.ok(
      content.includes("github.com/gamesofts/wloc"),
      `${name} does not reference this fork`,
    );
  }
});

test("README exposes shortcuts, troubleshooting, and self-deployment", () => {
  assert.ok(
    readme.includes(
      "https://www.icloud.com/shortcuts/a82717d8fdad4e6280866fcf911173f7",
    ),
  );
  assert.ok(
    readme.includes(
      "https://www.icloud.com/shortcuts/f42632d406504f24a2cd163af4fe012f",
    ),
  );
  assert.ok(readme.includes("iOS 26/27"));
  assert.ok(readme.includes("自部署 Worker"));
  assert.ok(readme.includes("https://wloc.gamesofts.net/api/parse"));
});
