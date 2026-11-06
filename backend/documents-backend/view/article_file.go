package view

import "time"

// ArticleFile is a file attached to an article. Path is relative to the article; the file is served at
// GET /articles/{slug}/files/{path}. Checksum and audit fields appear in admin responses only.
type ArticleFile struct {
	Path        string     `json:"path"`
	ContentType string     `json:"contentType"`
	Size        int64      `json:"size"`
	Checksum    string     `json:"checksum,omitempty"`
	CreatedAt   *time.Time `json:"createdAt,omitempty"`
	CreatedBy   string     `json:"createdBy,omitempty"`
}

type ArticleFiles struct {
	Files []ArticleFile `json:"files"`
}

type ImportResult struct {
	Articles int `json:"articles"`
	Files    int `json:"files"`
	Sections int `json:"sections"`
	Items    int `json:"items"`
}
