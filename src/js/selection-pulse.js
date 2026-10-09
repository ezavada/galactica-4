// All selection rings share the same phase and one update owner (Display).
const scriptName = 'galactica.selection-pulse';
let defined = false;
class SelectionPulse {
    constructor() {
        if (!defined) {
            pdg.Animated.defineScript(scriptName)
                .moveTo(1, 0, 0.5, pdg.linearTween).repeat().endScript();
            defined = true;
        }
        this.target = new pdg.Animated();
        this.lastTime = null;
    }

    sample(milliseconds) {
        if (this.lastTime === null || milliseconds < this.lastTime) {
            this.target.cancelSchedule().setLocation(0, 0).playScript(scriptName);
            // Preserve the existing half-second phase, including when a view
            // is opened after the engine clock has been running for a while.
            this.lastTime = milliseconds - milliseconds % 500;
        }
        // Entire cycles have no visible effect. Skip them so returning to a
        // selection after a long idle period does not replay hours of steps.
        this.target.animate(((milliseconds - this.lastTime) % 500) / 1000);
        this.lastTime = milliseconds;
        return this.target.getLocation().x;
    }
}
module.exports = SelectionPulse;
