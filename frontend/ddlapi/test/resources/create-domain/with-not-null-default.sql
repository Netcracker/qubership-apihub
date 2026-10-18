CREATE DOMAIN us_zip AS text
  NOT NULL
  DEFAULT '00000'
  CHECK (VALUE ~ '^\d{5}(-\d{4})?$');
