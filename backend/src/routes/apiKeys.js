const express = require('express');
const ApiKey = require('../models/ApiKey');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const publicKey = (k) => ({
  id: k.id,
  name: k.name,
  prefix: k.prefix,
  scope: k.scope,
  lastUsedAt: k.last_used_at,
  revokedAt: k.revoked_at,
  createdAt: k.created_at,
});

/** List the current user's API keys (never exposes the secret). */
router.get('/', (req, res, next) => {
  try {
    res.json({
      keys: ApiKey.list(req.user.id).map(publicKey),
      scopes: ApiKey.SCOPES,
    });
  } catch (error) {
    next(error);
  }
});

/** Create a new key. The raw secret is returned exactly once. */
router.post('/', (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const scope = req.body.scope || 'read';

    if (!name) {
      return res.status(400).json({ message: 'Please give the key a name' });
    }
    if (!ApiKey.SCOPES.includes(scope)) {
      return res
        .status(400)
        .json({ message: `Scope must be one of: ${ApiKey.SCOPES.join(', ')}` });
    }

    const { record, raw } = ApiKey.create({ userId: req.user.id, name, scope });

    res.status(201).json({ key: publicKey(record), secret: raw });
  } catch (error) {
    next(error);
  }
});

/** Revoke (disable) a key without deleting its history. */
router.post('/:id/revoke', (req, res, next) => {
  try {
    const key = ApiKey.findById(req.params.id);
    if (!key || key.user_id !== req.user.id) {
      return res.status(404).json({ message: 'API key not found' });
    }
    res.json({ key: publicKey(ApiKey.revoke(key.id)) });
  } catch (error) {
    next(error);
  }
});

/** Permanently delete a key. */
router.delete('/:id', (req, res, next) => {
  try {
    const key = ApiKey.findById(req.params.id);
    if (!key || key.user_id !== req.user.id) {
      return res.status(404).json({ message: 'API key not found' });
    }
    ApiKey.remove(key.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
