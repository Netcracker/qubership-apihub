package repository

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/go-pg/pg/v10"
)

// LibraryContent is one library version's parsed API inventory, ready to be written in a single
// transaction. The data rows are content-addressed, so the same class body appearing in two versions is
// stored once.
type LibraryContent struct {
	ClassData  []entity.LibraryClassDataEntity
	Classes    []entity.LibraryClassEntity
	MethodData []entity.LibraryMethodDataEntity
	Methods    []entity.LibraryMethodEntity
}

type LibraryContentRepository interface {
	// Replace makes the stored inventory of one library version equal to the given content. The previous
	// inventory of that version is removed first, so a re-import does not leave classes behind that the
	// new build no longer reports.
	Replace(ctx context.Context, libraryId, version string, content LibraryContent) error
	SearchClasses(ctx context.Context, req view.SearchClassesReq) ([]entity.ClassSearchResultEntity, error)
}

func NewLibraryContentRepository(cp db.ConnectionProvider) LibraryContentRepository {
	return libraryContentRepositoryImpl{cp: cp}
}

type libraryContentRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (l libraryContentRepositoryImpl) Replace(ctx context.Context, libraryId, version string, content LibraryContent) error {
	return l.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		// Methods, and both search tables, hang off library_class by a cascading foreign key.
		_, err := tx.ModelContext(ctx, (*entity.LibraryClassEntity)(nil)).
			Where("library_id = ?", libraryId).
			Where("version = ?", version).
			Delete()
		if err != nil {
			return fmt.Errorf("failed to clear the previous inventory of %s %s: %w", libraryId, version, err)
		}

		if len(content.ClassData) > 0 {
			_, err = tx.ModelContext(ctx, &content.ClassData).
				OnConflict("(data_hash) DO NOTHING").
				Insert()
			if err != nil {
				return fmt.Errorf("failed to store class data: %w", err)
			}
		}
		if len(content.Classes) > 0 {
			if _, err = tx.ModelContext(ctx, &content.Classes).Insert(); err != nil {
				return fmt.Errorf("failed to store classes: %w", err)
			}
		}
		if len(content.MethodData) > 0 {
			_, err = tx.ModelContext(ctx, &content.MethodData).
				OnConflict("(data_hash) DO NOTHING").
				Insert()
			if err != nil {
				return fmt.Errorf("failed to store method data: %w", err)
			}
		}
		if len(content.Methods) > 0 {
			if _, err = tx.ModelContext(ctx, &content.Methods).Insert(); err != nil {
				return fmt.Errorf("failed to store methods: %w", err)
			}
		}

		if err = rebuildContentSearchVectors(ctx, tx, libraryId, version); err != nil {
			return err
		}
		return deleteOrphanedContentData(ctx, tx)
	})
}

// rebuildContentSearchVectors derives both content search tables from the rows just written, in one
// statement each, rather than one round trip per class or method.
func rebuildContentSearchVectors(ctx context.Context, tx *pg.Tx, libraryId, version string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO library_class_search (library_id, version, class_id, search_vector)
		SELECT library_id, version, class_id, `+searchVectorExpr("qualified_name || ' ' || coalesce(package_name, '')")+`
		FROM library_class
		WHERE library_id = ? AND version = ?`,
		searchTextConfig, libraryId, version)
	if err != nil {
		return fmt.Errorf("failed to index the classes of %s %s: %w", libraryId, version, err)
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO library_method_search (library_id, version, class_id, method_id, search_vector)
		SELECT library_id, version, class_id, method_id, `+searchVectorExpr("name || ' ' || signature")+`
		FROM library_method
		WHERE library_id = ? AND version = ?`,
		searchTextConfig, libraryId, version)
	if err != nil {
		return fmt.Errorf("failed to index the methods of %s %s: %w", libraryId, version, err)
	}
	return nil
}

