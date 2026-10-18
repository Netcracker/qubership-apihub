CREATE TABLE nullability_demo (
  id bigint NOT NULL,
  code text NULL,
  status text DEFAULT 'active',
  price numeric(10, 2) DEFAULT 0.0,
  created_at timestamp DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);
