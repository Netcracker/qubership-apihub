CREATE TABLE public.users (
  id bigint PRIMARY KEY,
  email text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE audit.log_entries (
  id bigint PRIMARY KEY,
  user_id bigint,
  action text NOT NULL,
  occurred_at timestamp DEFAULT now()
);
