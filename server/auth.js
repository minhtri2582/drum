const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const callbackURL = process.env.GOOGLE_CALLBACK_URL ||
  (process.env.FRONTEND_URL || 'http://localhost:3000') + '/api/auth/google/callback';

if (process.env.GOOGLE_CLIENT_ID) {
  console.log('[Auth] Callback URL:', callbackURL);
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos } = profile;
        const email = emails?.[0]?.value || '';
        const picture = photos?.[0]?.value || '';

        const client = await pool.connect();
        try {
          let user = await client.query(
            'SELECT * FROM users WHERE google_id = $1',
            [id]
          );
          if (user.rows.length === 0) {
            const insert = await client.query(
              `INSERT INTO users (google_id, email, name, picture) VALUES ($1, $2, $3, $4)
               RETURNING *`,
              [id, email, displayName || email, picture]
            );
            user = insert;
          } else {
            await client.query(
              'UPDATE users SET name = $1, picture = $2, updated_at = NOW() WHERE id = $3',
              [displayName || user.rows[0].name, picture, user.rows[0].id]
            );
          }
          return done(null, user.rows[0]);
        } finally {
          client.release();
        }
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

function jwtAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { passport, jwtAuth, requireAuth, createToken };
