-- Migration 22: Trigger soft migration for fixing release_versions_published metric
-- The actual work is performed asynchronously by SoftMigrateDb function
-- This migration ensures the soft migration runs once when upgrading from version 21 to 22
-- No schema changes required, but PostgreSQL requires at least one statement
DO $$ BEGIN END $$;
