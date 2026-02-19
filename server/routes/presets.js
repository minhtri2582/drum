const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../auth');

// GET /api/presets/mine - List current user's presets + shared with user
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.bpm, p.time_signature, p.instruments, p.is_public, p.sound_set, p.volumes,
              p.created_at, p.updated_at, p.user_id,
              u.email AS owner_email, u.name AS owner_name,
              EXISTS(SELECT 1 FROM preset_favourites pf WHERE pf.preset_id = p.id AND pf.user_id = $1) AS is_favourite,
              (SELECT COUNT(*)::int FROM preset_likes pl WHERE pl.preset_id = p.id) AS like_count,
              EXISTS(SELECT 1 FROM preset_likes pl WHERE pl.preset_id = p.id AND pl.user_id = $1) AS is_liked
       FROM (
         SELECT * FROM presets WHERE user_id = $1
         UNION
         SELECT p2.* FROM presets p2
         JOIN preset_shares ps ON ps.preset_id = p2.id
         WHERE ps.shared_with_user_id = $1
         UNION
         SELECT * FROM presets WHERE is_public = true AND user_id != $1
       ) p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      bpm: r.bpm,
      timeSignature: r.time_signature,
      instruments: r.instruments,
      isPublic: r.is_public,
      soundSet: r.sound_set,
      volumes: r.volumes || {},
      isOwner: r.user_id === req.user.id,
      isFavourite: !!r.is_favourite,
      likeCount: r.like_count || 0,
      isLiked: !!r.is_liked,
      ownerEmail: r.owner_email,
      ownerName: r.owner_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/presets/:id/like - Toggle like (1 like per user per preset)
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const presetId = parseInt(req.params.id, 10);
    if (isNaN(presetId)) return res.status(400).json({ error: 'Invalid preset ID' });
    const { rows: access } = await pool.query(
      `SELECT 1 FROM (
        SELECT id FROM presets WHERE id = $1 AND user_id = $2
        UNION
        SELECT p.id FROM presets p
        JOIN preset_shares ps ON ps.preset_id = p.id
        WHERE p.id = $1 AND ps.shared_with_user_id = $2
        UNION
        SELECT id FROM presets WHERE id = $1 AND is_public = true AND user_id != $2
      ) x`,
      [presetId, req.user.id]
    );
    if (access.length === 0) return res.status(404).json({ error: 'Not found' });
    const { rows: existing } = await pool.query(
      'SELECT 1 FROM preset_likes WHERE preset_id = $1 AND user_id = $2',
      [presetId, req.user.id]
    );
    if (existing.length > 0) {
      await pool.query('DELETE FROM preset_likes WHERE preset_id = $1 AND user_id = $2', [presetId, req.user.id]);
      const { rows: countRow } = await pool.query(
        'SELECT COUNT(*)::int AS c FROM preset_likes WHERE preset_id = $1',
        [presetId]
      );
      return res.json({ isLiked: false, likeCount: countRow[0].c });
    }
    await pool.query('INSERT INTO preset_likes (preset_id, user_id) VALUES ($1, $2)', [presetId, req.user.id]);
    const { rows: countRow } = await pool.query(
      'SELECT COUNT(*)::int AS c FROM preset_likes WHERE preset_id = $1',
      [presetId]
    );
    res.json({ isLiked: true, likeCount: countRow[0].c });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/presets/:id/favourite - Toggle favourite (user must have access: own or shared)
