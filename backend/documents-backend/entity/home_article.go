package entity

import "time"

// HomeArticleEntity is one position of the admin-curated home page list; display_order is the array index.
type HomeArticleEntity struct {
	tableName struct{} `pg:"home_article, alias:home_article"`

	ArticleId    string    `pg:"article_id, pk, type:uuid"`
	DisplayOrder int       `pg:"display_order, type:integer, use_zero"`
	CreatedAt    time.Time `pg:"created_at, type:timestamp with time zone"`
	CreatedBy    string    `pg:"created_by, type:varchar, use_zero"`
}
