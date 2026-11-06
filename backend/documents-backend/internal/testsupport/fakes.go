// Package testsupport holds in-memory fakes and helpers shared by unit tests (no database required).
package testsupport

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/go-pg/pg/v10"
)

// ---- articles ----

type FakeArticleRepository struct {
	mu   sync.Mutex
	rows map[string]*entity.ArticleEntity // by id
	// OnDelete emulates foreign-key cascades of dependent fakes (navigation items).
	OnDelete func(articleId string)
}

func NewFakeArticleRepository() *FakeArticleRepository {
	return &FakeArticleRepository{rows: map[string]*entity.ArticleEntity{}}
}

func (r *FakeArticleRepository) Add(ent entity.ArticleEntity) *entity.ArticleEntity {
	r.mu.Lock()
	defer r.mu.Unlock()
	if ent.Id == "" {
		ent.Id = utils.NewId()
	}
	cp := ent
	r.rows[cp.Id] = &cp
	return &cp
}

func (r *FakeArticleRepository) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.rows)
}

func cloneArticle(ent *entity.ArticleEntity) *entity.ArticleEntity {
	cp := *ent
	return &cp
}

func (r *FakeArticleRepository) GetArticles(_ context.Context, q repository.ArticleSearchQuery) ([]entity.ArticleEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]entity.ArticleEntity, 0)
	for _, ent := range r.rows {
		if q.Scope != "" && ent.Scope != q.Scope {
			continue
		}
		if q.PublishedOnly && !ent.Published {
			continue
		}
		if len(q.Visibilities) > 0 {
			match := false
			for _, v := range q.Visibilities {
				if ent.Visibility != nil && *ent.Visibility == v {
					match = true
				}
			}
			if !match {
				continue
			}
		}
		if q.PackageId != "" && (ent.PackageId == nil || *ent.PackageId != q.PackageId) {
			continue
		}
		if q.Version != "" && ent.Version != nil && *ent.Version != q.Version {
			continue
		}
		out = append(out, *ent)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].DisplayOrder != out[j].DisplayOrder {
			return out[i].DisplayOrder < out[j].DisplayOrder
		}
		return strings.Compare(out[i].Title, out[j].Title) < 0
	})
	if q.Limit > 0 {
		if q.Offset >= len(out) {
			return []entity.ArticleEntity{}, nil
		}
		out = out[q.Offset:]
		if len(out) > q.Limit {
			out = out[:q.Limit]
		}
	}
	return out, nil
}

func (r *FakeArticleRepository) GetArticleBySlug(_ context.Context, slug string) (*entity.ArticleEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, ent := range r.rows {
		if ent.Slug == slug {
			return cloneArticle(ent), nil
		}
	}
	return nil, nil
}

func (r *FakeArticleRepository) GetArticleById(_ context.Context, id string) (*entity.ArticleEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if ent, ok := r.rows[id]; ok {
		return cloneArticle(ent), nil
	}
	return nil, nil
}

func (r *FakeArticleRepository) CreateArticle(_ context.Context, ent *entity.ArticleEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.rows[ent.Id] = cloneArticle(ent)
	return nil
}

func (r *FakeArticleRepository) UpdateArticle(_ context.Context, ent *entity.ArticleEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.rows[ent.Id] = cloneArticle(ent)
	return nil
}

func (r *FakeArticleRepository) DeleteArticle(_ context.Context, _ *pg.Tx, id string) error {
	r.mu.Lock()
	delete(r.rows, id)
	r.mu.Unlock()
	if r.OnDelete != nil {
		r.OnDelete(id)
	}
	return nil
}

func (r *FakeArticleRepository) SetArticlePublished(_ context.Context, id string, published bool, userId string) (*entity.ArticleEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	ent, ok := r.rows[id]
	if !ok {
		return nil, nil
	}
	ent.Published = published
	ent.UpdatedBy = userId
	return cloneArticle(ent), nil
}

func (r *FakeArticleRepository) UpsertArticleBySlug(_ context.Context, _ *pg.Tx, ent *entity.ArticleEntity) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for id, existing := range r.rows {
		if existing.Slug == ent.Slug {
			ent.Id = id
			ent.CreatedAt, ent.CreatedBy = existing.CreatedAt, existing.CreatedBy
			r.rows[id] = cloneArticle(ent)
			return false, nil
		}
	}
	if ent.Id == "" {
		ent.Id = utils.NewId()
	}
	r.rows[ent.Id] = cloneArticle(ent)
	return true, nil
}