router.post('/:id/favourite', requireAuth, async (req, res) => {
  try {
    const presetId = parseInt(req.params.id, 10);
    if (isNaN(presetId)) return res.status(400).json({ error: 'Invalid preset ID' });
    const { rows: access } = await pool.query(
      `SELECT 1 FROM (
        SELECT id FROM presets WHERE id = $1 AND user_id = $2
        UNION
        SELECT p.id FROM presets p
        JOIN preset_shares ps ON ps.preset_id = p.id
        WHERE p.id = $1 AND ps.shared_with_user_id = $2
        UNION
        SELECT id FROM presets WHERE id = $1 AND is_public = true AND user_id != $2
      ) x`,
      [presetId, req.user.id]
    );
    if (access.length === 0) return res.status(404).json({ error: 'Not found' });
    const { rows: existing } = await pool.query(
      'SELECT 1 FROM preset_favourites WHERE preset_id = $1 AND user_id = $2',
      [presetId, req.user.id]
    );
    if (existing.length > 0) {
      await pool.query('DELETE FROM preset_favourites WHERE preset_id = $1 AND user_id = $2', [presetId, req.user.id]);
      return res.json({ isFavourite: false });
    }
    await pool.query('INSERT INTO preset_favourites (preset_id, user_id) VALUES ($1, $2)', [presetId, req.user.id]);
    res.json({ isFavourite: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/presets/share - Share presets with a user (owner only)
router.post('/share', requireAuth, async (req, res) => {
  try {
    const { presetIds, shareWithUserId } = req.body;
    if (!Array.isArray(presetIds) || presetIds.length === 0 || !shareWithUserId) {
      return res.status(400).json({ error: 'presetIds and shareWithUserId required' });
    }
    if (shareWithUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot share with yourself' });
    }
    const ids = presetIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Invalid preset IDs' });
    }
    const { rows: inserted } = await pool.query(
      `INSERT INTO preset_shares (preset_id, shared_with_user_id)
       SELECT id, $1 FROM presets WHERE id = ANY($2::int[]) AND user_id = $3
       ON CONFLICT (preset_id, shared_with_user_id) DO NOTHING
       RETURNING preset_id`,
      [shareWithUserId, ids, req.user.id]
    );
    res.json({ ok: true, sharedCount: inserted.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/presets - List presets (public for all; + private for logged-in)
router.get('/', async (req, res) => {
  try {
    let query, params;
    if (req.user) {
      query = `SELECT id, name, bpm, time_signature, instruments, is_public, sound_set, volumes, user_id, created_at
               FROM presets
               WHERE is_public = true OR user_id = $1
               ORDER BY is_public DESC, created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT id, name, bpm, time_signature, instruments, is_public, sound_set, volumes, created_at
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
      soundSet: r.sound_set,
      volumes: r.volumes || {},
      isOwner: req.user && r.user_id === req.user.id,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/presets - Create preset (login required)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, bpm, timeSignature, instruments, isPublic, soundSet, volumes } = req.body;
    if (!name || !instruments) {
      return res.status(400).json({ error: 'name and instruments required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO presets (user_id, name, bpm, time_signature, instruments, is_public, sound_set, volumes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, bpm, time_signature, instruments, is_public, sound_set, volumes, created_at`,
      [
        req.user.id,
        name,
        bpm || 90,
        timeSignature || '4/4',
        JSON.stringify(instruments || {}),
        isPublic === true,
        soundSet || 'standard',
        JSON.stringify(volumes && typeof volumes === 'object' ? volumes : {}),
      ]
    );
    res.status(201).json({
      id: rows[0].id,
      name: rows[0].name,
      bpm: rows[0].bpm,
      timeSignature: rows[0].time_signature,
      instruments: rows[0].instruments,
      isPublic: rows[0].is_public,
      soundSet: rows[0].sound_set,
      volumes: rows[0].volumes || {},
      isOwner: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/presets/:id - Update preset (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, bpm, timeSignature, instruments, isPublic, soundSet, volumes } = req.body;
    const { rows } = await pool.query(
      `UPDATE presets SET
        name = COALESCE($1, name),
        bpm = COALESCE($2, bpm),
        time_signature = COALESCE($3, time_signature),
        instruments = COALESCE($4, instruments),
        is_public = COALESCE($5, is_public),
        sound_set = COALESCE($6, sound_set),
        volumes = COALESCE($7, volumes),
        updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING id, name, bpm, time_signature, instruments, is_public, sound_set, volumes`,
      [
        name,
        bpm,
        timeSignature,
        instruments ? JSON.stringify(instruments) : null,
        isPublic !== undefined ? isPublic : null,
        soundSet !== undefined ? soundSet : null,
        volumes && typeof volumes === 'object' ? JSON.stringify(volumes) : null,
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
