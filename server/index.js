require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { passport, jwtAuth } = require('./auth');
const { initSchema } = require('./db');
const authRoutes = require('./routes/auth');
const presetRoutes = require('./routes/presets');
const meRoutes = require('./routes/me');
const usersRoutes = require('./routes/users');

const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');

app.disable('x-powered-by');

app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(cookieParser());
app.use(express.json());

app.use(passport.initialize());

app.use(jwtAuth);

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }), authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/presets', presetRoutes);
app.use('/api/users', usersRoutes);

app.use(express.static(path.join(__dirname, '..')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/audio/sets', (req, res) => {
  try {
    const audioPath = path.join(ROOT, 'audio');
    if (!fs.existsSync(audioPath)) return res.json([]);
    const entries = fs.readdirSync(audioPath, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).map(e => e.name);
    res.json(folders.sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

initSchema()
  .then(() => app.listen(PORT, () => {
    console.log(`Drum server running on port ${PORT}`);
  }))
  .catch((err) => {
    console.error('Database init failed:', err.message);
    process.exit(1);
  });
