-- Move the 'vector' extension out of the public schema to satisfy security linter
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
