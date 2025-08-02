-- Initialize VisuoGen Database
-- This script sets up the initial database configuration

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create sessions table for express-session
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- Create index on expire column for session cleanup
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- Set up proper permissions
GRANT ALL PRIVILEGES ON DATABASE visuogen TO visuogen;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO visuogen;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO visuogen;

-- Default values can be inserted here if needed
-- INSERT INTO plans (name, price, credits, features) VALUES ...