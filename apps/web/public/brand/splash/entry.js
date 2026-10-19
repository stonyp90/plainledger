/* PlainLedger's owner-approved opening animation. No framework or remote services.
 * scene.html retains the approved renderer and outlined wordmark unchanged.
 * This adapter changes only playback speed and the hand-off to the website.
 */
(function () {
  'use strict';
  var VERSION = '2026-10-19-approved-tiles-v1';
  var DURATION_MS = 3000;
  var SCORE_SECONDS = 5;
  var LOAD_TIMEOUT_MS = 6000;
  var EXIT_MS = 320;
  var params = new URLSearchParams(location.search);
  var path = location.pathname.replace(/\/+$/, '') || '/';
  var html = document.documentElement;
  // Do not replay on in-app navigation, authentication callbacks or embedded previews.
  if (window.parent !== window || !['/', '/en', '/fr', '/quebec'].includes(path)) return;
  if (document.getElementById('pl-brand-entry') || params.get('splash') === 'off') return;
  var motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) { html.dataset.plSplash = 'reduced-motion'; return; }
  var root = document.getElementById('root');
  if (!root) return;
  var language = 'fr';
  try {
    var saved = localStorage.getItem('plainledger-language');
    var requested = params.get('lang');
    if (requested === 'en' || requested === 'fr') language = requested;
    else if (saved === 'en' || saved === 'fr') language = saved;
    else {
      var languages = navigator.languages || [navigator.language];
      for (var i = 0; i < languages.length; i++) {
        var candidate = languages[i].split('-')[0].toLowerCase();
        if (candidate === 'en' || candidate === 'fr') { language = candidate; break; }
      }
    }
  } catch (_) { /* Storage is optional. */ }
  var copy = language === 'fr'
    ? { title: 'Animation d’ouverture PlainLedger', skip: 'Passer l’animation', pause: 'Pause', resume: 'Reprendre' }
    : { title: 'PlainLedger opening animation', skip: 'Skip introduction', pause: 'Pause', resume: 'Resume' };
  var styles = document.createElement('style');
  styles.id = 'pl-brand-entry-style';
  styles.textContent = '#pl-brand-entry{--pl-entry-ground:#071420;--pl-entry-ink:#e5f5ef;--pl-entry-accent:#34d399;position:fixed;inset:0;z-index:2147483000;background:var(--pl-entry-ground);opacity:1;transition:opacity .32s cubic-bezier(.22,1,.36,1);isolation:isolate}#pl-brand-entry[data-leaving]{opacity:0;pointer-events:none}#pl-brand-entry iframe{border:0;display:block;width:100%;height:100%;pointer-events:none}#pl-brand-entry .pl-entry-controls{position:absolute;top:max(18px,env(safe-area-inset-top));right:max(18px,env(safe-area-inset-right));display:flex;gap:10px}#pl-brand-entry button{font:500 14px/1.3 system-ui,sans-serif;color:var(--pl-entry-ink);background:#091c2bee;border:1px solid #35594f;border-radius:8px;padding:12px 16px;min-height:44px;cursor:pointer}#pl-brand-entry button:focus-visible{outline:2px solid var(--pl-entry-accent);outline-offset:4px}#pl-brand-entry button:disabled{opacity:.5;cursor:default}@media(prefers-reduced-motion:reduce){#pl-brand-entry{transition:none}}';
  document.head.appendChild(styles);
  var overlay = document.createElement('section');
  overlay.id = 'pl-brand-entry';
  overlay.dataset.version = VERSION;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', copy.title);
  var frame = document.createElement('iframe');
  frame.title = copy.title;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  var controls = document.createElement('div');
  controls.className = 'pl-entry-controls';
  var pauseButton = document.createElement('button');
  pauseButton.type = 'button';
  pauseButton.textContent = copy.pause;
  pauseButton.disabled = true;
  var skipButton = document.createElement('button');
  skipButton.type = 'button';
  skipButton.textContent = copy.skip;
  controls.append(pauseButton, skipButton);
  overlay.append(frame, controls);
  var previousFocus = document.activeElement;
  var previousInert = root.inert;
  var previousOverflow = html.style.overflow;
  var closed = false, paused = false, ready = false, elapsed = 0, last = 0, raf = 0, scene = null;
  var loadTimeout;

  function finish(reason) {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(raf);
    clearTimeout(loadTimeout);
    document.removeEventListener('visibilitychange', visibility);
    motion.removeEventListener('change', preference);
    root.inert = previousInert;
    html.style.overflow = previousOverflow;
    html.dataset.plSplash = 'complete';
    html.dataset.plSplashReason = reason;
    overlay.setAttribute('data-leaving', '');
    if (overlay.contains(document.activeElement)) {
      if (previousFocus && previousFocus !== document.body && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
      else {
        var target = root.querySelector('main, h1') || root;
        var hadTabIndex = target.hasAttribute('tabindex');
        if (!hadTabIndex) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        if (!hadTabIndex) target.removeAttribute('tabindex');
      }
    }
    var delay = motion.matches || reason === 'load-timeout' || reason === 'error' ? 0 : EXIT_MS;
    setTimeout(function () { overlay.remove(); styles.remove(); }, delay);
    window.dispatchEvent(new CustomEvent('plainledger:splash-complete', { detail: { reason: reason, version: VERSION } }));
  }
  function tick(now) {
    if (closed || paused || document.hidden || !ready) { last = 0; return; }
    if (last) elapsed += now - last;
    last = now;
    try { scene.render(Math.min(SCORE_SECONDS, elapsed / DURATION_MS * SCORE_SECONDS)); }
    catch (_) { finish('error'); return; }
    if (elapsed >= DURATION_MS) { finish('ended'); return; }
    raf = requestAnimationFrame(tick);
  }
  function visibility() {
    cancelAnimationFrame(raf); last = 0;
    if (!closed && ready && !paused && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function preference(e) { if (e.matches) finish('reduced-motion'); }
  function togglePause() {
    if (!ready || closed) return;
    paused = !paused;
    pauseButton.textContent = paused ? copy.resume : copy.pause;
    pauseButton.setAttribute('aria-pressed', String(paused));
    html.dataset.plSplash = paused ? 'paused' : 'playing';
    cancelAnimationFrame(raf); last = 0;
    if (!paused) raf = requestAnimationFrame(tick);
  }
  pauseButton.onclick = togglePause;
  skipButton.onclick = function () { finish('skipped'); };
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); finish('skipped'); }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!pauseButton.disabled && document.activeElement === skipButton) pauseButton.focus();
      else skipButton.focus();
    }
  });
  frame.onload = function () {
    if (closed) return;
    try {
      var child = frame.contentWindow;
      if (!child.__ready || !child.PlainLedgerAnimation) { finish('error'); return; }
      child.__ready.then(function () {
        if (closed) return;
        scene = child.PlainLedgerAnimation;
        scene.pause(); scene.seek(0);
        ready = true;
        clearTimeout(loadTimeout);
        pauseButton.disabled = false;
        html.dataset.plSplash = 'playing';
        raf = requestAnimationFrame(tick);
      }).catch(function () { finish('error'); });
    } catch (_) { finish('error'); }
  };
  frame.onerror = function () { finish('error'); };
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', preference);
  // Established before insertion: a failed scene can never trap the underlying page.
  loadTimeout = setTimeout(function () { finish('load-timeout'); }, LOAD_TIMEOUT_MS);
  html.dataset.plSplash = 'loading';
  html.style.overflow = 'hidden';
  root.inert = true;
  frame.src = '/brand/splash/scene.html?capture=1&lang=' + language + '&v=' + VERSION;
  document.body.appendChild(overlay);
  skipButton.focus({ preventScroll: true });
})();
