package view

import "time"

const (
	ScopeGeneric = "generic"
	ScopePackage = "package"

	VisibilityPublic    = "public"
	VisibilityCorporate = "corporate"
)

func ValidScope(s string) bool      { return s == ScopeGeneric || s == ScopePackage }
func ValidVisibility(v string) bool { return v == VisibilityPublic || v == VisibilityCorporate }

// Article is the read model for list and single-article responses. BodyMd is only set on GET /articles/{slug}.
type Article struct {
	Id           string        `json:"id,omitempty"`
	Slug         string        `json:"slug"`
	Title        string        `json:"title"`
	Subtitle     string        `json:"subtitle,omitempty"`
	Scope        string        `json:"scope"`
	Visibility   string        `json:"visibility,omitempty"`
	PackageId    string        `json:"packageId,omitempty"`
	Version      string        `json:"version,omitempty"`
	DocumentSlug string        `json:"documentSlug,omitempty"`
	Labels       []string      `json:"labels"`
	DisplayOrder int           `json:"displayOrder"`
	Files        []ArticleFile `json:"files"`
	Published    *bool         `json:"published,omitempty"`
	BodyMd       *string       `json:"bodyMd,omitempty"`
	UpdatedAt    time.Time     `json:"updatedAt"`
	CreatedAt    *time.Time    `json:"createdAt,omitempty"`
	CreatedBy    string        `json:"createdBy,omitempty"`
	UpdatedBy    string        `json:"updatedBy,omitempty"`
}

type Articles struct {
	Articles []Article `json:"articles"`
}

// ArticleRequest is the admin create/update payload.
type ArticleRequest struct {
	Slug         string   `json:"slug"`
	Title        string   `json:"title"`
	Subtitle     string   `json:"subtitle"`
	Scope        string   `json:"scope"`
	BodyMd       *string  `json:"bodyMd"`
	Visibility   string   `json:"visibility"`
	PackageId    string   `json:"packageId"`
	Version      string   `json:"version"`
	DocumentSlug string   `json:"documentSlug"`
	Labels       []string `json:"labels"`
	DisplayOrder int      `json:"displayOrder"`
	Published    bool     `json:"published"`
}

// ArticleSearchReq is what list endpoints pass to the service.
type ArticleSearchReq struct {
	Scope      string
	Visibility string
	PackageId  string
	Version    string
	Limit      int
	Page       int
}
