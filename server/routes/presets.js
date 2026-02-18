const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../auth');

// GET /api/presets/mine - List only current user's presets
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, bpm, time_signature, instruments, is_public, created_at, updated_at
       FROM presets WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      bpm: r.bpm,
      timeSignature: r.time_signature,
      instruments: r.instruments,
      isPublic: r.is_public,
      isOwner: true,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/presets - List presets (public for all; + private for logged-in)
router.get('/', async (req, res) => {
  try {
    let query, params;
    if (req.user) {
      query = `SELECT id, name, bpm, time_signature, instruments, is_public, user_id, created_at
               FROM presets
               WHERE is_public = true OR user_id = $1
               ORDER BY is_public DESC, created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT id, name, bpm, time_signature, instruments, is_public, created_at
               FROM presets
               WHERE is_public = true
               ORDER BY created_at DESC`;
      params = [];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      bpm: r.bpm,
      timeSignature: r.time_signature,
      instruments: r.instruments,
      isPublic: r.is_public,
      isOwner: req.user && r.user_id === req.user.id,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/presets - Create preset (login required)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, bpm, timeSignature, instruments, isPublic } = req.body;
    if (!name || !instruments) {
      return res.status(400).json({ error: 'name and instruments required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO presets (user_id, name, bpm, time_signature, instruments, is_public)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, bpm, time_signature, instruments, is_public, created_at`,
      [
        req.user.id,
        name,
        bpm || 90,
        timeSignature || '4/4',
        JSON.stringify(instruments || {}),
        isPublic === true,
      ]
    );
    res.status(201).json({
      id: rows[0].id,
      name: rows[0].name,
      bpm: rows[0].bpm,
      timeSignature: rows[0].time_signature,
      instruments: rows[0].instruments,
      isPublic: rows[0].is_public,
      isOwner: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/presets/:id - Update preset (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, bpm, timeSignature, instruments, isPublic } = req.body;
    const { rows } = await pool.query(
      `UPDATE presets SET
        name = COALESCE($1, name),
        bpm = COALESCE($2, bpm),
        time_signature = COALESCE($3, time_signature),
        instruments = COALESCE($4, instruments),
        is_public = COALESCE($5, is_public),
        updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id, name, bpm, time_signature, instruments, is_public`,
      [
        name,
        bpm,
        timeSignature,
        instruments ? JSON.stringify(instruments) : null,
        isPublic !== undefined ? isPublic : null,
        req.params.id,
        req.user.id,
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/presets/:id - Delete preset (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM presets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
