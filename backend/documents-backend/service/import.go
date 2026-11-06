package service

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/go-pg/pg/v10"
	"gopkg.in/yaml.v3"
)

const (
	ManifestFile = "articles.yaml"
	// ArticleFilesDir holds the files attached to articles: articles/<slug>/<path>.
	ArticleFilesDir = "articles"
)

// Manifest is the import/export layout: articles.yaml + Markdown files for generic articles + articles/<slug>/**.
type Manifest struct {
	Articles   []ManifestArticle    `yaml:"articles"`
	Navigation []ManifestNavSection `yaml:"navigation,omitempty"`
	// Home is the ordered list of generic article slugs shown on the home page; when the key is present the stored
	// list is replaced (an empty list clears it), when absent the list is left untouched.
	Home []string `yaml:"home,omitempty"`
}

type ManifestArticle struct {
	Slug         string   `yaml:"slug"`
	Title        string   `yaml:"title"`
	Subtitle     string   `yaml:"subtitle,omitempty"`
	Scope        string   `yaml:"scope"`
	Visibility   string   `yaml:"visibility,omitempty"`
	File         string   `yaml:"file,omitempty"` // generic only: Markdown body path relative to the manifest
	PackageId    string   `yaml:"packageId,omitempty"`
	Version      string   `yaml:"version,omitempty"`
	DocumentSlug string   `yaml:"documentSlug,omitempty"`
	Labels       []string `yaml:"labels,omitempty"`
	Order        int      `yaml:"order"`
	Published    *bool    `yaml:"published,omitempty"`
}

// ManifestNavSection is one navigation section; import replaces every section of each (scope, packageId) present.
type ManifestNavSection struct {
	Scope     string            `yaml:"scope"`
	PackageId string            `yaml:"packageId,omitempty"`
	Title     string            `yaml:"title"`
	Order     int               `yaml:"order"`
	Items     []ManifestNavItem `yaml:"items"`
}

type ManifestNavItem struct {
	Kind    string            `yaml:"kind"`              // guide | group
	Article string            `yaml:"article,omitempty"` // guide: article slug
	Title   string            `yaml:"title,omitempty"`   // group: title; guide: optional override
	Order   int               `yaml:"order"`
	Items   []ManifestNavItem `yaml:"items,omitempty"` // nested, max depth 3
}

type ImportOptions struct {
	// ValidatePackageRefs asks APIHUB (with the caller's credentials) whether package articles point at real
	// documents. The CLI import runs with it off because no credentials are available then.
	ValidatePackageRefs bool
	// Vars are expanded in manifest string fields as ${NAME}.
	Vars map[string]string
}

type ImportService interface {
	Import(ctx context.Context, content fs.FS, opts ImportOptions) (*view.ImportResult, error)
	ImportZip(ctx context.Context, data []byte, opts ImportOptions) (*view.ImportResult, error)
	ImportDir(ctx context.Context, dir string, opts ImportOptions) (*view.ImportResult, error)
}

func NewImportService(transactionRunner repository.TransactionRunner, articleRepository repository.ArticleRepository, articleFileRepository repository.ArticleFileRepository, fileDataRepository repository.FileDataRepository, navigationRepository repository.NavigationRepository, homeArticleRepository repository.HomeArticleRepository, articleService ArticleService, maxUploadSizeBytes int64) ImportService {
	return &importServiceImpl{
		transactionRunner:     transactionRunner,
		articleRepository:     articleRepository,
		articleFileRepository: articleFileRepository,
		fileDataRepository:    fileDataRepository,
		navigationRepository:  navigationRepository,
		homeArticleRepository: homeArticleRepository,
		articleService:        articleService,
		maxUploadSizeBytes:    maxUploadSizeBytes,
	}
}

type importServiceImpl struct {
	transactionRunner     repository.TransactionRunner
	articleRepository     repository.ArticleRepository
	articleFileRepository repository.ArticleFileRepository
	fileDataRepository    repository.FileDataRepository
	navigationRepository  repository.NavigationRepository
	homeArticleRepository repository.HomeArticleRepository
	articleService        ArticleService
	maxUploadSizeBytes    int64
}

