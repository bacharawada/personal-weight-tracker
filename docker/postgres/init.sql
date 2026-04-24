-- Init script run once when the Postgres container is first created.
-- Creates the keycloak database alongside the app database.
-- The app database (weight_tracker) is already created by the
-- POSTGRES_DB environment variable; we only need to add keycloak.

SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec

GRANT ALL PRIVILEGES ON DATABASE keycloak TO :POSTGRES_USER;
