/**
 * Weblytic360 tracking script.
 *
 * <script defer src="https://app.weblytic360.com/tracker.js"
 *         data-site-id="YOUR_SITE_ID"
 *         data-api="https://api.weblytic360.com"></script>
 *
 * Custom events:  weblytic360('signup', { plan: 'pro' })
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var siteId = script.getAttribute('data-site-id');
  if (!siteId) return console.warn('[weblytic360] missing data-site-id');

  var api = (script.getAttribute('data-api') || 'http://localhost:5000').replace(/\/$/, '');
  var endpoint = api + '/api/events/collect';
  var trackLocal = script.getAttribute('data-track-localhost') === 'true';

  if (!trackLocal && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    return console.info('[weblytic360] localhost ignored');
  }

  // Session id survives tab reloads for 30 minutes.
  var SESSION_KEY = 'w360_sid';
  function sessionId() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      var now = Date.now();
      if (raw) {
        var parsed = JSON.parse(raw);
        if (now - parsed.t < 30 * 60 * 1000) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, t: now }));
          return parsed.id;
        }
      }
      var id =
        (crypto.randomUUID && crypto.randomUUID()) ||
        String(now) + Math.random().toString(36).slice(2);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: id, t: now }));
      return id;
    } catch (e) {
      return null;
    }
  }

  var enteredAt = Date.now();
  var lastPath = null;

  function send(payload) {
    var body = JSON.stringify(
      Object.assign(
        {
          siteId: siteId,
          url: location.href,
          referrer: document.referrer || null,
          screen: screen.width + 'x' + screen.height,
          sessionId: sessionId(),
        },
        payload
      )
    );

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
        return;
      }
    } catch (e) {
      /* fall through to fetch */
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      keepalive: true,
    }).catch(function () {});
  }

  function trackPageview() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    enteredAt = Date.now();
    send({ type: 'pageview' });
  }

  function trackEvent(name, props) {
    send({ type: 'custom', name: name, props: props || null });
  }

  // Flush time-on-page when leaving.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      send({
        type: 'pageview',
        duration: Math.round((Date.now() - enteredAt) / 1000),
        name: '__duration',
      });
    }
  });

  // SPA route changes (history API + back/forward).
  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      original.apply(this, arguments);
      setTimeout(trackPageview, 0);
    };
  });
  window.addEventListener('popstate', trackPageview);

  // Public API, replaying anything queued before load.
  var queue = window.weblytic360 && window.weblytic360.q;
  window.weblytic360 = trackEvent;
  if (queue) queue.forEach(function (args) { trackEvent.apply(null, args); });

  trackPageview();
})();