// deleteOrphanedContentData drops content-addressed rows that no version references any more. Without it a
// re-imported or deleted version leaves its bodies behind forever, because nothing else owns them.
func deleteOrphanedContentData(ctx context.Context, tx *pg.Tx) error {
	_, err := tx.ExecContext(ctx, `
		DELETE FROM library_class_data
		WHERE NOT EXISTS (SELECT 1 FROM library_class WHERE library_class.data_hash = library_class_data.data_hash)`)
	if err != nil {
		return fmt.Errorf("failed to remove orphaned class data: %w", err)
	}
	_, err = tx.ExecContext(ctx, `
		DELETE FROM library_method_data
		WHERE NOT EXISTS (SELECT 1 FROM library_method WHERE library_method.data_hash = library_method_data.data_hash)`)
	if err != nil {
		return fmt.Errorf("failed to remove orphaned method data: %w", err)
	}
	return nil
}

// SearchClasses matches classes and methods in one pass, so a single ranked and paged result can mix the
// two. A method hit carries its class columns as well, letting the caller render either kind from one row.
//
// The tsquery is computed once in a CTE and cross-joined, rather than repeated in each branch. Both GIN
// indexes narrow the scan before the library join, so the cost scales with the number of matches, not with
// the size of the inventory.
func (l libraryContentRepositoryImpl) SearchClasses(ctx context.Context, req view.SearchClassesReq) ([]entity.ClassSearchResultEntity, error) {
	result := make([]entity.ClassSearchResultEntity, 0)

	args := []interface{}{searchTextConfig, req.TextFilter}
	conditions := ""
	if req.LibraryId != "" {
		conditions += " AND matches.library_id = ?"
		args = append(args, req.LibraryId)
	}
	if req.Version != "" {
		conditions += " AND matches.version = ?"
		args = append(args, req.Version)
	}
	if len(req.Kind) > 0 {
		kinds := make([]string, 0, len(req.Kind))
		for _, kind := range req.Kind {
			kinds = append(kinds, string(kind))
		}
		conditions += " AND matches.kind IN (?)"
		args = append(args, pg.In(kinds))
	}
	args = append(args, req.Limit, req.Limit*req.Page)

	query := `
		WITH q AS (SELECT ` + searchQueryExpr + ` AS tsq),
		matches AS (
			SELECT
				cls.library_id,
				cls.version,
				cls.class_id,
				cls.qualified_name,
				cls.package_name,
				cls.kind,
				'' AS method_id,
				'' AS signature,
				ts_rank(cs.search_vector, q.tsq) AS rank
			FROM library_class_search AS cs
			CROSS JOIN q
			INNER JOIN library_class AS cls
				ON cls.library_id = cs.library_id AND cls.version = cs.version AND cls.class_id = cs.class_id
			WHERE cs.search_vector @@ q.tsq
			UNION ALL
			SELECT
				cls.library_id,
				cls.version,
				cls.class_id,
				cls.qualified_name,
				cls.package_name,
				cls.kind,
				mtd.method_id,
				mtd.signature,
				ts_rank(ms.search_vector, q.tsq) AS rank
			FROM library_method_search AS ms
			CROSS JOIN q
			INNER JOIN library_method AS mtd
				ON mtd.library_id = ms.library_id AND mtd.version = ms.version
					AND mtd.class_id = ms.class_id AND mtd.method_id = ms.method_id
			INNER JOIN library_class AS cls
				ON cls.library_id = mtd.library_id AND cls.version = mtd.version AND cls.class_id = mtd.class_id
			WHERE ms.search_vector @@ q.tsq
		)
		SELECT
			matches.library_id,
			matches.version,
			matches.class_id,
			matches.qualified_name,
			matches.package_name,
			matches.kind,
			matches.method_id,
			matches.signature
		FROM matches
		INNER JOIN library AS lib ON lib.id = matches.library_id
		WHERE lib.deleted_at IS NULL` + conditions + `
		ORDER BY matches.rank DESC, matches.qualified_name, matches.method_id
		LIMIT ? OFFSET ?`

	_, err := l.cp.GetConnection().WithContext(ctx).Query(&result, query, args...)
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}
