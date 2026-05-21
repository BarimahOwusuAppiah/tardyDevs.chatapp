-- ============================================================
-- tardyDevs Chat — Full Database Migration
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- ── 1. PROFILES TABLE ────────────────────────────────────────
-- Stores public user info, auto-created on signup via trigger
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  bio         TEXT,
  is_online   BOOLEAN DEFAULT FALSE,
  last_seen   TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast username search
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS profiles_username_lower_idx ON profiles(lower(username));

-- ── 2. AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. CHANNELS TABLE (ensure it exists) ─────────────────────
CREATE TABLE IF NOT EXISTS channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS channels_name_idx ON channels(name);

-- ── 4. MESSAGES TABLE (channel messages) ─────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_channel_id_idx ON messages(channel_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx  ON messages(created_at);
CREATE INDEX IF NOT EXISTS messages_user_id_idx     ON messages(user_id);

-- ── 5. DIRECT CONVERSATIONS TABLE ────────────────────────────
-- Each row = one DM thread between exactly two users
-- participant_a_id is always the smaller UUID (enforced by constraint)
CREATE TABLE IF NOT EXISTS direct_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_a_id, participant_b_id),
  CHECK (participant_a_id < participant_b_id)
);

CREATE INDEX IF NOT EXISTS dc_participant_a_idx ON direct_conversations(participant_a_id);
CREATE INDEX IF NOT EXISTS dc_participant_b_idx ON direct_conversations(participant_b_id);
CREATE INDEX IF NOT EXISTS dc_last_message_idx  ON direct_conversations(last_message_at DESC);

-- ── 6. DIRECT MESSAGES TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  reply_to_id     UUID REFERENCES direct_messages(id) ON DELETE SET NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dm_conversation_id_idx ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS dm_created_at_idx       ON direct_messages(created_at);
CREATE INDEX IF NOT EXISTS dm_sender_id_idx        ON direct_messages(sender_id);

-- ── 7. AUTO-UPDATE last_message_at ON NEW DM ─────────────────
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE direct_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_direct_message_insert ON direct_messages;
CREATE TRIGGER on_direct_message_insert
  AFTER INSERT ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ── 8. ROW LEVEL SECURITY ─────────────────────────────────────

-- Profiles: anyone authenticated can read, only owner can update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Channels: authenticated users can read and insert
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channels_select" ON channels;
CREATE POLICY "channels_select" ON channels
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "channels_insert" ON channels;
CREATE POLICY "channels_insert" ON channels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Messages: authenticated users can read all, insert own, delete own
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- Direct conversations: only participants can see their conversations
ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dc_select" ON direct_conversations;
CREATE POLICY "dc_select" ON direct_conversations
  FOR SELECT USING (
    auth.uid() = participant_a_id OR auth.uid() = participant_b_id
  );

DROP POLICY IF EXISTS "dc_insert" ON direct_conversations;
CREATE POLICY "dc_insert" ON direct_conversations
  FOR INSERT WITH CHECK (
    auth.uid() = participant_a_id OR auth.uid() = participant_b_id
  );

-- Direct messages: only conversation participants can read/write
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_select" ON direct_messages;
CREATE POLICY "dm_select" ON direct_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM direct_conversations dc
      WHERE dc.id = conversation_id
        AND (dc.participant_a_id = auth.uid() OR dc.participant_b_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "dm_insert" ON direct_messages;
CREATE POLICY "dm_insert" ON direct_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM direct_conversations dc
      WHERE dc.id = conversation_id
        AND (dc.participant_a_id = auth.uid() OR dc.participant_b_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "dm_delete" ON direct_messages;
CREATE POLICY "dm_delete" ON direct_messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ── 9. REALTIME SUBSCRIPTIONS ────────────────────────────────
-- Enable realtime for these tables in Supabase dashboard too
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ── 10. SEED DEFAULT CHANNELS ────────────────────────────────
INSERT INTO channels (name, description) VALUES
  ('general',       'Company updates and general discussion'),
  ('random',        'Off-topic conversations and fun'),
  ('announcements', 'Important announcements for the team'),
  ('dev-updates',   'Development progress and updates'),
  ('designs',       'Design reviews and feedback'),
  ('feedback',      'Product feedback and suggestions')
ON CONFLICT (name) DO NOTHING;

-- ── 11. BACKFILL PROFILES FOR EXISTING USERS ─────────────────
INSERT INTO profiles (id, username)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
