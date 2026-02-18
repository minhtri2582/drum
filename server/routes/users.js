const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../auth');

// GET /api/users/search?q=xxx - Search users by email or name (for Share modal)
router.get('/search', requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.json([]);
    }
    const escaped = q.replace(/[\\%_]/g, '\\$&');
    const pattern = '%' + escaped + '%';
    const { rows } = await pool.query(
      `SELECT id, email, name FROM users
       WHERE id != $1
         AND (LOWER(email) LIKE LOWER($2) OR LOWER(name) LIKE LOWER($2))
       ORDER BY name NULLS LAST, email
       LIMIT 20`,
      [req.user.id, pattern]
    );
    res.json(rows.map(r => ({
      id: r.id,
      email: r.email,
      name: r.name || r.email,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
