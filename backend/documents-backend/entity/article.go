package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

type ArticleEntity struct {
	tableName struct{} `pg:"article, alias:article"`

	Id           string    `pg:"id, pk, type:uuid"`
	Slug         string    `pg:"slug, type:varchar, use_zero"`
	Title        string    `pg:"title, type:varchar, use_zero"`
	Subtitle     string    `pg:"subtitle, type:varchar, use_zero"`
	Scope        string    `pg:"scope, type:varchar, use_zero"`
	BodyMd       *string   `pg:"body_md, type:varchar"`
	Visibility   *string   `pg:"visibility, type:varchar"`
	PackageId    *string   `pg:"package_id, type:varchar"`
	Version      *string   `pg:"version, type:varchar"`
	DocumentSlug *string   `pg:"document_slug, type:varchar"`
	Labels       []string  `pg:"labels, type:jsonb, use_zero"`
	DisplayOrder int       `pg:"display_order, type:integer, use_zero"`
	Published    bool      `pg:"published, type:boolean, use_zero"`
	CreatedAt    time.Time `pg:"created_at, type:timestamp with time zone"`
	UpdatedAt    time.Time `pg:"updated_at, type:timestamp with time zone"`
	CreatedBy    string    `pg:"created_by, type:varchar, use_zero"`
	UpdatedBy    string    `pg:"updated_by, type:varchar, use_zero"`
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// MakeArticleView maps the row to the API model. includeBody adds bodyMd for generic articles;
// includeAdmin adds id, published and audit fields.
func MakeArticleView(ent ArticleEntity, includeBody bool, includeAdmin bool) view.Article {
	labels := ent.Labels
	if labels == nil {
		labels = []string{}
	}
	v := view.Article{
		Slug:         ent.Slug,
		Title:        ent.Title,
		Subtitle:     ent.Subtitle,
		Scope:        ent.Scope,
		Visibility:   derefString(ent.Visibility),
		PackageId:    derefString(ent.PackageId),
		Version:      derefString(ent.Version),
		DocumentSlug: derefString(ent.DocumentSlug),
		Labels:       labels,
		DisplayOrder: ent.DisplayOrder,
		UpdatedAt:    ent.UpdatedAt,
	}
	if includeBody && ent.Scope == view.ScopeGeneric {
		body := derefString(ent.BodyMd)
		v.BodyMd = &body
	}
	if includeAdmin {
		published := ent.Published
		created := ent.CreatedAt
		v.Id = ent.Id
		v.Published = &published
		v.CreatedAt = &created
		v.CreatedBy = ent.CreatedBy
		v.UpdatedBy = ent.UpdatedBy
	}
	return v
}
