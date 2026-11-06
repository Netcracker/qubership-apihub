package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// ArticleFileEntity is the metadata of a file attached to an article. The bytes live in file_data, shared by
// every file with the same checksum. Path is relative to the article and unique only within it.
type ArticleFileEntity struct {
	tableName struct{} `pg:"article_file, alias:article_file"`

	Id          string    `pg:"id, pk, type:uuid"`
	ArticleId   string    `pg:"article_id, type:uuid, use_zero"`
	Path        string    `pg:"path, type:varchar, use_zero"`
	ContentType string    `pg:"content_type, type:varchar, use_zero"`
	Size        int64     `pg:"size, type:bigint, use_zero"`
	Checksum    string    `pg:"checksum, type:varchar, use_zero"`
	CreatedAt   time.Time `pg:"created_at, type:timestamp with time zone"`
	CreatedBy   string    `pg:"created_by, type:varchar, use_zero"`
}

// FileDataEntity holds file bytes once per distinct content (sha256 hex checksum).
type FileDataEntity struct {
	tableName struct{} `pg:"file_data, alias:file_data"`

	Checksum string `pg:"checksum, pk, type:varchar"`
	Data     []byte `pg:"data, type:bytea"`
}

// MakeArticleFileView projects a file; admin adds checksum and audit fields.
func MakeArticleFileView(ent ArticleFileEntity, admin bool) view.ArticleFile {
	v := view.ArticleFile{Path: ent.Path, ContentType: ent.ContentType, Size: ent.Size}
	if admin {
		createdAt := ent.CreatedAt
		v.Checksum = ent.Checksum
		v.CreatedAt = &createdAt
		v.CreatedBy = ent.CreatedBy
	}
	return v
}