// ---- article files + deduplicated contents ----

// FakeArticleFileRepository keys metadata by (article id, relative path), mirroring article_file_path_uq.
type FakeArticleFileRepository struct {
	mu   sync.Mutex
	rows map[string]*entity.ArticleFileEntity
}

func NewFakeArticleFileRepository() *FakeArticleFileRepository {
	return &FakeArticleFileRepository{rows: map[string]*entity.ArticleFileEntity{}}
}

func fileKey(articleId, path string) string { return articleId + "\x00" + path }

func (r *FakeArticleFileRepository) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.rows)
}

// references reports whether any row still points at the checksum (used by the data fake's orphan cleanup).
func (r *FakeArticleFileRepository) references(checksum string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, ent := range r.rows {
		if ent.Checksum == checksum {
			return true
		}
	}
	return false
}

func (r *FakeArticleFileRepository) GetArticleFile(_ context.Context, articleId string, path string) (*entity.ArticleFileEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if ent, ok := r.rows[fileKey(articleId, path)]; ok {
		cp := *ent
		return &cp, nil
	}
	return nil, nil
}

func (r *FakeArticleFileRepository) GetArticleFiles(_ context.Context, articleIds []string) (map[string][]entity.ArticleFileEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := map[string][]entity.ArticleFileEntity{}
	for _, id := range articleIds {
		for _, ent := range r.rows {
			if ent.ArticleId == id {
				out[id] = append(out[id], *ent)
			}
		}
		sort.Slice(out[id], func(i, j int) bool { return out[id][i].Path < out[id][j].Path })
	}
	return out, nil
}

func (r *FakeArticleFileRepository) CreateArticleFile(_ context.Context, _ *pg.Tx, ent *entity.ArticleFileEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.rows[fileKey(ent.ArticleId, ent.Path)]; exists {
		return errors.New("duplicate key value violates unique constraint \"article_file_path_uq\"")
	}
	cp := *ent
	r.rows[fileKey(ent.ArticleId, ent.Path)] = &cp
	return nil
}

func (r *FakeArticleFileRepository) UpsertArticleFile(_ context.Context, _ *pg.Tx, ent *entity.ArticleFileEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := *ent
	if existing, ok := r.rows[fileKey(ent.ArticleId, ent.Path)]; ok {
		cp.Id, cp.CreatedAt, cp.CreatedBy = existing.Id, existing.CreatedAt, existing.CreatedBy
	}
	r.rows[fileKey(ent.ArticleId, ent.Path)] = &cp
	return nil
}

func (r *FakeArticleFileRepository) DeleteArticleFile(_ context.Context, _ *pg.Tx, articleId string, path string) (*entity.ArticleFileEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	ent, ok := r.rows[fileKey(articleId, path)]
	if !ok {
		return nil, nil
	}
	delete(r.rows, fileKey(articleId, path))
	return ent, nil
}

func (r *FakeArticleFileRepository) DeleteArticleFiles(_ context.Context, _ *pg.Tx, articleId string) ([]entity.ArticleFileEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]entity.ArticleFileEntity, 0)
	for key, ent := range r.rows {
		if ent.ArticleId == articleId {
			out = append(out, *ent)
			delete(r.rows, key)
		}
	}
	return out, nil
}

// FakeFileDataRepository stores bytes by checksum; orphan cleanup consults the article-file fake like the SQL does.
type FakeFileDataRepository struct {
	mu    sync.Mutex
	rows  map[string][]byte
	files *FakeArticleFileRepository
}

func NewFakeFileDataRepository(files *FakeArticleFileRepository) *FakeFileDataRepository {
	return &FakeFileDataRepository{rows: map[string][]byte{}, files: files}
}

func (r *FakeFileDataRepository) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.rows)
}

func (r *FakeFileDataRepository) GetFileData(_ context.Context, checksum string) (*entity.FileDataEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if data, ok := r.rows[checksum]; ok {
		return &entity.FileDataEntity{Checksum: checksum, Data: append([]byte(nil), data...)}, nil
	}
	return nil, nil
}

