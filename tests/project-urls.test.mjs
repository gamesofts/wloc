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
const pageSource = await readFile(
  new URL("../worker/src/page.js", import.meta.url),
  "utf8",
);
const workerIndexSource = await readFile(
  new URL("../worker/src/index.js", import.meta.url),
  "utf8",
);
const settingsScript = await readFile(
  new URL("../dist/wloc-settings.js", import.meta.url),
  "utf8",
);
const locationScript = await readFile(
  new URL("../dist/wloc.js", import.meta.url),
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

test("simulated location metadata is computed during response patching", () => {
  assert.equal(pageSource.includes("function simulatedAltitude()"), false);
  assert.equal(pageSource.includes("function simulatedAccuracy()"), false);
  assert.equal(pageSource.includes("function simulatedAltitudeAccuracy()"), false);
  assert.equal(pageSource.includes("&alt=' + alt"), false);
  assert.equal(pageSource.includes("&altAcc=' + altAcc"), false);
  assert.equal(pageSource.includes("&acc=' + acc"), false);
  assert.equal(pageSource.includes("&acc=25"), false);
  assert.equal(pageSource.includes("altInput"), false);
  assert.equal(pageSource.includes("altAuto"), false);

  assert.equal(settingsScript.includes("altitude:"), false);
  assert.equal(settingsScript.includes("altitudeAccuracy"), false);
  assert.equal(settingsScript.includes("l.get(\"altAcc\")"), false);
  assert.equal(settingsScript.includes("l.get(\"acc\")"), false);
  assert.ok(locationScript.includes("Math.round(100*t.altitude)"));
  assert.ok(locationScript.includes("Math.round(100*t.altitudeAccuracy)"));
  assert.ok(locationScript.includes("6===e.fieldNo&&0===e.wireType"));
  assert.ok(locationScript.includes("function simulatedAltitude()"));
  assert.ok(locationScript.includes("function nextVerticalAccuracy("));
  assert.ok(locationScript.includes("30+(Math.random()-.5)*8"));
  assert.ok(locationScript.includes("altitudeAccuracy:b"));
  assert.ok(locationScript.includes("function nextAltitudeJitter("));
  assert.ok(locationScript.includes("targetAltitude:g"));
  assert.ok(locationScript.includes("altitudeJitter:u"));
  assert.ok(locationScript.includes("altitude:f"));
  assert.ok(locationScript.includes("生效海拔="));
  assert.ok(
    locationScript.includes("e.accuracy&&(r.accuracy=parseFloat(e.accuracy))"),
  );
  assert.equal(
    locationScript.includes("Pe(a.altitude)&&(r.altitude=parseFloat(a.altitude))"),
    false,
  );
  assert.equal(
    locationScript.includes(
      "Pe(a.altitudeAccuracy)&&(r.altitudeAccuracy=parseFloat(a.altitudeAccuracy))",
    ),
    false,
  );
});

test("parse API preserves natural coordinate precision", () => {
  assert.ok(pageSource.includes("?lon=' + lon"));
  assert.ok(pageSource.includes("'&lat=' + lat"));
  assert.equal(settingsScript.includes("parseFloat(l.get(\"lon\")"), true);
  assert.equal(workerIndexSource.includes("round6"), false);
});