// importedFile is one articles/<slug>/<path> entry; the article id is resolved once the articles are upserted.
type importedFile struct {
	slug    string
	meta    *entity.ArticleFileEntity
	content *entity.FileDataEntity
}

func importArchiveInvalid(format string, args ...interface{}) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.ImportArchiveInvalid,
		Message: exception.ImportArchiveInvalidMsg,
		Params:  map[string]interface{}{"reason": fmt.Sprintf(format, args...)},
	}
}

func (s importServiceImpl) ImportZip(ctx context.Context, data []byte, opts ImportOptions) (*view.ImportResult, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, importArchiveInvalid("archive is not a zip file: %v", err)
	}
	var content fs.FS = zr
	if root := detectArchiveRoot(zr); root != "" {
		if content, err = fs.Sub(zr, root); err != nil {
			return nil, importArchiveInvalid("archive layout: %v", err)
		}
	}
	return s.Import(ctx, content, opts)
}

// detectArchiveRoot tolerates archives whose entries live in a single top-level folder.
func detectArchiveRoot(zr *zip.Reader) string {
	for _, f := range zr.File {
		if f.Name == ManifestFile {
			return ""
		}
	}
	for _, f := range zr.File {
		if strings.HasSuffix(f.Name, "/"+ManifestFile) && strings.Count(f.Name, "/") == 1 {
			return strings.TrimSuffix(f.Name, "/"+ManifestFile)
		}
	}
	return ""
}

func (s importServiceImpl) ImportDir(ctx context.Context, dir string, opts ImportOptions) (*view.ImportResult, error) {
	return s.Import(ctx, os.DirFS(dir), opts)
}

func expandVars(value string, vars map[string]string) string {
	if len(vars) == 0 || !strings.Contains(value, "${") {
		return value
	}
	return os.Expand(value, func(name string) string {
		if v, ok := vars[name]; ok {
			return v
		}
		return "${" + name + "}"
	})
}

