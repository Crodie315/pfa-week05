// A simplified, flat-shape take on Leonardo's The Last Supper (no apostles), built with draw_lib.jsx.
// The room is a box in one-point perspective with its vanishing point at the canvas center,
// which (as in the original) falls on Jesus's head, framed by the brightest window.
//
// Optional argument 0: a path to also save a PNG copy of the result to.
#target photoshop
#include "draw_lib.jsx"

var W = 1920, H = 1080;
var VX = W / 2, VY = H / 2;   // vanishing point
var F = 1000;                 // focal length in pixels

// Room in 3D units: camera at the origin looking down +Z, Y up.
var ROOM_X = 3.4, FLOOR = -2.2, CEIL = 3.4, BACK = 10;

// Projects a 3D point onto the canvas.
function P(x, y, z) { return [VX + F * x / z, VY - F * y / z]; }
function quad(a, b, c, d) { return [P(a[0], a[1], a[2]), P(b[0], b[1], b[2]), P(c[0], c[1], c[2]), P(d[0], d[1], d[2])]; }
// Pushes a canvas point away from the vanishing point, past the canvas edge.
function far(p) { return [VX + (p[0] - VX) * 4, VY + (p[1] - VY) * 4]; }

var saved = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;
var doc = app.documents.add(W, H, 72, "The Last Supper (simplified)", NewDocumentMode.RGB, DocumentFill.WHITE);
app.preferences.rulerUnits = saved;

var layerNames = [];
function layer(name, draw) {
    Draw.newLayer(doc, name);
    layerNames.push(name);
    draw();
}

// ---- Room ----
var bTL = P(-ROOM_X, CEIL, BACK), bTR = P(ROOM_X, CEIL, BACK);
var bBL = P(-ROOM_X, FLOOR, BACK), bBR = P(ROOM_X, FLOOR, BACK);

layer("Back Wall", function () {
    Draw.rect(doc, bTL[0], bTL[1], bTR[0] - bTL[0], bBL[1] - bTL[1], "#c9b48f");
});
layer("Ceiling", function () {
    Draw.polygon(doc, [far(bTL), far(bTR), bTR, bTL], "#5b4a3a");
});
layer("Ceiling Beams", function () {
    var xs = [-2.4, -1.2, 0, 1.2, 2.4], hw = 0.08;
    for (var i = 0; i < xs.length; i++) {
        Draw.polygon(doc, quad([xs[i] - hw, CEIL, 2.5], [xs[i] + hw, CEIL, 2.5], [xs[i] + hw, CEIL, BACK], [xs[i] - hw, CEIL, BACK]), "#3e3127");
    }
});
layer("Left Wall", function () {
    Draw.polygon(doc, [far(bTL), bTL, bBL, far(bBL)], "#9c8462");
});
layer("Right Wall", function () {
    Draw.polygon(doc, [far(bTR), bTR, bBR, far(bBR)], "#bfa67f");
});
layer("Floor", function () {
    Draw.polygon(doc, [bBL, bBR, far(bBR), far(bBL)], "#6e5a44");
});

// Four tapestries per side wall, equally spaced in depth so they shrink toward the back.
function tapestries(x, color) {
    for (var z = 4.5; z < 9.5; z += 1.3) {
        Draw.polygon(doc, quad([x, 2.2, z], [x, 2.2, z + 1.0], [x, -1.0, z + 1.0], [x, -1.0, z]), color);
    }
}
layer("Left Wall Tapestries", function () { tapestries(-ROOM_X, "#433d31"); });
layer("Right Wall Tapestries", function () { tapestries(ROOM_X, "#4f4838"); });

// ---- Windows on the back wall ----
// x0..x1 and yTop..yBottom are in 3D units on the back wall plane.
function backWindow(name, x0, x1, yTop, yBottom, arched, skyTop, skyBottom, hillColor) {
    var tl = P(x0, yTop, BACK), br = P(x1, yBottom, BACK);
    var x = tl[0], y = tl[1], w = br[0] - tl[0], h = br[1] - tl[1];
    var cx = x + w / 2, r = w / 2, edge = 8;

    layer(name + " Frame", function () {
        if (arched) Draw.circle(doc, cx, y, r + edge, "#4b3f33");
        Draw.rect(doc, x - edge, y - edge, w + 2 * edge, h + 2 * edge, "#4b3f33");
    });
    layer(name + " Sky", function () {
        // The gradient covers the circle's lower half, leaving a flat arch the color of the gradient's top.
        if (arched) Draw.circle(doc, cx, y, r, skyTop);
        Draw.linearGradient(doc, x, y, x, y + h, skyTop, skyBottom, [x, y, w, h]);
    });
    layer(name + " Hills", function () {
        Draw.polygon(doc, [[x, y + h * 0.75], [x + w * 0.3, y + h * 0.65], [x + w * 0.6, y + h * 0.78],
                           [x + w, y + h * 0.7], [x + w, y + h], [x, y + h]], hillColor);
    });
}
backWindow("Left Window", -2.5, -1.6, 2.1, -0.3, false, "#93abb8", "#c3cdc8", "#56676c");
backWindow("Right Window", 1.6, 2.5, 2.1, -0.3, false, "#93abb8", "#c3cdc8", "#56676c");
backWindow("Middle Window", -0.9, 0.9, 2.1, -0.6, true, "#e3edf1", "#fffbea", "#8a9ca2");

