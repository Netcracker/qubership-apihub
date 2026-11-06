package view

import "time"

const (
	NavKindGuide = "guide"
	NavKindGroup = "group"

	// NavSyntheticTitle is the trailing section that collects visible articles not placed in any section.
	NavSyntheticTitle = "Other"
)

func ValidNavKind(k string) bool { return k == NavKindGuide || k == NavKindGroup }

// NavMaxDepth is the maximum nesting of items under a section (1 = top-level item).
const NavMaxDepth = 3

type Navigation struct {
	Sections []NavSection `json:"sections"`
}

type NavSection struct {
	Id           string     `json:"id"`
	Scope        string     `json:"scope"`
	PackageId    string     `json:"packageId,omitempty"`
	Title        string     `json:"title"`
	DisplayOrder int        `json:"displayOrder"`
	Synthetic    bool       `json:"synthetic,omitempty"`
	Items        []NavItem  `json:"items"`
	CreatedAt    *time.Time `json:"createdAt,omitempty"`
	UpdatedAt    *time.Time `json:"updatedAt,omitempty"`
	CreatedBy    string     `json:"createdBy,omitempty"`
	UpdatedBy    string     `json:"updatedBy,omitempty"`
}

type NavItem struct {
	Id           string    `json:"id"`
	SectionId    string    `json:"sectionId"`
	ParentId     string    `json:"parentId,omitempty"`
	Kind         string    `json:"kind"`
	Title        string    `json:"title"` // effective title: override, else the article title
	Slug         string    `json:"slug,omitempty"`
	PackageId    string    `json:"packageId,omitempty"`
	Version      string    `json:"version,omitempty"`
	DisplayOrder int       `json:"displayOrder"`
	Children     []NavItem `json:"children"`
	// admin only
	ArticleId     string `json:"articleId,omitempty"`
	TitleOverride string `json:"titleOverride,omitempty"`
	Published     *bool  `json:"published,omitempty"`
	Dangling      bool   `json:"dangling,omitempty"`
}

type NavSectionRequest struct {
	Scope        string `json:"scope"`
	PackageId    string `json:"packageId"`
	Title        string `json:"title"`
	DisplayOrder int    `json:"displayOrder"`
}

type NavItemRequest struct {
	SectionId    string `json:"sectionId"`
	ParentId     string `json:"parentId"`
	Kind         string `json:"kind"`
	Title        string `json:"title"`
	ArticleId    string `json:"articleId"`
	DisplayOrder int    `json:"displayOrder"`
}
