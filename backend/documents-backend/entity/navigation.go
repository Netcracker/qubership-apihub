package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

type NavSectionEntity struct {
	tableName struct{} `pg:"nav_section, alias:nav_section"`

	Id           string    `pg:"id, pk, type:uuid"`
	Scope        string    `pg:"scope, type:varchar, use_zero"`
	PackageId    *string   `pg:"package_id, type:varchar"`
	Title        string    `pg:"title, type:varchar, use_zero"`
	DisplayOrder int       `pg:"display_order, type:integer, use_zero"`
	CreatedAt    time.Time `pg:"created_at, type:timestamp with time zone"`
	UpdatedAt    time.Time `pg:"updated_at, type:timestamp with time zone"`
	CreatedBy    string    `pg:"created_by, type:varchar, use_zero"`
	UpdatedBy    string    `pg:"updated_by, type:varchar, use_zero"`
}

type NavItemEntity struct {
	tableName struct{} `pg:"nav_item, alias:nav_item"`

	Id           string    `pg:"id, pk, type:uuid"`
	SectionId    string    `pg:"section_id, type:uuid, use_zero"`
	ParentId     *string   `pg:"parent_id, type:uuid"`
	Kind         string    `pg:"kind, type:varchar, use_zero"`
	Title        *string   `pg:"title, type:varchar"`
	ArticleId    *string   `pg:"article_id, type:uuid"`
	DisplayOrder int       `pg:"display_order, type:integer, use_zero"`
	CreatedAt    time.Time `pg:"created_at, type:timestamp with time zone"`
	UpdatedAt    time.Time `pg:"updated_at, type:timestamp with time zone"`
	CreatedBy    string    `pg:"created_by, type:varchar, use_zero"`
	UpdatedBy    string    `pg:"updated_by, type:varchar, use_zero"`
}

func MakeNavSectionView(ent NavSectionEntity, includeAdmin bool) view.NavSection {
	v := view.NavSection{
		Id:           ent.Id,
		Scope:        ent.Scope,
		PackageId:    derefString(ent.PackageId),
		Title:        ent.Title,
		DisplayOrder: ent.DisplayOrder,
		Items:        []view.NavItem{},
	}
	if includeAdmin {
		created, updated := ent.CreatedAt, ent.UpdatedAt
		v.CreatedAt, v.UpdatedAt = &created, &updated
		v.CreatedBy, v.UpdatedBy = ent.CreatedBy, ent.UpdatedBy
	}
	return v
}

// MakeNavItemView maps an item; article is the referenced row for guide items (nil when dangling).
// The effective title is the override when set, otherwise the article title.
func MakeNavItemView(ent NavItemEntity, article *ArticleEntity, includeAdmin bool) view.NavItem {
	v := view.NavItem{
		Id:           ent.Id,
		SectionId:    ent.SectionId,
		ParentId:     derefString(ent.ParentId),
		Kind:         ent.Kind,
		Title:        derefString(ent.Title),
		DisplayOrder: ent.DisplayOrder,
		Children:     []view.NavItem{},
	}
	if ent.Kind == view.NavKindGuide && article != nil {
		if v.Title == "" {
			v.Title = article.Title
		}
		v.Slug = article.Slug
		v.PackageId = derefString(article.PackageId)
		v.Version = derefString(article.Version)
	}
	if includeAdmin {
		v.ArticleId = derefString(ent.ArticleId)
		v.TitleOverride = derefString(ent.Title)
		if ent.Kind == view.NavKindGuide {
			if article != nil {
				published := article.Published
				v.Published = &published
			} else {
				v.Dangling = true
			}
		}
	}
	return v
}
