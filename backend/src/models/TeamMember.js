const crypto = require('crypto');
const { db } = require('../db');

const ROLES = ['admin', 'editor', 'viewer'];

const TeamMember = {
  ROLES,

  list(ownerId) {
    return db
      .prepare(`SELECT * FROM team_members WHERE owner_id = ? ORDER BY created_at ASC`)
      .all(ownerId);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM team_members WHERE id = ?`).get(id);
  },

  findByEmail(ownerId, email) {
    return db
      .prepare(`SELECT * FROM team_members WHERE owner_id = ? AND email = ?`)
      .get(ownerId, String(email).toLowerCase());
  },

  invite({ ownerId, email, name = null, role = 'viewer' }) {
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO team_members (id, owner_id, email, name, role, status)
       VALUES (?, ?, ?, ?, ?, 'invited')`
    ).run(id, ownerId, String(email).toLowerCase(), name, role);
    return TeamMember.findById(id);
  },

  updateRole(id, role) {
    db.prepare(`UPDATE team_members SET role = ? WHERE id = ?`).run(role, id);
    return TeamMember.findById(id);
  },

  remove(id) {
    db.prepare(`DELETE FROM team_members WHERE id = ?`).run(id);
  },
};

module.exports = TeamMember;
