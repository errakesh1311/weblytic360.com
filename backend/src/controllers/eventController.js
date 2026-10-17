const crypto = require('crypto');
const Event = require('../models/Event');
const Site = require('../models/Site');
const { resolveRange } = require('../services/aggregation');
const { classifyCrawler, classifyReferrer } = require('../services/aiTraffic');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const SALT = crypto.randomBytes(16).toString('hex'); // rotates on restart

/** Privacy-friendly visitor id: no cookies, no raw IP stored. */
function visitorHash(siteId, ip, userAgent) {
  const day = new Date().toISOString().slice(0, 10);
  return crypto
    .createHash('sha256')
    .update(`${SALT}:${day}:${siteId}:${ip}:${userAgent}`)
    .digest('hex')
    .slice(0, 32);
}

function parseUserAgent(ua = '') {
  const s = ua.toLowerCase();

  let browser = 'Other';
  if (s.includes('edg/')) browser = 'Edge';
  else if (s.includes('opr/') || s.includes('opera')) browser = 'Opera';
  else if (s.includes('chrome')) browser = 'Chrome';
  else if (s.includes('firefox')) browser = 'Firefox';
  else if (s.includes('safari')) browser = 'Safari';

  let os = 'Other';
  if (s.includes('windows')) os = 'Windows';
  else if (s.includes('android')) os = 'Android';
  else if (s.includes('iphone') || s.includes('ipad')) os = 'iOS';
  else if (s.includes('mac os')) os = 'macOS';
  else if (s.includes('linux')) os = 'Linux';

  let device = 'desktop';
  if (s.includes('ipad') || s.includes('tablet')) device = 'tablet';
  else if (s.includes('mobi') || s.includes('android') || s.includes('iphone')) device = 'mobile';

  return { browser, os, device };
}

const BOT_RE = /(bot|crawler|spider|crawling|headless|lighthouse|preview|monitor)/i;

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Public ingest endpoint (called by tracker.js)                       */
/* ------------------------------------------------------------------ */

exports.collect = async (req, res, next) => {
  try {
    const ua = req.headers['user-agent'] || '';

    // AI crawlers look like bots, but they are exactly the traffic we want to
    // record, so they are classified before the generic bot filter runs.
    const aiCrawler = classifyCrawler(ua);
    if (!aiCrawler && BOT_RE.test(ua)) {
      return res.status(202).json({ ok: true, ignored: 'bot' });
    }

    const {
      siteId,
      type = 'pageview',
      name,
      url,
      referrer,
      screen,
      duration,
      sessionId,
      props,
    } = req.body || {};

    if (!siteId) return res.status(400).json({ message: 'siteId is required' });
    const site = Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Unknown siteId' });

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '';
    const visitorId = visitorHash(siteId, ip, ua);

    const pageUrl = safeUrl(url);
    const refUrl = safeUrl(referrer);
    const refHost = refUrl && refUrl.hostname !== pageUrl?.hostname ? refUrl.hostname : null;
    const params = pageUrl?.searchParams;
    const { browser, os, device } = parseUserAgent(ua);
    const ai = aiCrawler || classifyReferrer(refHost, referrer);

    const event = Event.create({
      site_id: siteId,
      session_id: sessionId || visitorId,
      visitor_id: visitorId,
      type,
      name: name || null,
      url: pageUrl ? pageUrl.pathname : url || '/',
      referrer: referrer || null,
      referrer_host: refHost,
      utm_source: params?.get('utm_source') || null,
      utm_medium: params?.get('utm_medium') || null,
      utm_campaign: params?.get('utm_campaign') || null,
      utm_term: params?.get('utm_term') || null,
      utm_content: params?.get('utm_content') || null,
      browser,
      os,
      device,
      country: req.headers['cf-ipcountry'] || null,
      screen: screen || null,
      duration: Number(duration) || 0,
      props: props ? JSON.stringify(props) : null,
      ai_source: ai?.source || null,
      ai_vendor: ai?.vendor || null,
      ai_kind: ai?.kind || null,
    });

    res.status(201).json({ ok: true, id: event.id, ai: ai?.source || null });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------------------------------ */
/* Authenticated dashboard endpoints                                   */
/* ------------------------------------------------------------------ */

exports.getEvents = async (req, res, next) => {
  try {
    const site = Site.ownedBy(req.params.siteId, req.user.id);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const range = resolveRange(req.query);
    res.json(
      Event.findBySite(site.id, {
        ...range,
        limit: Math.min(Number(req.query.limit) || 100, 500),
      })
    );
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const site = Site.ownedBy(req.params.siteId, req.user.id);
    if (!site) return res.status(404).json({ message: 'Site not found' });
    Event.remove(req.params.eventId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};