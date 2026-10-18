-- Migration 30: Trigger soft migration for fixing data after package transitions
-- The actual work is performed asynchronously by SoftMigrateDb function
-- This migration ensures the soft migration runs once when upgrading from version 29 to 30
-- No schema changes required, but PostgreSQL requires at least one statement
DO $$ BEGIN END $$;
