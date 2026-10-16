// Reusable panel artwork. Text keeps its native ElementRef across updates.
class RetainedPanel {
    constructor(display, width) {
        this.display = display;
        this.drawing = pdg.createDrawing();
        this.fields = new Map();
        this.parentAttributes = new pdg.Attributes();
        this.drawing.addLine(new pdg.Point(14, 28), new pdg.Point(width - 14, 28), display.styles.divider)
            .setLiveAttributes(display.styles.divider);
    }

    text(id, text, x, baseline, color = 'lightgray', size = 12, style = pdg.textStyle_Plain) {
        text = String(text);
        const port = this.display.port;
        const attrs = this.display.getTextAttributes(color, size, style);
        const font = port.getCurrentFont(style);
        const fontName = font.getFontName();
        const previous = this.fields.get(id);
        if (previous && previous.text === text && previous.attrs === attrs && previous.fontName === fontName &&
            previous.x === x && previous.baseline === baseline && previous.size === size && previous.style === style) return;

        // Match Port.drawText(Point)'s baseline and integer justification exactly.
        const width = port.getTextWidth(text, size, style);
        const left = x - ((style & pdg.textStyle_Centered) ? Math.floor(width / 2)
            : (style & pdg.textStyle_RightJustified) ? width : 0);
        const rect = new pdg.Rect(left, baseline - Math.ceil(font.getFontAscent(size, style)),
            left + width, baseline + Math.ceil(font.getFontDescent(size, style)));
        let element;
        if (previous) {
            element = previous.element;
            element.setText(text);
            element.changeControlPoint(0, rect.leftTop());
            element.changeControlPoint(2, rect.rightBottom());
        } else {
            element = this.drawing.addText(text, rect, attrs);
        }
        element.setLiveAttributes(attrs);
        this.fields.set(id, { element, text, attrs, fontName, x, baseline, size, style });
    }

    labelValue(id, label, value, y, options = {}) {
        const size = options.size || 12;
        const labelWidth = options.labelWidth || 117;
        this.text(id + '-label', label, labelWidth, y, 'labelgray', size, pdg.textStyle_RightJustified);
        this.text(id, value, labelWidth + 5, y, options.valueColor || 'lightgray', size);
    }

    draw(rect,appearance) {
        // Drawing rectangles replay as quads in PDG 1.2; keep the rounded
        // background on Port.drawRect so its corner styling is preserved.
        this.display.drawPanelSurface(rect,appearance || this.display.styles.panel);
        this.display.port.drawDrawing(this.drawing, new pdg.Point(rect.x, rect.y), this.parentAttributes);
    }
}
module.exports = RetainedPanel;
