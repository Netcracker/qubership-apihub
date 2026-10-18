CREATE INDEX IF NOT EXISTS idx_build_migration_id_build_type
ON public.build
(
  (metadata->>'migration_id'),
  (metadata->>'build_type')
);
