const express = require('express');
const TeamMember = require('../models/TeamMember');
const { protect } = require('../middleware/auth');
const { isEmail, cleanName } = require('../utils/validate');

const router = express.Router();

router.use(protect);

const publicMember = (m) => ({
  id: m.id,
  email: m.email,
  name: m.name,
  role: m.role,
  status: m.status,
  createdAt: m.created_at,
});

router.get('/', (req, res, next) => {
  try {
    res.json({
      members: TeamMember.list(req.user.id).map(publicMember),
      roles: TeamMember.ROLES,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { email, name, role = 'viewer' } = req.body;
    if (!isEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (!TeamMember.ROLES.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${TeamMember.ROLES.join(', ')}` });
    }
    if (String(email).toLowerCase() === req.user.email) {
      return res.status(400).json({ message: 'You are already the workspace owner' });
    }
    if (TeamMember.findByEmail(req.user.id, email)) {
      return res.status(409).json({ message: 'That person is already on your team' });
    }
    const member = TeamMember.invite({
      ownerId: req.user.id,
      email,
      name: cleanName(name) || null,
      role,
    });
    res.status(201).json({ member: publicMember(member) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', (req, res, next) => {
  try {
    const { role } = req.body;
    const member = TeamMember.findById(req.params.id);
    if (!member || member.owner_id !== req.user.id) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    if (!TeamMember.ROLES.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${TeamMember.ROLES.join(', ')}` });
    }
    res.json({ member: publicMember(TeamMember.updateRole(member.id, role)) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const member = TeamMember.findById(req.params.id);
    if (!member || member.owner_id !== req.user.id) {
      return res.status(404).json({ message: 'Team member not found' });
    }
    TeamMember.remove(member.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
