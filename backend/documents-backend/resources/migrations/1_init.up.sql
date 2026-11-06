CREATE TABLE article (
    id            uuid PRIMARY KEY,
    slug          text NOT NULL UNIQUE,
    title         text NOT NULL,
    subtitle      text,
    scope         text NOT NULL,
    body_md       text,
    visibility    text,
    package_id    text,
    version       text,
    document_slug text,
    labels        jsonb NOT NULL DEFAULT '[]'::jsonb,
    display_order integer NOT NULL DEFAULT 0,
    published     boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    text,
    updated_by    text,
    CONSTRAINT article_scope_chk CHECK (scope IN ('generic', 'package')),
    CONSTRAINT article_scope_fields_chk CHECK (
        (scope = 'generic'
            AND body_md IS NOT NULL
            AND visibility IN ('public', 'corporate')
            AND package_id IS NULL AND version IS NULL AND document_slug IS NULL)
        OR
        (scope = 'package'
            AND body_md IS NULL
            AND visibility IS NULL
            AND package_id IS NOT NULL AND document_slug IS NOT NULL)
    )
);

CREATE UNIQUE INDEX article_package_doc_uq
    ON article (package_id, coalesce(version, ''), document_slug)
    WHERE scope = 'package';

CREATE INDEX article_list_idx ON article (scope, published, display_order, title);
CREATE INDEX article_package_idx ON article (package_id, version) WHERE scope = 'package';

-- Deduplicated file contents; a row lives while at least one article_file references it.
CREATE TABLE file_data (
    checksum text PRIMARY KEY,          -- sha256 hex of data
    data     bytea NOT NULL
);

-- Files attached to an article. path is relative to the article and unique only within it; the audience is the
-- article's (see service.ArticleFilesVisibility), so there is no visibility column.
CREATE TABLE article_file (
    id           uuid PRIMARY KEY,
    article_id   uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
    path         text NOT NULL,
    content_type text NOT NULL,
    size         bigint NOT NULL,
    checksum     text NOT NULL REFERENCES file_data(checksum),
    created_at   timestamptz NOT NULL DEFAULT now(),
    created_by   text,
    CONSTRAINT article_file_path_uq UNIQUE (article_id, path)
);
CREATE INDEX article_file_checksum_idx ON article_file (checksum);

-- Hierarchical guides navigation: sections own a tree of items (guide = article placement, group = folder).
CREATE TABLE nav_section (
    id            uuid PRIMARY KEY,
    scope         text NOT NULL,
    package_id    text,
    title         text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    text,
    updated_by    text,
    CONSTRAINT nav_section_scope_chk CHECK (scope IN ('generic', 'package')),
    CONSTRAINT nav_section_scope_fields_chk CHECK (
        (scope = 'generic' AND package_id IS NULL) OR (scope = 'package' AND package_id IS NOT NULL))
);
CREATE INDEX nav_section_list_idx ON nav_section (scope, package_id, display_order, title);

CREATE TABLE nav_item (
    id            uuid PRIMARY KEY,
    section_id    uuid NOT NULL REFERENCES nav_section(id) ON DELETE CASCADE,
    parent_id     uuid REFERENCES nav_item(id) ON DELETE CASCADE,
    kind          text NOT NULL,                              -- 'guide' | 'group'
    title         text,                                       -- null => article title is used
    article_id    uuid REFERENCES article(id) ON DELETE CASCADE,
    display_order integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    text,
    updated_by    text,
    CONSTRAINT nav_item_kind_chk CHECK (kind IN ('guide', 'group')),
    CONSTRAINT nav_item_kind_fields_chk CHECK (
        (kind = 'guide' AND article_id IS NOT NULL) OR (kind = 'group' AND article_id IS NULL AND title IS NOT NULL))
);
CREATE UNIQUE INDEX nav_item_article_uq ON nav_item (article_id) WHERE article_id IS NOT NULL;  -- one placement per article
CREATE INDEX nav_item_section_idx ON nav_item (section_id, parent_id, display_order);

-- Admin-curated ordered list of generic articles shown on the home page ("Things worth reading first").
-- Empty list => the UI falls back to the first generic guides.
CREATE TABLE home_article (
    article_id    uuid PRIMARY KEY REFERENCES article(id) ON DELETE CASCADE,
    display_order integer NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    created_by    text
);
