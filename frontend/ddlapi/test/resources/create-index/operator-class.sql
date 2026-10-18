CREATE TABLE articles (id bigint PRIMARY KEY, content text);

CREATE INDEX idx_articles_content_pattern ON articles (content text_pattern_ops);