// ---- Jesus (drawn before the table, which hides his lower body) ----
var ROBE = "#b02a24", MANTLE = "#2f4f8f", SKIN = "#e0b48c", HAIR = "#6b4a2b";
var tableBackY = P(0, -1.0, 7)[1];   // 683

layer("Jesus Robe", function () {
    Draw.polygon(doc, [[945, 580], [975, 580], [1010, 598], [1100, tableBackY + 20], [820, tableBackY + 20], [910, 598]], ROBE);
});
layer("Jesus Mantle", function () {
    // Over his left shoulder (viewer's right) and down that side, with a fold across the other side.
    Draw.polygon(doc, [[975, 588], [1012, 600], [1100, tableBackY + 20], [1008, tableBackY + 20], [990, 640], [972, 602]], MANTLE);
    Draw.polygon(doc, [[820, tableBackY + 20], [868, 650], [905, tableBackY + 20]], MANTLE);
});
layer("Jesus Hair", function () {
    // The part below the face doubles as the beard.
    Draw.circle(doc, 960, 538, 42, HAIR);
    Draw.polygon(doc, [[919, 545], [1001, 545], [1010, 612], [910, 612]], HAIR);
});
layer("Jesus Head", function () {
    Draw.circle(doc, VX, VY + 5, 34, SKIN);
});

// ---- Table ----
var TX = 2.9, TOP = -1.0, CLOTH_BOTTOM = -1.7, Z_FRONT = 6, Z_BACK = 7;

layer("Table Shadow", function () {
    Draw.polygon(doc, quad([-TX, FLOOR, Z_BACK + 0.2], [TX, FLOOR, Z_BACK + 0.2], [TX, FLOOR, Z_FRONT], [-TX, FLOOR, Z_FRONT]), "#4e3f30");
});
layer("Table Legs", function () {
    var xs = [-2.6, -0.9, 0.9, 2.6];
    for (var i = 0; i < xs.length; i++) {
        var a = P(xs[i] - 0.06, CLOTH_BOTTOM, Z_FRONT), b = P(xs[i] + 0.06, FLOOR, Z_FRONT);
        Draw.rect(doc, a[0], a[1], b[0] - a[0], b[1] - a[1], "#3b2c20");
    }
});
layer("Tablecloth Top", function () {
    Draw.polygon(doc, quad([-TX, TOP, Z_BACK], [TX, TOP, Z_BACK], [TX, TOP, Z_FRONT], [-TX, TOP, Z_FRONT]), "#e4e1d8");
});
layer("Tablecloth Front", function () {
    var a = P(-TX, TOP, Z_FRONT), b = P(TX, CLOTH_BOTTOM, Z_FRONT);
    Draw.rect(doc, a[0], a[1], b[0] - a[0], b[1] - a[1], "#f4f2ec");
});

// ---- Jesus's arms, resting on the table ----
layer("Jesus Right Arm", function () {   // viewer's left: red sleeve reaching toward the table
    Draw.polygon(doc, [[905, 600], [932, 612], [872, 702], [846, 690]], ROBE);
});
layer("Jesus Left Arm", function () {    // viewer's right: covered by the blue mantle
    Draw.polygon(doc, [[1015, 600], [988, 612], [1048, 702], [1074, 690]], MANTLE);
});
layer("Jesus Hands", function () {
    Draw.circle(doc, 856, 699, 12, SKIN);
    Draw.circle(doc, 1064, 699, 12, SKIN);
});

var report = "Drew " + layerNames.length + " layers: " + layerNames.join(", ");
if (arguments.length > 0 && arguments[0]) {
    var png = new File(String(arguments[0]).replace(/\\/g, "/"));
    var pngOpts = new PNGSaveOptions();
    pngOpts.compression = 9;
    doc.saveAs(png, pngOpts, true, Extension.LOWERCASE);
    report += "\nSaved PNG copy: " + png.fsName;
}
report;
