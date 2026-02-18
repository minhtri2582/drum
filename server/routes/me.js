const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, google_id, email, name, picture, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const u = rows[0];
    res.json({
      id: u.id,
      email: u.email,
      name: u.name,
      picture: u.picture,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
