(function () {
  var script = document.currentScript;
  var siteId = script.getAttribute('data-site-id');
  var api = script.getAttribute('data-api');

  if (!siteId || !api) {
    console.error('[Weblytic360] data-site-id ya data-api missing hai');
    return;
  }

  function send(name, extra) {
    var q = new URLSearchParams(location.search);
    var payload = {
      siteId: siteId,
      site_id: siteId,
      event: name || 'pageview',
      type: name || 'pageview',
      url: location.href,
      path: location.pathname,
      referrer: document.referrer,
      screen: screen.width + 'x' + screen.height,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utm_source: q.get('utm_source'),
      utm_medium: q.get('utm_medium'),
      utm_campaign: q.get('utm_campaign'),
      utm_term: q.get('utm_term'),
      utm_content: q.get('utm_content')
    };
    for (var k in (extra || {})) payload[k] = extra[k];

    fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function (e) { console.error('[Weblytic360]', e); });
  }

  // pehla pageview
  send('pageview');

  // SPA support (React/Next)
  var push = history.pushState;
  history.pushState = function () {
    push.apply(this, arguments);
    send('pageview');
  };
  window.addEventListener('popstate', function () { send('pageview'); });

  window.weblytic = { track: send };
})();
