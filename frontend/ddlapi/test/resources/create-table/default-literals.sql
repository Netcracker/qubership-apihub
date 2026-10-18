CREATE TABLE default_literals (
  zero_int integer DEFAULT 0,
  pos_int integer DEFAULT 5,
  flag_false boolean DEFAULT false,
  flag_true boolean DEFAULT true,
  zero_num numeric(10, 2) DEFAULT 0.0,
  label text DEFAULT 'active'
);
