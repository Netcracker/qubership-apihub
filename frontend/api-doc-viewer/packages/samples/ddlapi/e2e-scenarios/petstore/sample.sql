CREATE SCHEMA petstore;

CREATE TABLE petstore.animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  photo bytea,
  CONSTRAINT animals_title_key UNIQUE (title)
);

CREATE INDEX animals_uniqu_idx ON petstore.animals (title);

CREATE INDEX animals_complex_idx ON petstore.animals (title, description);

COMMENT ON COLUMN petstore.animals.title IS 'Stub column comment for ddlapi sample fixture testing.';

COMMENT ON INDEX petstore.animals_uniqu_idx IS 'Stub long comment for ddlapi viewer sample fixtures and Storybook testing only. This placeholder text is intentionally verbose so the API doc viewer can render multiline column and index descriptions at realistic lengths without using production documentation. Segment A: lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Segment B: ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Segment C: duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore end stub.';
