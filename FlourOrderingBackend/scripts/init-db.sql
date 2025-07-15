-- Flour Ordering Database Initialization Script
-- Run this as PostgreSQL superuser

-- Create database
CREATE DATABASE flour_ordering_db;

-- Create user
CREATE USER flour_ordering_user WITH PASSWORD 'flour_ordering_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE flour_ordering_db TO flour_ordering_user;

-- Connect to the database
\c flour_ordering_db;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO flour_ordering_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO flour_ordering_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO flour_ordering_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO flour_ordering_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO flour_ordering_user;