// Smoke test for draw_lib.jsx: draws one of each shape, each on its own named layer, then
// checks every layer's pixel bounds against what was requested.
// The document is 150 ppi on purpose, to check that pixel coordinates don't depend on resolution.
#target photoshop
#include "draw_lib.jsx"

var saved = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;
var doc = app.documents.add(800, 600, 150, "Draw Lib Test", NewDocumentMode.RGB, DocumentFill.WHITE);
app.preferences.rulerUnits = saved;

var sky = Draw.newLayer(doc, "Sky Gradient");
Draw.linearGradient(doc, 0, 0, 0, 600, "#1e3c72", "#f7b733");

var box = Draw.newLayer(doc, "Blue Rect");
Draw.rect(doc, 50, 50, 300, 200, [40, 90, 220]);

var tri = Draw.newLayer(doc, "Green Triangle");
Draw.polygon(doc, [[100, 550], [250, 300], [400, 550]], "#2ecc71");

var sun = Draw.newLayer(doc, "Red Circle");
Draw.circle(doc, 600, 250, 120, "#e74c3c");

var band = Draw.newLayer(doc, "Region Gradient");
Draw.linearGradient(doc, 450, 450, 750, 450, "#ffffff", "#8e44ad", [450, 450, 300, 100]);

// Antialiased edges can add up to 1px of partial coverage, so allow that much slack.
var checks = [
    [sky, [0, 0, 800, 600]],
    [box, [50, 50, 350, 250]],
    [tri, [100, 300, 400, 550]],
    [sun, [480, 130, 720, 370]],
    [band, [450, 450, 750, 550]]
];
var lines = [], failures = 0;
for (var i = 0; i < checks.length; i++) {
    var got = Draw.boundsPx(checks[i][0]), want = checks[i][1], ok = true;
    for (var k = 0; k < 4; k++) if (Math.abs(got[k] - want[k]) > 1) ok = false;
    if (!ok) failures++;
    lines.push((ok ? "PASS " : "FAIL ") + checks[i][0].name + ": got [" + got.join(", ") + "], want [" + want.join(", ") + "]");
}
lines.push(failures === 0 ? "ALL PASS" : failures + " FAILED");

lines.join("\n");
