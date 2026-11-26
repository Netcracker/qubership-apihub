package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/go-pg/pg/v10"
)

// nestedClassSeparator joins an outer class id and a nested class name in a binary class name.
const nestedClassSeparator = "$"

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
	ListClasses(ctx context.Context, libraryId, version string, req view.LibraryClassListReq) ([]entity.LibraryClassEntity, error)
	// GetClass returns nil when the version has no such class.
	GetClass(ctx context.Context, libraryId, version, classId string) (*entity.LibraryClassEntity, error)
	ListMethods(ctx context.Context, libraryId, version, classId string) ([]entity.LibraryMethodEntity, error)
	// ListNestedClasses returns the classes declared directly inside the given class, ordered by class id.
	ListNestedClasses(ctx context.Context, libraryId, version, classId string) ([]entity.LibraryClassEntity, error)
	// GetClassData returns the stored class body, or nil when no row has the hash.
	GetClassData(ctx context.Context, dataHash string) ([]byte, error)
	// ListMethodData returns the stored method bodies by data hash in one query.
	ListMethodData(ctx context.Context, dataHashes []string) (map[string][]byte, error)
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

// ListClasses pages through one version's classes in qualified-name order. The primary key starts with
// (library_id, version), so the scan stays within the version; the text filter is a substring match on the
// qualified name, which is what a caller browsing one library expects, unlike the token search of
// SearchClasses.
func (l libraryContentRepositoryImpl) ListClasses(ctx context.Context, libraryId, version string, req view.LibraryClassListReq) ([]entity.LibraryClassEntity, error) {
	result := make([]entity.LibraryClassEntity, 0)
	query := l.cp.GetConnection().ModelContext(ctx, &result).
		Where("library_id = ?", libraryId).
		Where("version = ?", version)
	if req.TextFilter != "" {
		query = query.Where("lower(qualified_name) like ?", "%"+utils.LikeEscaped(strings.ToLower(req.TextFilter))+"%")
	}
	if len(req.Kind) > 0 {
		kinds := make([]string, 0, len(req.Kind))
		for _, kind := range req.Kind {
			kinds = append(kinds, string(kind))
		}
		query = query.Where("kind in (?)", pg.In(kinds))
	}
	err := query.
		Order("qualified_name ASC", "class_id ASC").
		Limit(req.Limit).
		Offset(req.Limit * req.Page).
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

func (l libraryContentRepositoryImpl) GetClass(ctx context.Context, libraryId, version, classId string) (*entity.LibraryClassEntity, error) {
	result := new(entity.LibraryClassEntity)
	err := l.cp.GetConnection().ModelContext(ctx, result).
		Where("library_id = ?", libraryId).
		Where("version = ?", version).
		Where("class_id = ?", classId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (l libraryContentRepositoryImpl) ListMethods(ctx context.Context, libraryId, version, classId string) ([]entity.LibraryMethodEntity, error) {
	result := make([]entity.LibraryMethodEntity, 0)
	err := l.cp.GetConnection().ModelContext(ctx, &result).
		Where("library_id = ?", libraryId).
		Where("version = ?", version).
		Where("class_id = ?", classId).
		Order("name ASC", "method_id ASC").
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

// ListNestedClasses relies on the binary-name convention: a class nested in Outer has the class id
// Outer$Inner. A class nested one level deeper (Outer$Inner$Deep) belongs to Outer$Inner, so ids with a
// second separator after the prefix are excluded. The primary key starts with (library_id, version), so the
// scan stays within the version, and the result is bounded by the number of classes declared in one class.
func (l libraryContentRepositoryImpl) ListNestedClasses(ctx context.Context, libraryId, version, classId string) ([]entity.LibraryClassEntity, error) {
	prefix := utils.LikeEscaped(classId) + nestedClassSeparator
	result := make([]entity.LibraryClassEntity, 0)
	err := l.cp.GetConnection().ModelContext(ctx, &result).
		Where("library_id = ?", libraryId).
		Where("version = ?", version).
		Where("class_id like ?", prefix+"%").
		Where("class_id not like ?", prefix+"%"+nestedClassSeparator+"%").
		Order("class_id ASC").
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

func (l libraryContentRepositoryImpl) GetClassData(ctx context.Context, dataHash string) ([]byte, error) {
	result := new(entity.LibraryClassDataEntity)
	err := l.cp.GetConnection().ModelContext(ctx, result).
		Where("data_hash = ?", dataHash).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result.Data, nil
}

func (l libraryContentRepositoryImpl) ListMethodData(ctx context.Context, dataHashes []string) (map[string][]byte, error) {
	result := make(map[string][]byte, len(dataHashes))
	if len(dataHashes) == 0 {
		return result, nil
	}
	ents := make([]entity.LibraryMethodDataEntity, 0, len(dataHashes))
	err := l.cp.GetConnection().ModelContext(ctx, &ents).
		Where("data_hash IN (?)", pg.In(dataHashes)).
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	for _, ent := range ents {
		result[ent.DataHash] = ent.Data
	}
	return result, nil
}