func (s importServiceImpl) Import(ctx context.Context, content fs.FS, opts ImportOptions) (*view.ImportResult, error) {
	raw, err := fs.ReadFile(content, ManifestFile)
	if err != nil {
		return nil, importArchiveInvalid("%s: %v", ManifestFile, err)
	}
	var manifest Manifest
	if err := yaml.Unmarshal(raw, &manifest); err != nil {
		return nil, importArchiveInvalid("%s: %v", ManifestFile, err)
	}
	userId := secctx.GetUserId(ctx)
	if userId == "" {
		userId = "import"
	}
	now := time.Now()

	// Build everything first so validation errors surface before the database is touched.
	articles := make([]*entity.ArticleEntity, 0, len(manifest.Articles))
	seen := map[string]bool{}
	for i, ma := range manifest.Articles {
		req := view.ArticleRequest{
			Slug: expandVars(ma.Slug, opts.Vars), Title: expandVars(ma.Title, opts.Vars), Subtitle: expandVars(ma.Subtitle, opts.Vars),
			Scope: ma.Scope, Visibility: ma.Visibility, PackageId: expandVars(ma.PackageId, opts.Vars),
			Version: expandVars(ma.Version, opts.Vars), DocumentSlug: expandVars(ma.DocumentSlug, opts.Vars),
			Labels: ma.Labels, DisplayOrder: ma.Order, Published: ma.Published == nil || *ma.Published,
		}
		if ma.Scope == view.ScopeGeneric {
			if ma.File == "" {
				return nil, importArchiveInvalid("articles[%d] %s: file is required for generic articles", i, ma.Slug)
			}
			body, err := fs.ReadFile(content, path.Clean(ma.File))
			if err != nil {
				return nil, importArchiveInvalid("articles[%d] %s: %v", i, ma.Slug, err)
			}
			b := string(body)
			req.BodyMd = &b
		}
		ent, err := MakeArticleEntity(req)
		if err != nil {
			return nil, importArchiveInvalid("articles[%d] %s: %v", i, ma.Slug, err)
		}
		if seen[ent.Slug] {
			return nil, importArchiveInvalid("articles[%d]: duplicate slug %s", i, ent.Slug)
		}
		seen[ent.Slug] = true
		if opts.ValidatePackageRefs {
			if err := s.articleService.ValidatePackageRef(ctx, ent); err != nil {
				var customError *exception.CustomError
				if errors.As(err, &customError) && customError.Status == http.StatusBadRequest {
					return nil, importArchiveInvalid("articles[%d] %s: %v", i, ent.Slug, err)
				}
				return nil, err
			}
		}
		ent.CreatedAt, ent.UpdatedAt, ent.CreatedBy, ent.UpdatedBy = now, now, userId, userId
		articles = append(articles, ent)
	}

	files, err := s.collectArticleFiles(content, seen, userId)
	if err != nil {
		return nil, err
	}

	// Navigation: resolve slugs against the manifest articles only; placement rules mirror the admin API.
	navSections, err := s.prepareNavigation(manifest.Navigation, articles, opts.Vars)
	if err != nil {
		return nil, err
	}

	homeSlugs, err := prepareHome(manifest.Home, articles, opts.Vars)
	if err != nil {
		return nil, err
	}

	result := &view.ImportResult{}
	err = s.transactionRunner.RunInTransaction(ctx, func(tx *pg.Tx) error {
		idBySlug := map[string]string{}
		for _, ent := range articles {
			ent.Id = utils.NewId()
			if _, err := s.articleRepository.UpsertArticleBySlug(ctx, tx, ent); err != nil {
				return fmt.Errorf("article %s: %w", ent.Slug, err)
			}
			idBySlug[ent.Slug] = ent.Id
			result.Articles++
		}
		replacedChecksums := make([]string, 0)
		for _, f := range files {
			articleId, known := idBySlug[f.slug]
			if !known {
				// Files of an article that is not in the manifest but already stored.
				existing, err := s.articleRepository.GetArticleBySlug(ctx, f.slug)
				if err != nil {
					return err
				}
				if existing == nil {
					return importArchiveInvalid("%s/%s/%s: article '%s' is neither in the manifest nor stored", ArticleFilesDir, f.slug, f.meta.Path, f.slug)
				}
				articleId = existing.Id
				idBySlug[f.slug] = articleId
			}
			f.meta.ArticleId = articleId
			previous, err := s.articleFileRepository.GetArticleFile(ctx, articleId, f.meta.Path)
			if err != nil {
				return err
			}
			if previous != nil && previous.Checksum != f.meta.Checksum {
				replacedChecksums = append(replacedChecksums, previous.Checksum)
			}
			if err := s.fileDataRepository.UpsertFileData(ctx, tx, f.content); err != nil {
				return fmt.Errorf("file %s/%s: %w", f.slug, f.meta.Path, err)
			}
			if err := s.articleFileRepository.UpsertArticleFile(ctx, tx, f.meta); err != nil {
				return fmt.Errorf("file %s/%s: %w", f.slug, f.meta.Path, err)
			}
			result.Files++
		}
		if err := s.fileDataRepository.DeleteOrphanFileData(ctx, tx, replacedChecksums); err != nil {
			return err
		}
		replaced := map[string]bool{}
		for _, ns := range navSections {
			key := ns.section.Scope + "|" + derefString(ns.section.PackageId)
			if !replaced[key] {
				if err := s.navigationRepository.DeleteSectionsByScope(ctx, tx, ns.section.Scope, derefString(ns.section.PackageId)); err != nil {
					return fmt.Errorf("navigation %s: %w", key, err)
				}
				replaced[key] = true
			}
			ns.section.Id = utils.NewId()
			ns.section.CreatedAt, ns.section.UpdatedAt, ns.section.CreatedBy, ns.section.UpdatedBy = now, now, userId, userId
			if err := s.navigationRepository.CreateSection(ctx, tx, ns.section); err != nil {
				return fmt.Errorf("navigation section %s: %w", ns.section.Title, err)
			}
			result.Sections++
			if err := s.insertNavItems(ctx, tx, ns.section.Id, "", ns.items, idBySlug, now, userId, result); err != nil {
				return err
			}
		}
		if homeSlugs != nil {
			home := make([]entity.HomeArticleEntity, 0, len(homeSlugs))
			for i, slug := range homeSlugs {
				home = append(home, entity.HomeArticleEntity{ArticleId: idBySlug[slug], DisplayOrder: i, CreatedAt: now, CreatedBy: userId})
			}
			if err := s.homeArticleRepository.Replace(ctx, tx, home); err != nil {
				return fmt.Errorf("home articles: %w", err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// collectArticleFiles reads articles/<slug>/<path> entries. Slugs are checked against the manifest first; unknown
// slugs are resolved against the database inside the import transaction.
func (s importServiceImpl) collectArticleFiles(content fs.FS, manifestSlugs map[string]bool, userId string) ([]importedFile, error) {
	files := make([]importedFile, 0)
	sub, err := fs.Sub(content, ArticleFilesDir)
	if err != nil {
		return files, nil
	}
	walkErr := fs.WalkDir(sub, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			if p == "." {
				return nil // no articles dir in this archive
			}
			return err
		}
		if d.IsDir() {
			return nil
		}
		slug, rel, found := strings.Cut(p, "/")
		if !found || rel == "" {
			return fmt.Errorf("%s/%s: files must be placed under %s/<slug>/", ArticleFilesDir, p, ArticleFilesDir)
		}
		if !manifestSlugs[slug] && !slugRegexp.MatchString(slug) {
			return fmt.Errorf("%s/%s: '%s' is not a valid article slug", ArticleFilesDir, p, slug)
		}
		data, err := fs.ReadFile(sub, p)
		if err != nil {
			return err
		}
		meta, fileContent, err := MakeArticleFileEntity("", rel, "", data, s.maxUploadSizeBytes, userId)
		if err != nil {
			return fmt.Errorf("%s/%s: %w", ArticleFilesDir, p, err)
		}
		files = append(files, importedFile{slug: slug, meta: meta, content: fileContent})
		return nil
	})
	if walkErr != nil {
		return nil, importArchiveInvalid("%v", walkErr)
	}
	return files, nil
}

// preparedNavSection is a validated manifest section whose guide items still reference articles by slug
// (ids exist only once the articles are upserted).
type preparedNavSection struct {
	section *entity.NavSectionEntity
	items   []preparedNavItem
}

type preparedNavItem struct {
	entity   entity.NavItemEntity
	article  string // slug, guide only
	children []preparedNavItem
}

func (s importServiceImpl) prepareNavigation(sections []ManifestNavSection, articles []*entity.ArticleEntity, vars map[string]string) ([]preparedNavSection, error) {
	bySlug := make(map[string]*entity.ArticleEntity, len(articles))
	for _, a := range articles {
		bySlug[a.Slug] = a
	}
	placed := map[string]bool{}
	out := make([]preparedNavSection, 0, len(sections))
	for i, ms := range sections {
		ent, err := makeNavSectionEntity(view.NavSectionRequest{Scope: ms.Scope, PackageId: expandVars(ms.PackageId, vars), Title: expandVars(ms.Title, vars), DisplayOrder: ms.Order})
		if err != nil {
			return nil, importArchiveInvalid("navigation[%d]: %v", i, err)
		}
		items, err := prepareNavItems(fmt.Sprintf("navigation[%d]", i), ms.Items, 1, ent, bySlug, placed, vars)
		if err != nil {
			return nil, err
		}
		out = append(out, preparedNavSection{section: ent, items: items})
	}
	return out, nil
}

func prepareNavItems(where string, items []ManifestNavItem, depth int, section *entity.NavSectionEntity, bySlug map[string]*entity.ArticleEntity, placed map[string]bool, vars map[string]string) ([]preparedNavItem, error) {
	if len(items) > 0 && depth > view.NavMaxDepth {
		return nil, importArchiveInvalid("%s: navigation depth must not exceed %d", where, view.NavMaxDepth)
	}
	out := make([]preparedNavItem, 0, len(items))
	for i, mi := range items {
		at := fmt.Sprintf("%s.items[%d]", where, i)
		if !view.ValidNavKind(mi.Kind) {
			return nil, importArchiveInvalid("%s: kind must be one of: guide, group", at)
		}
		title := strings.TrimSpace(expandVars(mi.Title, vars))
		item := preparedNavItem{entity: entity.NavItemEntity{Kind: mi.Kind, Title: strPtr(title), DisplayOrder: mi.Order}}
		switch mi.Kind {
		case view.NavKindGuide:
			slug := expandVars(mi.Article, vars)
			if slug == "" {
				return nil, importArchiveInvalid("%s: article is required for guide items", at)
			}
			article, ok := bySlug[slug]
			if !ok {
				return nil, importArchiveInvalid("%s: article '%s' is not in the manifest", at, slug)
			}
			if article.Scope != section.Scope || derefString(article.PackageId) != derefString(section.PackageId) {
				return nil, importArchiveInvalid("%s: article '%s' scope and packageId must match the section", at, slug)
			}
			if placed[slug] {
				return nil, importArchiveInvalid("%s: article '%s' is placed more than once", at, slug)
			}
			if len(mi.Items) > 0 {
				return nil, importArchiveInvalid("%s: a guide item cannot have children", at)
			}
			placed[slug] = true
			item.article = slug
		case view.NavKindGroup:
			if title == "" {
				return nil, importArchiveInvalid("%s: title is required for group items", at)
			}
			if mi.Article != "" {
				return nil, importArchiveInvalid("%s: article is not allowed for group items", at)
			}
		}
		children, err := prepareNavItems(at, mi.Items, depth+1, section, bySlug, placed, vars)
		if err != nil {
			return nil, err
		}
		item.children = children
		out = append(out, item)
	}
	return out, nil
}

func (s importServiceImpl) insertNavItems(ctx context.Context, tx *pg.Tx, sectionId, parentId string, items []preparedNavItem, idBySlug map[string]string, now time.Time, userId string, result *view.ImportResult) error {
	for _, it := range items {
		ent := it.entity
		ent.Id = utils.NewId()
		ent.SectionId = sectionId
		ent.ParentId = strPtr(parentId)
		if it.article != "" {
			id := idBySlug[it.article]
			ent.ArticleId = &id
		}
		ent.CreatedAt, ent.UpdatedAt, ent.CreatedBy, ent.UpdatedBy = now, now, userId, userId
		if err := s.navigationRepository.CreateItem(ctx, tx, &ent); err != nil {
			return fmt.Errorf("navigation item %s: %w", derefString(ent.Title)+it.article, err)
		}
		result.Items++
		if err := s.insertNavItems(ctx, tx, sectionId, ent.Id, it.children, idBySlug, now, userId, result); err != nil {
			return err
		}
	}
	return nil
}

// prepareHome validates the home list against the manifest articles: every slug must be a generic article of the
// manifest and appear once. nil means "key absent, keep the stored list"; an empty non-nil slice clears it.
func prepareHome(home []string, articles []*entity.ArticleEntity, vars map[string]string) ([]string, error) {
	if home == nil {
		return nil, nil
	}
	bySlug := make(map[string]*entity.ArticleEntity, len(articles))
	for _, a := range articles {
		bySlug[a.Slug] = a
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(home))
	for i, raw := range home {
		slug := expandVars(raw, vars)
		article, ok := bySlug[slug]
		if !ok {
			return nil, importArchiveInvalid("home[%d]: article '%s' is not in the manifest", i, slug)
		}
		if article.Scope != view.ScopeGeneric {
			return nil, importArchiveInvalid("home[%d]: article '%s' is not a generic article", i, slug)
		}
		if seen[slug] {
			return nil, importArchiveInvalid("home[%d]: article '%s' is listed more than once", i, slug)
		}
		seen[slug] = true
		out = append(out, slug)
	}
	return out, nil
}
