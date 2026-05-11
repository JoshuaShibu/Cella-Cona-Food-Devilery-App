-- Runs automatically on first container start
-- because it lives in /docker-entrypoint-initdb.d/
 
-- Enable the pgvector extension for AI embedding storage
CREATE EXTENSION IF NOT EXISTS vector;
 
-- Enable uuid generation (used as primary keys throughout the schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
 
-- Enable pg_trgm for fast fuzzy text search on dish names / ingredients
CREATE EXTENSION IF NOT EXISTS pg_trgm;