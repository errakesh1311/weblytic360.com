const Site = require('../models/Site');
const Notification = require('../models/Notification');
const config = require('../config');

const normalizeDomain = (d) =>
  String(d || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .toLowerCase();

exports.createSite = async (req, res, next) => {
  try {
    const { name, domain, timezone } = req.body;
    if (!name || !domain) {
      return res.status(400).json({ message: 'Name and domain are required' });
    }

    const limit = config.PLANS[req.user.plan]?.siteLimit ?? 1;
    if (Site.countByUser(req.user.id) >= limit) {
      return res.status(402).json({
        message: `Your ${req.user.plan} plan allows ${limit} site(s). Upgrade to add more.`,
      });
    }

    const site = Site.create({
      userId: req.user.id,
      name,
      domain: normalizeDomain(domain),
      timezone,
    });

    Notification.create({
      userId: req.user.id,
      type: 'info',
      title: `${site.name} is ready`,
      body: 'Install the tracking snippet from Settings to start receiving data.',
      link: `/site/${site.id}/settings`,
    });

    res.status(201).json(site);
  } catch (error) {
    next(error);
  }
};

exports.getSites = async (req, res, next) => {
  try {
    res.json(Site.findByUser(req.user.id));
  } catch (error) {
    next(error);
  }
};

exports.getSiteById = async (req, res, next) => {
  try {
    const site = Site.ownedBy(req.params.siteId, req.user.id);
    if (!site) return res.status(404).json({ message: 'Site not found' });
    res.json(site);
  } catch (error) {
    next(error);
  }
};

exports.updateSite = async (req, res, next) => {
  try {
    const site = Site.ownedBy(req.params.siteId, req.user.id);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const { name, domain, timezone } = req.body;
    res.json(
      Site.update(site.id, {
        name,
        domain: domain ? normalizeDomain(domain) : undefined,
        timezone,
      })
    );
  } catch (error) {
    next(error);
  }
};

exports.deleteSite = async (req, res, next) => {
  try {
    const site = Site.ownedBy(req.params.siteId, req.user.id);
    if (!site) return res.status(404).json({ message: 'Site not found' });
    Site.remove(site.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};