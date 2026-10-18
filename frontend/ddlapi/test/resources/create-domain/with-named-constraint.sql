CREATE DOMAIN zip_code AS text
  CONSTRAINT valid_zip CHECK (VALUE ~ '^\d{5}(-\d{4})?$');