func (r *FakeFileDataRepository) UpsertFileData(_ context.Context, _ *pg.Tx, ent *entity.FileDataEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.rows[ent.Checksum]; !exists {
		r.rows[ent.Checksum] = append([]byte(nil), ent.Data...)
	}
	return nil
}

func (r *FakeFileDataRepository) DeleteOrphanFileData(_ context.Context, _ *pg.Tx, checksums []string) error {
	for _, checksum := range checksums {
		if !r.files.references(checksum) {
			r.mu.Lock()
			delete(r.rows, checksum)
			r.mu.Unlock()
		}
	}
	return nil
}

// FakeTransactionRunner satisfies repository.TransactionRunner without a database.
type FakeTransactionRunner struct{}

func (FakeTransactionRunner) RunInTransaction(_ context.Context, fn func(tx *pg.Tx) error) error {
	return fn(nil)
}

// ---- navigation ----

// FakeNavigationRepository emulates the cascades of the schema: deleting a section drops its items, deleting an
// item drops its descendants, and deleting an article (via FakeArticleRepository.OnDelete) drops its guide item.
type FakeNavigationRepository struct {
	mu       sync.Mutex
	sections map[string]*entity.NavSectionEntity
	items    map[string]*entity.NavItemEntity
}

func NewFakeNavigationRepository() *FakeNavigationRepository {
	return &FakeNavigationRepository{sections: map[string]*entity.NavSectionEntity{}, items: map[string]*entity.NavItemEntity{}}
}

func (r *FakeNavigationRepository) CountSections() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.sections)
}

func (r *FakeNavigationRepository) CountItems() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.items)
}

// OnArticleDeleted mirrors `article_id ... on delete cascade`.
func (r *FakeNavigationRepository) OnArticleDeleted(articleId string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for id, it := range r.items {
		if it.ArticleId != nil && *it.ArticleId == articleId {
			r.deleteItemTree(id)
		}
	}
}

func (r *FakeNavigationRepository) deleteItemTree(id string) {
	for cid, it := range r.items {
		if it.ParentId != nil && *it.ParentId == id {
			r.deleteItemTree(cid)
		}
	}
	delete(r.items, id)
}

func sortSections(out []entity.NavSectionEntity) {
	sort.Slice(out, func(i, j int) bool {
		if out[i].DisplayOrder != out[j].DisplayOrder {
			return out[i].DisplayOrder < out[j].DisplayOrder
		}
		return out[i].Title < out[j].Title
	})
}

func (r *FakeNavigationRepository) GetSections(_ context.Context, scope string, packageId string) ([]entity.NavSectionEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]entity.NavSectionEntity, 0)
	for _, s := range r.sections {
		pkg := ""
		if s.PackageId != nil {
			pkg = *s.PackageId
		}
		if s.Scope == scope && pkg == packageId {
			out = append(out, *s)
		}
	}
	sortSections(out)
	return out, nil
}

func (r *FakeNavigationRepository) GetAllSections(_ context.Context) ([]entity.NavSectionEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]entity.NavSectionEntity, 0, len(r.sections))
	for _, s := range r.sections {
		out = append(out, *s)
	}
	sortSections(out)
	return out, nil
}

func (r *FakeNavigationRepository) GetSection(_ context.Context, id string) (*entity.NavSectionEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if s, ok := r.sections[id]; ok {
		cp := *s
		return &cp, nil
	}
	return nil, nil
}

func (r *FakeNavigationRepository) CreateSection(_ context.Context, _ *pg.Tx, ent *entity.NavSectionEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := *ent
	r.sections[ent.Id] = &cp
	return nil
}

func (r *FakeNavigationRepository) UpdateSection(_ context.Context, ent *entity.NavSectionEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := *ent
	r.sections[ent.Id] = &cp
	return nil
}

func (r *FakeNavigationRepository) DeleteSection(_ context.Context, id string) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.sections[id]; !ok {
		return false, nil
	}
	delete(r.sections, id)
	for iid, it := range r.items {
		if it.SectionId == id {
			delete(r.items, iid)
		}
	}
	return true, nil
}

