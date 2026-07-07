-- PostgreSQL initialization script
-- Runs once on first container start

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search trigrams

-- Create test database
CREATE DATABASE zonvo_test OWNER zonvo;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE zonvo_dev TO zonvo;
GRANT ALL PRIVILEGES ON DATABASE zonvo_test TO zonvo;
