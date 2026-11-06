package service

import (
	"archive/zip"
	"bytes"
	"context"
	"io"
	"path"
	"sort"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"gopkg.in/yaml.v3"
)

type ExportService interface {
	// Export writes a zip with articles.yaml, one .md per generic article and articles/<slug>/** to w.
	Export(ctx context.Context, w io.Writer) error
}

func NewExportService(articleRepository repository.ArticleRepository, articleFileRepository repository.ArticleFileRepository, fileDataRepository repository.FileDataRepository, navigationRepository repository.NavigationRepository, homeArticleRepository repository.HomeArticleRepository) ExportService {
	return &exportServiceImpl{articleRepository: articleRepository, articleFileRepository: articleFileRepository, fileDataRepository: fileDataRepository, navigationRepository: navigationRepository, homeArticleRepository: homeArticleRepository}
}

type exportServiceImpl struct {
	articleRepository     repository.ArticleRepository
	articleFileRepository repository.ArticleFileRepository
	fileDataRepository    repository.FileDataRepository
	navigationRepository  repository.NavigationRepository
	homeArticleRepository repository.HomeArticleRepository
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func (s exportServiceImpl) Export(ctx context.Context, w io.Writer) error {
	articles, err := s.articleRepository.GetArticles(ctx, repository.ArticleSearchQuery{})
	if err != nil {
		return err
	}
	ids := make([]string, 0, len(articles))
	for _, ent := range articles {
		ids = append(ids, ent.Id)
	}
	filesByArticle, err := s.articleFileRepository.GetArticleFiles(ctx, ids)
	if err != nil {
		return err
	}
	zw := zip.NewWriter(w)
	manifest := Manifest{Articles: make([]ManifestArticle, 0, len(articles))}
	contents := map[string][]byte{} // checksum -> bytes, loaded once per distinct content
	for _, ent := range articles {
		published := ent.Published
		ma := ManifestArticle{
			Slug: ent.Slug, Title: ent.Title, Subtitle: ent.Subtitle, Scope: ent.Scope, Labels: ent.Labels, Order: ent.DisplayOrder, Published: &published,
		}
		if ent.Scope == view.ScopeGeneric {
			ma.Visibility = derefString(ent.Visibility)
			ma.File = ent.Slug + ".md"
			if err := writeZipEntry(zw, ma.File, []byte(derefString(ent.BodyMd))); err != nil {
				return err
			}
		} else {
			ma.PackageId, ma.Version, ma.DocumentSlug = derefString(ent.PackageId), derefString(ent.Version), derefString(ent.DocumentSlug)
		}
		manifest.Articles = append(manifest.Articles, ma)
		for _, file := range filesByArticle[ent.Id] {
			data, loaded := contents[file.Checksum]
			if !loaded {
				content, err := s.fileDataRepository.GetFileData(ctx, file.Checksum)
				if err != nil {
					return err
				}
				if content == nil {
					continue
				}
				data = content.Data
				contents[file.Checksum] = data
			}
			if err := writeZipEntry(zw, path.Join(ArticleFilesDir, ent.Slug, file.Path), data); err != nil {
				return err
			}
		}
	}
	navigation, err := s.exportNavigation(ctx, articles)
	if err != nil {
		return err
	}
	manifest.Navigation = navigation
	home, err := s.exportHome(ctx, articles)
	if err != nil {
		return err
	}
	manifest.Home = home
	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	if err := enc.Encode(&manifest); err != nil {
		return err
	}
	_ = enc.Close()
	if err := writeZipEntry(zw, ManifestFile, buf.Bytes()); err != nil {
		return err
	}
	return zw.Close()
}

func writeZipEntry(zw *zip.Writer, name string, data []byte) error {
	f, err := zw.CreateHeader(&zip.FileHeader{Name: name, Method: zip.Deflate, Modified: time.Unix(0, 0)})
	if err != nil {
		return err
	}
	_, err = f.Write(data)
	return err
}

// exportNavigation emits every section with its item tree; guide items reference articles by slug. Items whose
// article row is gone are skipped.
func (s exportServiceImpl) exportNavigation(ctx context.Context, articles []entity.ArticleEntity) ([]ManifestNavSection, error) {
	sections, err := s.navigationRepository.GetAllSections(ctx)
	if err != nil {
		return nil, err
	}
	if len(sections) == 0 {
		return nil, nil
	}
	ids := make([]string, 0, len(sections))
	for _, sec := range sections {
		ids = append(ids, sec.Id)
	}
	items, err := s.navigationRepository.GetItemsBySections(ctx, ids)
	if err != nil {
		return nil, err
	}
	slugById := make(map[string]string, len(articles))
	for _, a := range articles {
		slugById[a.Id] = a.Slug
	}
	byParent := map[string][]entity.NavItemEntity{}
	for _, it := range items {
		byParent[it.SectionId+"|"+derefString(it.ParentId)] = append(byParent[it.SectionId+"|"+derefString(it.ParentId)], it)
	}
	var build func(sectionId, parentId string) []ManifestNavItem
	build = func(sectionId, parentId string) []ManifestNavItem {
		rows := byParent[sectionId+"|"+parentId]
		out := make([]ManifestNavItem, 0, len(rows))
		for _, it := range rows {
			mi := ManifestNavItem{Kind: it.Kind, Title: derefString(it.Title), Order: it.DisplayOrder}
			if it.Kind == view.NavKindGuide {
				slug, ok := slugById[derefString(it.ArticleId)]
				if !ok {
					continue
				}
				mi.Article = slug
			}
			mi.Items = build(sectionId, it.Id)
			out = append(out, mi)
		}
		sort.SliceStable(out, func(i, j int) bool {
			if out[i].Order != out[j].Order {
				return out[i].Order < out[j].Order
			}
			return strings.Compare(out[i].Title+out[i].Article, out[j].Title+out[j].Article) < 0
		})
		return out
	}
	out := make([]ManifestNavSection, 0, len(sections))
	for _, sec := range sections {
		out = append(out, ManifestNavSection{Scope: sec.Scope, PackageId: derefString(sec.PackageId), Title: sec.Title, Order: sec.DisplayOrder, Items: build(sec.Id, "")})
	}
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.Scope != b.Scope {
			return a.Scope < b.Scope
		}
		if a.PackageId != b.PackageId {
			return a.PackageId < b.PackageId
		}
		if a.Order != b.Order {
			return a.Order < b.Order
		}
		return a.Title < b.Title
	})
	return out, nil
}

// exportHome emits the home page list as article slugs in display order; positions whose article row is gone are
// skipped. An empty list is omitted from the manifest (nil), so import leaves the list untouched.
func (s exportServiceImpl) exportHome(ctx context.Context, articles []entity.ArticleEntity) ([]string, error) {
	list, err := s.homeArticleRepository.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, nil
	}
	slugById := make(map[string]string, len(articles))
	for _, a := range articles {
		slugById[a.Id] = a.Slug
	}
	out := make([]string, 0, len(list))
	for _, h := range list {
		if slug, ok := slugById[h.ArticleId]; ok {
			out = append(out, slug)
		}
	}
	if len(out) == 0 {
		return nil, nil
	}
	return out, nil
}
