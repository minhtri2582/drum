const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  picture VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bpm INTEGER DEFAULT 90,
  time_signature VARCHAR(10) DEFAULT '4/4',
  instruments JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_is_public ON presets(is_public);

CREATE TABLE IF NOT EXISTS preset_shares (
  preset_id INTEGER NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (preset_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_preset_shares_shared_with ON preset_shares(shared_with_user_id);

CREATE TABLE IF NOT EXISTS preset_favourites (
  preset_id INTEGER NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (preset_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_preset_favourites_user ON preset_favourites(user_id);
`;

async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(schema);
  } finally {
    client.release();
  }
}

module.exports = { pool, initSchema };
