-- Seed data for tardyDevs Chat
-- Run these SQL commands in your Supabase SQL editor

-- Insert default channels
INSERT INTO channels (name) VALUES ('general');
INSERT INTO channels (name) VALUES ('random');
INSERT INTO channels (name) VALUES ('help');

-- Create an index for faster message queries
CREATE INDEX IF NOT EXISTS messages_channel_id_idx ON messages(channel_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);