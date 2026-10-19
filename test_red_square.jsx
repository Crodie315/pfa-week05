// Creates a 1000x1000 document and fills a centered 500x500 red square.
#target photoshop

var originalUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;
var result;

try {
    var doc = app.documents.add(1000, 1000, 72, "Red Square Test", NewDocumentMode.RGB, DocumentFill.WHITE);

    var x0 = 250, y0 = 250, x1 = 750, y1 = 750;
    doc.selection.select([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);

    var red = new SolidColor();
    red.rgb.red = 255;
    red.rgb.green = 0;
    red.rgb.blue = 0;

    doc.selection.fill(red);
    doc.selection.deselect();

    result = "OK: created '" + doc.name + "' (" + doc.width.as("px") + "x" + doc.height.as("px") + ") with red square";
} finally {
    app.preferences.rulerUnits = originalUnits;
}

// The value of the last statement is returned to the COM caller.
result;
