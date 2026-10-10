(function() {
    'use strict';

    var statusNode = document.getElementById('status');
    var canvas = document.getElementById('pdg-canvas');
    var moduleCache = Object.create(null);
    var builtins = Object.create(null);
    var appBaseUrl = new URL('./', window.location.href);
    var appBasePath = appBaseUrl.pathname;
    var failed = false;

    var localizedStatusText = {
        en: {
            loading: 'Loading Galactica-4…',
            loadingAssets: 'Loading Galactica-4 assets…',
            failed: 'Galactica-4 failed to start — see the console for details.'
        },
        de: {
            loading: 'Galactica-4 wird geladen…',
            loadingAssets: 'Galactica-4-Ressourcen werden geladen…',
            failed: 'Galactica-4 konnte nicht gestartet werden — Details stehen in der Konsole.'
        },
        es: {
            loading: 'Cargando Galactica-4…',
            loadingAssets: 'Cargando recursos de Galactica-4…',
            failed: 'Galactica-4 no pudo iniciarse — consulta la consola para más detalles.'
        },
        fr: {
            loading: 'Chargement de Galactica-4…',
            loadingAssets: 'Chargement des ressources de Galactica-4…',
            failed: 'Galactica-4 n’a pas pu démarrer — consultez la console pour les détails.'
        },
        ja: {
            loading: 'Galactica-4 を読み込み中…',
            loadingAssets: 'Galactica-4 のリソースを読み込み中…',
            failed: 'Galactica-4 を起動できませんでした。詳細はコンソールを確認してください。'
        },
        ru: {
            loading: 'Загрузка Galactica-4…',
            loadingAssets: 'Загрузка ресурсов Galactica-4…',
            failed: 'Не удалось запустить Galactica-4 — подробности смотрите в консоли.'
        }
    };

    // Native browser menus interrupt the canvas mouse stream and take keyboard
    // focus away from PDG. Galactica uses right-click in-game, so keep those
    // gestures inside the canvas.
    // Keep mouse drag/release events on the canvas when a slider or map
    // scroll thumb crosses its edge. The browser releases capture on mouse-up.
    canvas.addEventListener('pointerdown', function(event) {
        if (event.pointerType === 'mouse' && (event.button === 0 || event.button === 1) &&
                typeof canvas.setPointerCapture === 'function') {
            canvas.setPointerCapture(event.pointerId);
        }
    });
    var heldMouseButtons = 0;
    var lastMousePosition = {clientX:0,clientY:0};
    function buttonMask(button) { return button === 0 ? 1 : button === 1 ? 4 : 2; }
    function releaseMouseButton(button, event) {
        var mask = buttonMask(button);
        if (!(heldMouseButtons & mask)) return;
        heldMouseButtons &= ~mask;
        // GLFW's browser bridge accepts releases only when their target is the
        // canvas. Forward a lost external release through its normal event path.
        canvas.dispatchEvent(new MouseEvent('mouseup', {bubbles:true,button:button,
            buttons:heldMouseButtons,clientX:event.clientX,clientY:event.clientY}));
    }
    canvas.addEventListener('mousedown', function(event) {
        if (event.button === 0 || event.button === 1) heldMouseButtons |= buttonMask(event.button);
        lastMousePosition = event;
        canvas.focus({ preventScroll: true });
    }, true);
    canvas.addEventListener('mouseup', function(event) {
        heldMouseButtons &= ~buttonMask(event.button);
    }, true);
    canvas.addEventListener('mousemove', function(event) {
        lastMousePosition = event;
        [0,1].forEach(function(button) {
            if (!(event.buttons & buttonMask(button))) releaseMouseButton(button,event);
        });
    }, true);
    window.addEventListener('mouseup', function(event) {
        if (event.target !== canvas) releaseMouseButton(event.button,event);
    });
    window.addEventListener('blur', function() {
        [0,1].forEach(function(button) { releaseMouseButton(button,lastMousePosition); });
    });
    canvas.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        canvas.focus({ preventScroll: true });
    });

    function requestedLanguage() {
        var params = new URLSearchParams(window.location.search);
        var lang = params.get('lang') || params.get('language') ||
            (navigator.language || navigator.userLanguage || 'en');
        lang = String(lang).toLowerCase().slice(0, 2);
        return localizedStatusText[lang] ? lang : 'en';
    }

    var statusLanguage = requestedLanguage();

    function statusText(key) {
        return localizedStatusText[statusLanguage][key] || localizedStatusText.en[key];
    }

    function setStatus(key) {
        if (statusNode) {
            statusNode.textContent = statusText(key);
        }
    }

    setStatus('loading');

    function fail(error) {
        if (failed) {
            return;
        }
        failed = true;
        var message = error && error.stack ? error.stack : String(error);
        console.error(message);
        document.documentElement.setAttribute('data-status', 'failed');
        if (statusNode) {
            statusNode.textContent = statusText('failed');
        }
    }

    function normalizePath(value) {
        var parts = String(value || '').replace(/\\/g, '/').split('/');
        var output = [];
        parts.forEach(function(part) {
            if (!part || part === '.') return;
            if (part === '..') output.pop();
            else output.push(part);
        });
        return '/' + output.join('/');
    }

    var pathModule = {
        basename: function(value) { return normalizePath(value).split('/').pop(); },
        dirname: function(value) {
            var normalized = normalizePath(value);
            return normalized.slice(0, normalized.lastIndexOf('/')) || '/';
        },
        extname: function(value) {
            var name = pathModule.basename(value);
            var dot = name.lastIndexOf('.');
            return dot > 0 ? name.slice(dot) : '';
        },
        join: function() { return normalizePath(Array.prototype.join.call(arguments, '/')); },
        resolve: function() { return normalizePath(Array.prototype.join.call(arguments, '/')); }
    };

    function virtualPathFor(url) {
        var pathname = decodeURIComponent(new URL(url).pathname);
        if (pathname.indexOf(appBasePath) === 0) {
            pathname = pathname.slice(appBasePath.length);
        }
        return normalizePath('/' + pathname);
    }

    function installBuiltins() {
        builtins.pdg = window.pdg;
        builtins.path = pathModule;
        builtins.fs = {
            existsSync: function(filename) { return window.FS.analyzePath(normalizePath(filename)).exists; },
            readFileSync: function(filename, encoding) {
                return window.FS.readFile(normalizePath(filename), encoding ? { encoding: encoding } : undefined);
            }
        };
    }

    function requestSource(url) {
        var request = new XMLHttpRequest();
        request.open('GET', url, false);
        request.send(null);
        if (request.status >= 200 && request.status < 300) return request.responseText;
        throw new Error('Could not load ' + url + ' (HTTP ' + request.status + ')');
    }

    function resolveModule(request, parentUrl) {
        var resolved = new URL(request, parentUrl).href;
        var pathname = new URL(resolved).pathname;
        var candidates = /\.[^/]+$/.test(pathname)
            ? [resolved]
            : [resolved + '.js', resolved.replace(/\/$/, '') + '/index.js'];
        for (var index = 0; index < candidates.length; index++) {
            try {
                return {
                    url: candidates[index],
                    filename: virtualPathFor(candidates[index]),
                    source: requestSource(candidates[index])
                };
            } catch (error) {}
        }
        throw new Error('Cannot load module ' + request + ' from ' + parentUrl);
    }

    function browserRequire(request, parentUrl) {
        if (Object.prototype.hasOwnProperty.call(builtins, request)) return builtins[request];
        if (request.charAt(0) !== '.' && request.charAt(0) !== '/') {
            throw new Error('Unsupported browser module: ' + request);
        }
        var loaded = resolveModule(request, parentUrl);
        if (moduleCache[loaded.url]) return moduleCache[loaded.url].exports;
        var module = { exports: {} };
        moduleCache[loaded.url] = module;
        var localRequire = function(name) { return browserRequire(name, loaded.url); };
        try {
            var factory = new Function('require', 'module', 'exports', '__filename', '__dirname',
                loaded.source + '\n//# sourceURL=' + loaded.url);
            factory(localRequire, module, module.exports, loaded.filename, pathModule.dirname(loaded.filename));
        } catch (error) {
            delete moduleCache[loaded.url];
            throw error;
        }
        return module.exports;
    }

    function isTruthyParam(params, name) {
        if (!params.has(name)) return false;
        var value = String(params.get(name) || '1').toLowerCase();
        return value !== '0' && value !== 'false' && value !== 'no' && value !== 'off';
    }

    function addIntegerArg(argv, params, queryName, cliName) {
        if (!params.has(queryName)) return;
        var value = Number(params.get(queryName));
        if (Number.isFinite(value)) {
            argv.push(cliName + '=' + Math.floor(value));
        }
    }

    function argvFromQuery() {
        var params = new URLSearchParams(window.location.search);
        var argv = ['pdg', 'main.js'];
        var lang = params.get('lang') || params.get('language');
        if (lang) argv.push('--lang=' + lang);
        if (isTruthyParam(params, 'ai-autoplay') || isTruthyParam(params, 'autoplay-ai-skills')) argv.push('--ai-autoplay');
        if (isTruthyParam(params, 'show-event-windows')) argv.push('--show-event-windows');
        if (isTruthyParam(params, 'fast-autoplay')) argv.push('--fast-autoplay');
        addIntegerArg(argv, params, 'seed', '--seed');
        addIntegerArg(argv, params, 'autoplay-delay', '--autoplay-delay');
        addIntegerArg(argv, params, 'autoplay-max-turns', '--autoplay-max-turns');
        addIntegerArg(argv, params, 'autoplay-event-ms', '--autoplay-event-ms');
        return argv;
    }

    function preloadAssets() {
        if (!Array.isArray(window.GALACTICA_ASSETS)) {
            return Promise.reject(new Error('Galactica asset manifest is missing; run tools/build-web.sh first.'));
        }
        var assets = window.GALACTICA_ASSETS;
        setStatus('loadingAssets');
        return Promise.all(assets.map(function(asset) {
            var url = new URL(asset, appBaseUrl).href;
            var virtualPath = normalizePath('/' + asset);
            return fetch(url).then(function(response) {
                if (!response.ok) {
                    throw new Error('Could not load ' + url + ' (HTTP ' + response.status + ')');
                }
                return response.arrayBuffer();
            }).then(function(buffer) {
                window.FS.mkdirTree(pathModule.dirname(virtualPath));
                window.FS.writeFile(virtualPath, new Uint8Array(buffer));
            });
        }));
    }

    function start() {
        installBuiltins();
        window.process = window.process || {};
        window.process.argv = argvFromQuery();
        window.process.platform = 'browser';
        window.process.exit = function(code) {
            if (code) throw new Error('Galactica-4 exited with status ' + code);
        };
        browserRequire('./main.js', appBaseUrl.href);
        if (document.documentElement.getAttribute('data-status') === 'closed') return;
        document.documentElement.setAttribute('data-status', 'ready');
        if (statusNode) {
            statusNode.remove();
            statusNode = null;
        }
        canvas.focus({ preventScroll: true });
    }

    function waitForPdg(deadline) {
        if (failed) {
            return;
        }
        if (window.pdg && window.pdg.pdgReady && window.FS) {
            preloadAssets().then(function() {
                try { start(); } catch (error) { fail(error); }
            }, fail);
        } else if (Date.now() > deadline) {
            fail(new Error('PDG WebAssembly initialization timed out'));
        } else {
            setTimeout(function() { waitForPdg(deadline); }, 25);
        }
    }

    var script = document.createElement('script');
    script.src = 'libpdg.js';
    script.onerror = function() { fail(new Error('libpdg.js failed to load')); };
    document.head.appendChild(script);
    waitForPdg(Date.now() + 30000);
})();
