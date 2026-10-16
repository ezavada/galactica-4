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
        // Display supplies the time samples; automatic Scene updates would
        // advance the pulse a second time between draws.
        this.scene = new pdg.Scene();
        this.scene.setManual(true);
        this.scene.addAnimated(this.target);
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
        let remaining = ((milliseconds - this.lastTime) % 500) / 1000;
        // Scene.advance admits at most 250 ms per call. Keep the entire
        // fractional cycle when sampling after a slower frame.
        do {
            const seconds = Math.min(remaining, 0.25);
            this.scene.advance(seconds);
            remaining -= seconds;
        } while (remaining > 0);
        this.lastTime = milliseconds;
        return this.target.getLocation().x;
    }

    dispose() {
        this.scene.dispose();
    }
}
module.exports = SelectionPulse;
