// Application Quit checks each local document before terminating the runtime.
const Save = require('./game-save.js');
class QuitDocuments {
    constructor(sessions, documents, options, env = globalThis) {
        this.sessions = sessions;
        this.documents = documents;
        this.options = options;
        this.env = env;
        this.state = 'idle';
        this.advancing = false;
        this.closed = 0;
        this.capture = null;
        const closed = documents.onClosed, canceled = documents.onCanceled;
        documents.onClosed = session => { closed(session); if (this.state === 'checking') { this.closed++; this.advance(); } };
        documents.onCanceled = () => { canceled(); this.abort(); };
        this.unload = event => {
            if (!this.hasUnsaved()) return;
            event.preventDefault();
            event.returnValue = '';
        };
        if (env.window && env.window.addEventListener) env.window.addEventListener('beforeunload', this.unload);
    }
    next() {
        return this.sessions.active || this.sessions.transient && this.sessions.transient.active ||
            this.sessions.sessions[this.sessions.sessions.length - 1] || null;
    }
    request() {
        if (this.state !== 'idle' || this.documents.dialog && this.documents.dialog.kind === 'busy') return false;
        this.capture = this.options.capture ? this.options.capture() : null;
        this.closed = 0;
        this.state = 'checking';
        this.documents.quitPending = true;
        return this.advance();
    }
    advance() {
        if (this.advancing || this.state !== 'checking') return true;
        this.advancing = true;
        try {
            while (this.state === 'checking') {
                const session = this.next();
                if (!session) {
                    this.state = 'complete';
                    this.documents.quitPending = false;
                    this.capture = null;
                    this.options.exit();
                    return true;
                }
                if (!this.options.activate(session) || !this.documents.beginClose()) { this.abort(); return false; }
                if (this.documents.dialog) return true;
            }
            return true;
        } catch (error) { this.abort(); throw error; }
        finally { this.advancing = false; }
    }
    abort() {
        if (this.state !== 'checking') return false;
        this.state = 'idle';
        this.documents.quitPending = false;
        const capture = this.capture;
        this.capture = null;
        if (!this.closed && this.options.restore) this.options.restore(capture);
        return true;
    }
    hasUnsaved() {
        if (this.state === 'complete') return false;
        if (this.documents.dialog && this.documents.dialog.kind === 'busy' && this.documents.dialog.operation === 'save') return true;
        const sessions = [...this.sessions.sessions];
        if (this.sessions.active && !sessions.includes(this.sessions.active)) sessions.push(this.sessions.active);
        try { return sessions.some(session => !session.file || session.savedContent !== Save.contentSignature(session.game)); }
        catch (error) { return true; }
    }
}
function isShortcut(event) {
    return !!(event && (event.ctrl || event.meta) && [17, 81, 113].includes(event.unicode));
}
module.exports = {QuitDocuments, isShortcut};
