// Shared neutral window surfaces for setup, dialogs and map inspectors.
const colors = {
    panelFill: [0.135, 0.135, 0.135, 0.92],
    windowFill: [0.135, 0.135, 0.135, 0.96],
    panelBorder: [0.50, 0.50, 0.50, 0.55]
};

function color(name) {
    return new pdg.Color(...colors[name]);
}

function applySurface(attrs, rect, topBase, bottomBase = topBase) {
    attrs.fillGradient(new pdg.Point(rect.x, rect.y),
        new pdg.Color(topBase.red + 0.022, topBase.green + 0.022, topBase.blue + 0.022, topBase.alpha),
        new pdg.Point(rect.x, rect.y + rect.height), bottomBase);
    attrs.lineStyle(pdg.lineStyle_Solid).lineThickness(0.7);
}

function ownerBorder(owner) {
    const base = color('panelBorder');
    return new pdg.Color(base.red * 0.8 + owner.red * 0.2,
        base.green * 0.8 + owner.green * 0.2,
        base.blue * 0.8 + owner.blue * 0.2, base.alpha);
}

module.exports = { colors, color, applySurface, ownerBorder };
