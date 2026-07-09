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

test("simulated location metadata is injected as natural numbers", () => {
  assert.ok(pageSource.includes("function simulatedAltitude()"));
  const altitudeGenerator = pageSource.match(
    /function simulatedAltitude\(\) \{[\s\S]*?\n\}/,
  )?.[0] ?? "";
  assert.ok(pageSource.includes("const baseline = 5 + Math.random() * 10"));
  assert.ok(pageSource.includes("const noise = (Math.random() - 0.5) * 0.6"));
  assert.equal(altitudeGenerator.includes("toFixed"), false);
  assert.ok(pageSource.includes("&alt=' + alt"));
  assert.ok(pageSource.includes("function simulatedAccuracy()"));
  assert.ok(pageSource.includes("&acc=' + acc"));
  assert.ok(pageSource.includes("function simulatedAltitudeAccuracy()"));
  const altitudeAccuracyGenerator = pageSource.match(
    /function simulatedAltitudeAccuracy\(\) \{[\s\S]*?\n\}/,
  )?.[0] ?? "";
  assert.ok(pageSource.includes("const baseline = 4 + Math.random() * 14"));
  assert.ok(pageSource.includes("const noise = (Math.random() - 0.5) * 1.4"));
  assert.ok(pageSource.includes("Math.min(18, Math.max(3, baseline + noise))"));
  assert.equal(altitudeAccuracyGenerator.includes("toFixed"), false);
  assert.ok(pageSource.includes("&altAcc=' + altAcc"));
  assert.equal(pageSource.includes("&acc=25"), false);
  assert.equal(pageSource.includes("altInput"), false);
  assert.equal(pageSource.includes("altAuto"), false);

  assert.ok(settingsScript.includes("altitude:o"));
  assert.ok(settingsScript.includes("altitudeAccuracy:p"));
  assert.ok(settingsScript.includes("l.get(\"altAcc\")"));
  assert.ok(settingsScript.includes("parseFloat(l.get(\"acc\")"));
  assert.ok(locationScript.includes("Math.round(100*t.altitude)"));
  assert.ok(locationScript.includes("Math.round(100*t.altitudeAccuracy)"));
  assert.ok(locationScript.includes("6===e.fieldNo&&0===e.wireType"));
  assert.ok(locationScript.includes("function nextAltitudeJitter("));
  assert.ok(locationScript.includes("targetAltitude:g?h:null"));
  assert.ok(locationScript.includes("altitudeJitter:g?u:null"));
  assert.ok(locationScript.includes("altitude:f"));
  assert.ok(locationScript.includes("生效海拔="));
  assert.ok(
    locationScript.includes("e.accuracy&&(r.accuracy=parseFloat(e.accuracy))"),
  );
  assert.ok(
    locationScript.includes("Pe(a.altitude)&&(r.altitude=parseFloat(a.altitude))"),
  );
  assert.ok(
    locationScript.includes(
      "Pe(a.altitudeAccuracy)&&(r.altitudeAccuracy=parseFloat(a.altitudeAccuracy))",
    ),
  );
});

test("parse API preserves natural coordinate precision", () => {
  assert.ok(pageSource.includes("?lon=' + lon"));
  assert.ok(pageSource.includes("'&lat=' + lat"));
  assert.equal(settingsScript.includes("parseFloat(l.get(\"lon\")"), true);
  assert.equal(workerIndexSource.includes("round6"), false);
});
