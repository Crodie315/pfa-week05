// draw_lib.jsx: reusable drawing helpers for Photoshop, for scripts run through ps_bridge.ps1.
//
// Include from a script in the same folder with:
//     #include "draw_lib.jsx"
//
// All coordinates and sizes are in pixels, whatever the document's resolution or the
// user's ruler-unit preference. Colors can be "#rrggbb", [r, g, b] (0-255) or a SolidColor.
// Shapes are drawn on the document's active layer; use Draw.newLayer() to start a new one.
// The screen refreshes after every shape, so you can watch each one appear.
#target photoshop

var Draw = (function () {
    function cTID(s) { return charIDToTypeID(s); }

    // Runs fn with ruler units set to pixels, then restores the user's setting.
    function withPixels(fn) {
        var saved = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;
        try {
            return fn();
        } finally {
            app.preferences.rulerUnits = saved;
        }
    }

    function activate(doc) {
        if (app.activeDocument !== doc) app.activeDocument = doc;
    }

    function toColor(c) {
        if (c instanceof SolidColor) return c;
        var rgb;
        if (typeof c === "string") {
            var hex = c.replace(/^#/, "");
            if (!/^[0-9a-fA-F]{6}$/.test(hex)) throw new Error("Bad color: " + c);
            rgb = [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)];
        } else if (c instanceof Array && c.length === 3) {
            rgb = c;
        } else {
            throw new Error("Bad color: " + c);
        }
        var sc = new SolidColor();
        sc.rgb.red = rgb[0];
        sc.rgb.green = rgb[1];
        sc.rgb.blue = rgb[2];
        return sc;
    }

    function rectPoints(x, y, w, h) {
        return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    }

    function fillSelection(doc, color) {
        doc.selection.fill(toColor(color));
        doc.selection.deselect();
        app.refresh();
    }

    function selectEllipse(x, y, w, h) {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putProperty(cTID("Chnl"), cTID("fsel"));
        desc.putReference(cTID("null"), ref);
        var box = new ActionDescriptor();
        box.putUnitDouble(cTID("Top "), cTID("#Pxl"), y);
        box.putUnitDouble(cTID("Left"), cTID("#Pxl"), x);
        box.putUnitDouble(cTID("Btom"), cTID("#Pxl"), y + h);
        box.putUnitDouble(cTID("Rght"), cTID("#Pxl"), x + w);
        desc.putObject(cTID("T   "), cTID("Elps"), box);
        desc.putBoolean(cTID("AntA"), true);
        executeAction(cTID("setd"), desc, DialogModes.NO);
    }

    function gradientStop(color, location) {
        var rgb = toColor(color).rgb;
        var clr = new ActionDescriptor();
        clr.putDouble(cTID("Rd  "), rgb.red);
        clr.putDouble(cTID("Grn "), rgb.green);
        clr.putDouble(cTID("Bl  "), rgb.blue);
        var stop = new ActionDescriptor();
        stop.putObject(cTID("Clr "), cTID("RGBC"), clr);
        stop.putEnumerated(cTID("Type"), cTID("Clry"), cTID("UsrS"));
        stop.putInteger(cTID("Lctn"), location);
        stop.putInteger(cTID("Mdpn"), 50);
        return stop;
    }

    function opacityStop(location) {
        var stop = new ActionDescriptor();
        stop.putUnitDouble(cTID("Opct"), cTID("#Prc"), 100);
        stop.putInteger(cTID("Lctn"), location);
        stop.putInteger(cTID("Mdpn"), 50);
        return stop;
    }

    function point(x, y) {
        var p = new ActionDescriptor();
        p.putUnitDouble(cTID("Hrzn"), cTID("#Pxl"), x);
        p.putUnitDouble(cTID("Vrtc"), cTID("#Pxl"), y);
        return p;
    }

    return {
        // Creates a new layer called `name` above the active layer and makes it active.
        newLayer: function (doc, name) {
            activate(doc);
            var layer = doc.artLayers.add();
            layer.name = name;
            doc.activeLayer = layer;
            app.refresh();
            return layer;
        },

        // Fills the rectangle with top-left corner (x, y), width w and height h.
        rect: function (doc, x, y, w, h, color) {
            activate(doc);
            withPixels(function () {
                doc.selection.select(rectPoints(x, y, w, h), SelectionType.REPLACE, 0, false);
                fillSelection(doc, color);
            });
        },

        // Fills a polygon. points: [[x1, y1], [x2, y2], ...], at least 3 points.
        polygon: function (doc, points, color) {
            if (!(points instanceof Array) || points.length < 3) throw new Error("polygon needs at least 3 points");
            activate(doc);
            withPixels(function () {
                doc.selection.select(points, SelectionType.REPLACE, 0, true);
                fillSelection(doc, color);
            });
        },

        // Fills a circle with center (cx, cy) and radius r, with antialiased edges.
        circle: function (doc, cx, cy, r, color) {
            activate(doc);
            withPixels(function () {
                selectEllipse(cx - r, cy - r, 2 * r, 2 * r);
                fillSelection(doc, color);
            });
        },

        // Draws a linear gradient from (x0, y0) in colorFrom to (x1, y1) in colorTo.
        // Fills the whole layer, or only the rectangle given as region: [x, y, w, h].
        linearGradient: function (doc, x0, y0, x1, y1, colorFrom, colorTo, region) {
            activate(doc);
            withPixels(function () {
                if (region) {
                    doc.selection.select(rectPoints(region[0], region[1], region[2], region[3]), SelectionType.REPLACE, 0, false);
                } else {
                    doc.selection.deselect();
                }

                var grad = new ActionDescriptor();
                grad.putString(cTID("Nm  "), "Custom");
                grad.putEnumerated(cTID("GrdF"), cTID("GrdF"), cTID("CstS"));
                grad.putDouble(cTID("Intr"), 4096);
                var colors = new ActionList();
                colors.putObject(cTID("Clrt"), gradientStop(colorFrom, 0));
                colors.putObject(cTID("Clrt"), gradientStop(colorTo, 4096));
                grad.putList(cTID("Clrs"), colors);
                var opacities = new ActionList();
                opacities.putObject(cTID("TrnS"), opacityStop(0));
                opacities.putObject(cTID("TrnS"), opacityStop(4096));
                grad.putList(cTID("Trns"), opacities);

                var desc = new ActionDescriptor();
                desc.putObject(cTID("From"), cTID("Pnt "), point(x0, y0));
                desc.putObject(cTID("T   "), cTID("Pnt "), point(x1, y1));
                desc.putEnumerated(cTID("Type"), cTID("GrdT"), cTID("Lnr "));
                desc.putBoolean(cTID("Dthr"), true);
                desc.putBoolean(cTID("UsMs"), true);
                desc.putObject(cTID("Grad"), cTID("Grdn"), grad);
                executeAction(cTID("Grdn"), desc, DialogModes.NO);

                doc.selection.deselect();
                app.refresh();
            });
        },

        // Returns a layer's bounds in pixels as [left, top, right, bottom].
        boundsPx: function (layer) {
            return withPixels(function () {
                var b = layer.bounds;
                return [b[0].as("px"), b[1].as("px"), b[2].as("px"), b[3].as("px")];
            });
        }
    };
})();
