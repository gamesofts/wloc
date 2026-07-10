import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

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
const stashOverride = await readFile(
  new URL("../modules/wloc.stoverride", import.meta.url),
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
  assert.ok(locationScript.includes("Math.round(t.altitude)"));
  assert.ok(locationScript.includes("Math.round(t.altitudeAccuracy)"));
  assert.ok(locationScript.includes("6===e.fieldNo&&0===e.wireType"));
  assert.ok(locationScript.includes("function simulatedAltitude()"));
  assert.ok(locationScript.includes("function nextVerticalAccuracy("));
  assert.ok(locationScript.includes("function validSystemAltitudeCenti("));
  assert.ok(locationScript.includes("function validSystemVerticalAccuracyCenti("));
  assert.ok(locationScript.includes("30+(Math.random()-.5)*8"));
  assert.ok(locationScript.includes("altitudeAccuracy:m"));
  assert.ok(locationScript.includes("function nextAltitudeJitter("));
  assert.ok(locationScript.includes("metadataVersion:2"));
  assert.ok(locationScript.includes("targetAltitude:y"));
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

test("response patch keeps valid system altitude metadata", () => {
  const context = createLocationScriptContext();
  const message = encodeLocationMessage(context, {
    latitude: 31.987654321,
    longitude: 121.123456789,
    accuracy: 25,
    altitudeCenti: 1234,
    verticalAccuracyCenti: 4567,
  });

  const patched = context.__Oe(
    message,
    {
      latitude: 22.123456789,
      longitude: 113.987654321,
      accuracy: 18,
      altitude: 9.87,
      altitudeAccuracy: 31.23,
    },
    { locations: 0 },
  );
  const fields = decodeFields(context, patched);

  assert.equal(fields.get(5), 1234);
  assert.equal(fields.get(6), 4567);
});

test("response patch replaces invalid system altitude sentinels", () => {
  const context = createLocationScriptContext();
  const message = encodeLocationMessage(context, {
    latitude: 31.987654321,
    longitude: 121.123456789,
    accuracy: 25,
    altitudeCenti: -100,
    verticalAccuracyCenti: -100,
  });

  const patched = context.__Oe(
    message,
    {
      latitude: 22.123456789,
      longitude: 113.987654321,
      accuracy: 18,
      altitude: 9.87,
      altitudeAccuracy: 31.23,
    },
    { locations: 0 },
  );
  const fields = decodeFields(context, patched);

  assert.equal(fields.get(5), 10);
  assert.equal(fields.get(6), 31);
});

test("simulated altitude ignores stale unversioned jitter state", () => {
  const store = {
    wloc_jitter_v1: JSON.stringify({
      targetLongitude: 121.123456789,
      targetLatitude: 31.987654321,
      accuracy: 25,
      targetAltitude: 5,
      altitudeAccuracy: 30,
      east: 0,
      north: 0,
      altitudeJitter: 0,
      updatedAt: 1000,
    }),
  };
  const randomValues = [0.5, 0.5, 0.5, 0.6, 0.7, 0.6, 0.7];
  const context = {
    console: { log() {} },
    Date,
    $environment: { "stash-version": "3.0.0" },
    Math: Object.create(Math, {
      random: {
        value: () => randomValues.shift() ?? 0.6,
      },
    }),
    $script: { startTime: 0 },
    $argument:
      "longitude=121.123456789&latitude=31.987654321&accuracy=25&logLevel=off",
    $request: { url: "https://gs-loc.apple.com/clls/wloc" },
    $persistentStore: {
      read: (key) => store[key] ?? null,
      write: (value, key) => {
        store[key] = value;
        return true;
      },
    },
    $done() {},
  };
  vm.createContext(context);
  vm.runInContext(
    `${locationScript}\nglobalThis.__applyLocationJitter = applyLocationJitter;`,
    context,
  );

  const result = context.__applyLocationJitter(
    {
      longitude: 121.123456789,
      latitude: 31.987654321,
      accuracy: 25,
      altitude: null,
      altitudeAccuracy: null,
    },
    1100,
  );
  const savedState = JSON.parse(store.wloc_jitter_v1);

  assert.notEqual(result.targetAltitude, 5);
  assert.ok(result.targetAltitude >= 5);
  assert.ok(result.targetAltitude <= 15);
  assert.ok(result.altitude >= 5);
  assert.ok(result.altitude <= 15);
  assert.notEqual(result.altitudeAccuracy, 30);
  assert.ok(result.altitudeAccuracy >= 22);
  assert.ok(result.altitudeAccuracy <= 38);
  assert.equal(savedState.metadataVersion, 2);
});

function createLocationScriptContext(extra = {}) {
  const context = {
    console: { log() {} },
    Date,
    $environment: { "stash-version": "3.0.0" },
    Math,
    $script: { startTime: 0 },
    $argument:
      "longitude=121.123456789&latitude=31.987654321&accuracy=25&logLevel=off",
    $request: { url: "https://gs-loc.apple.com/clls/wloc" },
    $persistentStore: {
      read: () => null,
      write: () => true,
    },
    $done() {},
    ...extra,
  };
  vm.createContext(context);
  vm.runInContext(
    `${locationScript}
globalThis.__Oe = Oe;
globalThis.__Te = Te;
globalThis.__Ne = Ne;
globalThis.__applyLocationJitter = applyLocationJitter;`,
    context,
  );
  return context;
}

function encodeLocationMessage(context, values) {
  return [
    ...context.__Ne(1, 0, Math.round(values.latitude * 1e8)),
    ...context.__Ne(2, 0, Math.round(values.longitude * 1e8)),
    ...context.__Ne(3, 0, values.accuracy),
    ...context.__Ne(5, 0, values.altitudeCenti),
    ...context.__Ne(6, 0, values.verticalAccuracyCenti),
  ];
}

function decodeFields(context, message) {
  return new Map(
    context
      .__Te(message)
      .filter((field) => field.wireType === 0)
      .map((field) => [field.fieldNo, field.value]),
  );
}

test("parse API preserves natural coordinate precision", () => {
  assert.ok(pageSource.includes("?lon=' + lon"));
  assert.ok(pageSource.includes("'&lat=' + lat"));
  assert.equal(settingsScript.includes("parseFloat(l.get(\"lon\")"), true);
  assert.equal(workerIndexSource.includes("round6"), false);
});

test("Stash response scripts return binary bodies directly", () => {
  assert.ok(stashOverride.includes("type: response"));
  assert.ok(stashOverride.includes("require-body: true"));
  assert.ok(stashOverride.includes("binary-mode: true"));
  assert.ok(locationScript.includes('"Stash"===e?i(qe):i({response:qe})'));
});
