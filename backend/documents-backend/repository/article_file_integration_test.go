package repository_test

import (
	"context"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/go-pg/pg/v10"
)

// Runs against a real PostgreSQL when DOCS_TEST_DB_* is set, e.g.
//
//	DOCS_TEST_DB_HOST=localhost DOCS_TEST_DB_PORT=5432 DOCS_TEST_DB_NAME=docs_backend_test DOCS_TEST_DB_USER=postgres DOCS_TEST_DB_PASSWORD=postgres go test ./repository/
//
// The schema is (re)created from resources/migrations/1_init.up.sql; the database must be dedicated to tests.
func testConnection(t *testing.T) db.ConnectionProvider {
	t.Helper()
	host := os.Getenv("DOCS_TEST_DB_HOST")
	if host == "" {
		t.Skip("DOCS_TEST_DB_HOST not set")
	}
	port, _ := strconv.Atoi(os.Getenv("DOCS_TEST_DB_PORT"))
	if port == 0 {
		port = 5432
	}
	cp := db.NewConnectionProvider(&view.DbCredentials{Host: host, Port: port, Database: os.Getenv("DOCS_TEST_DB_NAME"), Username: os.Getenv("DOCS_TEST_DB_USER"), Password: os.Getenv("DOCS_TEST_DB_PASSWORD")})
	down, err := os.ReadFile("../resources/migrations/1_init.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	up, err := os.ReadFile("../resources/migrations/1_init.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := cp.GetConnection().Exec(string(down)); err != nil {
		t.Fatal(err)
	}
	if _, err := cp.GetConnection().Exec(string(up)); err != nil {
		t.Fatal(err)
	}
	return cp
}

func countRows(t *testing.T, cp db.ConnectionProvider, table string) int {
	t.Helper()
	var n int
	if _, err := cp.GetConnection().QueryOne(pg.Scan(&n), "SELECT count(*) FROM "+table); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestArticleFileRepositoryPG(t *testing.T) {
	cp := testConnection(t)
	ctx := context.Background()
	articles := repository.NewArticleRepositoryPG(cp)
	files := repository.NewArticleFileRepositoryPG(cp)
	data := repository.NewFileDataRepositoryPG(cp)
	tx := repository.NewTransactionRunnerPG(cp)

	body := "# a"
	vis := view.VisibilityPublic
	a := &entity.ArticleEntity{Id: utils.NewId(), Slug: "a", Title: "A", Scope: view.ScopeGeneric, BodyMd: &body, Visibility: &vis, Labels: []string{}, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	b := &entity.ArticleEntity{Id: utils.NewId(), Slug: "b", Title: "B", Scope: view.ScopeGeneric, BodyMd: &body, Visibility: &vis, Labels: []string{}, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	for _, art := range []*entity.ArticleEntity{a, b} {
		if err := articles.CreateArticle(ctx, art); err != nil {
			t.Fatal(err)
		}
	}
	shared := []byte("shared bytes")
	sum := utils.Sha256Hex(shared)
	file := func(articleId, path, checksum string) *entity.ArticleFileEntity {
		return &entity.ArticleFileEntity{Id: utils.NewId(), ArticleId: articleId, Path: path, ContentType: "image/png", Size: int64(len(shared)), Checksum: checksum, CreatedAt: time.Now(), CreatedBy: "t"}
	}

	// same bytes on two articles, same relative path: one content row, two metadata rows
	err := tx.RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, art := range []*entity.ArticleEntity{a, b} {
			if err := data.UpsertFileData(ctx, tx, &entity.FileDataEntity{Checksum: sum, Data: shared}); err != nil {
				return err
			}
			if err := files.CreateArticleFile(ctx, tx, file(art.Id, "diagram.png", sum)); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if countRows(t, cp, "file_data") != 1 || countRows(t, cp, "article_file") != 2 {
		t.Fatalf("rows: data=%d files=%d", countRows(t, cp, "file_data"), countRows(t, cp, "article_file"))
	}
	// the same path twice within one article violates article_file_path_uq
	if err := files.CreateArticleFile(ctx, nil, file(a.Id, "diagram.png", sum)); err == nil {
		t.Fatal("duplicate path within an article must fail")
	}
	// upsert replaces content type / checksum but keeps id
	before, _ := files.GetArticleFile(ctx, a.Id, "diagram.png")
	other := []byte("other bytes")
	otherSum := utils.Sha256Hex(other)
	if err := data.UpsertFileData(ctx, nil, &entity.FileDataEntity{Checksum: otherSum, Data: other}); err != nil {
		t.Fatal(err)
	}
	if err := files.UpsertArticleFile(ctx, nil, file(a.Id, "diagram.png", otherSum)); err != nil {
		t.Fatal(err)
	}
	after, _ := files.GetArticleFile(ctx, a.Id, "diagram.png")
	if after == nil || after.Id != before.Id || after.Checksum != otherSum {
		t.Fatalf("upsert: before=%+v after=%+v", before, after)
	}
	// shared content is still referenced by b: not an orphan
	if err := data.DeleteOrphanFileData(ctx, nil, []string{sum}); err != nil {
		t.Fatal(err)
	}
	if countRows(t, cp, "file_data") != 2 {
		t.Fatalf("referenced content must stay, rows=%d", countRows(t, cp, "file_data"))
	}
	byArticle, err := files.GetArticleFiles(ctx, []string{a.Id, b.Id})
	if err != nil || len(byArticle[a.Id]) != 1 || len(byArticle[b.Id]) != 1 {
		t.Fatalf("GetArticleFiles: %v %+v", err, byArticle)
	}
	// delete one file (RETURNING) and collect its content
	err = tx.RunInTransaction(ctx, func(tx *pg.Tx) error {
		deleted, err := files.DeleteArticleFile(ctx, tx, a.Id, "diagram.png")
		if err != nil {
			return err
		}
		if deleted == nil || deleted.Checksum != otherSum {
			t.Fatalf("delete returning: %+v", deleted)
		}
		return data.DeleteOrphanFileData(ctx, tx, []string{deleted.Checksum})
	})
	if err != nil {
		t.Fatal(err)
	}
	if missing, _ := files.DeleteArticleFile(ctx, nil, a.Id, "diagram.png"); missing != nil {
		t.Fatal("second delete must return nil")
	}
	if countRows(t, cp, "file_data") != 1 {
		t.Fatalf("orphan must be gone, rows=%d", countRows(t, cp, "file_data"))
	}
	// delete the article with its files and the last reference to the shared content
	err = tx.RunInTransaction(ctx, func(tx *pg.Tx) error {
		deleted, err := files.DeleteArticleFiles(ctx, tx, b.Id)
		if err != nil {
			return err
		}
		if len(deleted) != 1 {
			t.Fatalf("DeleteArticleFiles returned %d rows", len(deleted))
		}
		if err := articles.DeleteArticle(ctx, tx, b.Id); err != nil {
			return err
		}
		return data.DeleteOrphanFileData(ctx, tx, []string{deleted[0].Checksum})
	})
	if err != nil {
		t.Fatal(err)
	}
	if countRows(t, cp, "file_data") != 0 || countRows(t, cp, "article_file") != 0 || countRows(t, cp, "article") != 1 {
		t.Fatalf("rows: data=%d files=%d articles=%d", countRows(t, cp, "file_data"), countRows(t, cp, "article_file"), countRows(t, cp, "article"))
	}
	// the FK protects contents that are still referenced
	if err := data.UpsertFileData(ctx, nil, &entity.FileDataEntity{Checksum: sum, Data: shared}); err != nil {
		t.Fatal(err)
	}
	if err := files.CreateArticleFile(ctx, nil, file(a.Id, "x.png", sum)); err != nil {
		t.Fatal(err)
	}
	if _, err := cp.GetConnection().Exec("DELETE FROM file_data WHERE checksum = ?", sum); err == nil {
		t.Fatal("deleting referenced content must fail")
	}
	if err := files.CreateArticleFile(ctx, nil, file(a.Id, "y.png", "missing")); err == nil {
		t.Fatal("metadata without content must fail")
	}
}