func (r *FakeNavigationRepository) DeleteSectionsByScope(ctx context.Context, _ *pg.Tx, scope string, packageId string) error {
	sections, _ := r.GetSections(ctx, scope, packageId)
	for _, s := range sections {
		if _, err := r.DeleteSection(ctx, s.Id); err != nil {
			return err
		}
	}
	return nil
}

func (r *FakeNavigationRepository) GetItemsBySections(_ context.Context, sectionIds []string) ([]entity.NavItemEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	want := map[string]bool{}
	for _, id := range sectionIds {
		want[id] = true
	}
	out := make([]entity.NavItemEntity, 0)
	for _, it := range r.items {
		if want[it.SectionId] {
			out = append(out, *it)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].SectionId != out[j].SectionId {
			return out[i].SectionId < out[j].SectionId
		}
		if out[i].DisplayOrder != out[j].DisplayOrder {
			return out[i].DisplayOrder < out[j].DisplayOrder
		}
		return out[i].Id < out[j].Id
	})
	return out, nil
}

func (r *FakeNavigationRepository) GetItem(_ context.Context, id string) (*entity.NavItemEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if it, ok := r.items[id]; ok {
		cp := *it
		return &cp, nil
	}
	return nil, nil
}

func (r *FakeNavigationRepository) GetItemByArticle(_ context.Context, articleId string) (*entity.NavItemEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, it := range r.items {
		if it.ArticleId != nil && *it.ArticleId == articleId {
			cp := *it
			return &cp, nil
		}
	}
	return nil, nil
}

func (r *FakeNavigationRepository) CreateItem(_ context.Context, _ *pg.Tx, ent *entity.NavItemEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if ent.ArticleId != nil {
		for _, it := range r.items {
			if it.ArticleId != nil && *it.ArticleId == *ent.ArticleId {
				return errors.New("duplicate key value violates unique constraint \"nav_item_article_uq\"")
			}
		}
	}
	cp := *ent
	r.items[ent.Id] = &cp
	return nil
}

func (r *FakeNavigationRepository) UpdateItem(_ context.Context, ent *entity.NavItemEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := *ent
	r.items[ent.Id] = &cp
	return nil
}

func (r *FakeNavigationRepository) DeleteItem(_ context.Context, id string) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.items[id]; !ok {
		return false, nil
	}
	r.deleteItemTree(id)
	return true, nil
}

func (r *FakeNavigationRepository) CountItemsInSection(_ context.Context, sectionId string) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	n := 0
	for _, it := range r.items {
		if it.SectionId == sectionId {
			n++
		}
	}
	return n, nil
}

// ---- home articles ----

// FakeHomeArticleRepository keeps the ordered list in a slice; deleting an article (via FakeArticleRepository.OnDelete)
// drops its position like `article_id ... on delete cascade`.
type FakeHomeArticleRepository struct {
	mu   sync.Mutex
	rows []entity.HomeArticleEntity
}

func NewFakeHomeArticleRepository() *FakeHomeArticleRepository {
	return &FakeHomeArticleRepository{rows: []entity.HomeArticleEntity{}}
}

func (r *FakeHomeArticleRepository) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.rows)
}

func (r *FakeHomeArticleRepository) OnArticleDeleted(articleId string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	kept := make([]entity.HomeArticleEntity, 0, len(r.rows))
	for _, h := range r.rows {
		if h.ArticleId != articleId {
			kept = append(kept, h)
		}
	}
	r.rows = kept
}

func (r *FakeHomeArticleRepository) GetAll(_ context.Context) ([]entity.HomeArticleEntity, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := append([]entity.HomeArticleEntity(nil), r.rows...)
	sort.SliceStable(out, func(i, j int) bool { return out[i].DisplayOrder < out[j].DisplayOrder })
	return out, nil
}

func (r *FakeHomeArticleRepository) Replace(_ context.Context, _ *pg.Tx, ents []entity.HomeArticleEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	seen := map[string]bool{}
	for _, e := range ents {
		if seen[e.ArticleId] {
			return errors.New("duplicate key value violates unique constraint \"home_article_pkey\"")
		}
		seen[e.ArticleId] = true
	}
	r.rows = append([]entity.HomeArticleEntity{}, ents...)
	return nil
}
