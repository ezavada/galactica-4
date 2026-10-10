// Shared neutral window surfaces for setup, dialogs and map inspectors.
const colors = {
    panelFill: [0.135, 0.135, 0.135, 0.92],
    windowFill: [0.135, 0.135, 0.135, 0.96],
    panelBorder: [0.50, 0.50, 0.50, 0.55]
};

function color(name) {
    return new pdg.Color(...colors[name]);
}

function applySurface(attrs, rect, topBase, bottomBase = topBase, topLift = 0.075) {
    attrs.fillGradient(new pdg.Point(rect.x, rect.y),
        new pdg.Color(topBase.red + topLift, topBase.green + topLift, topBase.blue + topLift, topBase.alpha),
        new pdg.Point(rect.x, rect.y + rect.height), bottomBase);
    attrs.lineStyle(pdg.lineStyle_Solid).lineThickness(0.7);
}

function ownerBorder(owner) {
    const base = color('panelBorder');
    return new pdg.Color(base.red * 0.8 + owner.red * 0.2,
        base.green * 0.8 + owner.green * 0.2,
        base.blue * 0.8 + owner.blue * 0.2, base.alpha);
}

function applySystemSurface(attrs,rect){
    attrs.fillGradient(new pdg.Point(rect.x,rect.y),new pdg.Color(.98,.98,.96,.97),
        new pdg.Point(rect.x,rect.y+rect.height),new pdg.Color(.76,.77,.78,.97))
        .lineColor(new pdg.Color(.75,.53,.12,1)).lineStyle(pdg.lineStyle_Solid).lineThickness(2);
}
function drawGoldEdges(port,rect,highlight,shade){
    port.drawLine(new pdg.Point(rect.x+16,rect.y+2),new pdg.Point(rect.x+rect.width-16,rect.y+2),highlight);
    port.drawLine(new pdg.Point(rect.x+2,rect.y+16),new pdg.Point(rect.x+2,rect.y+rect.height*.55),highlight);
    port.drawLine(new pdg.Point(rect.x+16,rect.y+rect.height-2),new pdg.Point(rect.x+rect.width-16,rect.y+rect.height-2),shade);
}
module.exports = { colors, color, applySurface, ownerBorder,applySystemSurface,drawGoldEdges };
