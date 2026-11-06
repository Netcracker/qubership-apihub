package service

import (
	"context"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// NavigationService serves the guides navigation tree. The public tree is filtered by exactly the article
// visibility rules of ArticleService (VisibleArticlesQuery); the admin tree shows everything.
type NavigationService interface {
	GetNavigation(ctx context.Context, scope, packageId, version string) (*view.Navigation, error)

	GetAdminNavigation(ctx context.Context, scope, packageId string) (*view.Navigation, error)
	CreateSection(ctx context.Context, req view.NavSectionRequest) (*view.NavSection, error)
	UpdateSection(ctx context.Context, id string, req view.NavSectionRequest) (*view.NavSection, error)
	DeleteSection(ctx context.Context, id string) error
	CreateItem(ctx context.Context, req view.NavItemRequest) (*view.NavItem, error)
	UpdateItem(ctx context.Context, id string, req view.NavItemRequest) (*view.NavItem, error)
	DeleteItem(ctx context.Context, id string) error
}

func NewNavigationService(navigationRepository repository.NavigationRepository, articleRepository repository.ArticleRepository, articleService ArticleService) NavigationService {
	return &navigationServiceImpl{navigationRepository: navigationRepository, articleRepository: articleRepository, articleService: articleService}
}

type navigationServiceImpl struct {
	navigationRepository repository.NavigationRepository
	articleRepository    repository.ArticleRepository
	articleService       ArticleService
}

func navigationValidationFailed(reason string) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.NavigationValidationFailed,
		Message: exception.NavigationValidationFailedMsg,
		Params:  map[string]interface{}{"reason": reason},
	}
}

func navSectionNotFound(id string) error {
	return &exception.CustomError{Status: http.StatusNotFound, Code: exception.NavSectionNotFound, Message: exception.NavSectionNotFoundMsg, Params: map[string]interface{}{"id": id}}
}

func navItemNotFound(id string) error {
	return &exception.CustomError{Status: http.StatusNotFound, Code: exception.NavItemNotFound, Message: exception.NavItemNotFoundMsg, Params: map[string]interface{}{"id": id}}
}

func articleAlreadyInNavigation(articleId, itemId string) error {
	return &exception.CustomError{
		Status:  http.StatusConflict,
		Code:    exception.ArticleAlreadyInNavigation,
		Message: exception.ArticleAlreadyInNavigationMsg,
		Params:  map[string]interface{}{"articleId": articleId, "itemId": itemId},
	}
}

func validateScopeParams(scope, packageId string) error {
	if scope == "" {
		return &exception.CustomError{Status: http.StatusBadRequest, Code: exception.RequiredParamsMissing, Message: exception.RequiredParamsMissingMsg, Params: map[string]interface{}{"params": "scope"}}
	}
	if !view.ValidScope(scope) {
		return invalidParameter("scope", "must be one of: generic, package")
	}
	if scope == view.ScopeGeneric && packageId != "" {
		return invalidParameter("packageId", "is not allowed for generic scope")
	}
	if scope == view.ScopePackage && packageId == "" {
		return &exception.CustomError{Status: http.StatusBadRequest, Code: exception.RequiredParamsMissing, Message: exception.RequiredParamsMissingMsg, Params: map[string]interface{}{"params": "packageId"}}
	}
	return nil
}

// ---- tree building ----

// navTree is the in-memory shape used while assembling a section: items grouped by parent.
type navTree struct {
	byParent map[string][]entity.NavItemEntity // "" = top level
	articles map[string]*entity.ArticleEntity
}

func newNavTree(items []entity.NavItemEntity, articles map[string]*entity.ArticleEntity) navTree {
	t := navTree{byParent: map[string][]entity.NavItemEntity{}, articles: articles}
	for _, it := range items {
		parent := ""
		if it.ParentId != nil {
			parent = *it.ParentId
		}
		t.byParent[parent] = append(t.byParent[parent], it)
	}
	return t
}

func (t navTree) articleOf(it entity.NavItemEntity) *entity.ArticleEntity {
	if it.ArticleId == nil {
		return nil
	}
	return t.articles[*it.ArticleId]
}

// build returns the children of parentId. When visible is non-nil (public tree), guide items whose article is
// not visible and groups left without children are dropped.
func (t navTree) build(sectionId, parentId string, visible map[string]bool, admin bool) []view.NavItem {
	out := make([]view.NavItem, 0)
	for _, it := range t.byParent[parentId] {
		if it.SectionId != sectionId {
			continue
		}
		article := t.articleOf(it)
		if visible != nil && it.Kind == view.NavKindGuide && (it.ArticleId == nil || !visible[*it.ArticleId]) {
			continue
		}
		v := entity.MakeNavItemView(it, article, admin)
		v.Children = t.build(sectionId, it.Id, visible, admin)
		if visible != nil && it.Kind == view.NavKindGroup && len(v.Children) == 0 {
			continue
		}
		out = append(out, v)
	}
	sortNavItems(out)
	return out
}

func sortNavItems(items []view.NavItem) {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].DisplayOrder != items[j].DisplayOrder {
			return items[i].DisplayOrder < items[j].DisplayOrder
		}
		return strings.Compare(items[i].Title, items[j].Title) < 0
	})
}

func sortNavSections(sections []view.NavSection) {
	sort.SliceStable(sections, func(i, j int) bool {
		if sections[i].DisplayOrder != sections[j].DisplayOrder {
			return sections[i].DisplayOrder < sections[j].DisplayOrder
		}
		return strings.Compare(sections[i].Title, sections[j].Title) < 0
	})
}

func collectArticleIds(items []view.NavItem, into map[string]bool) {
	for _, it := range items {
		if it.Kind == view.NavKindGuide && it.ArticleId != "" {
			into[it.ArticleId] = true
		}
		collectArticleIds(it.Children, into)
	}
}

func (s navigationServiceImpl) loadSections(ctx context.Context, scope, packageId string) ([]entity.NavSectionEntity, []entity.NavItemEntity, error) {
	sections, err := s.navigationRepository.GetSections(ctx, scope, packageId)
	if err != nil {
		return nil, nil, err
	}
	ids := make([]string, 0, len(sections))
	for _, sec := range sections {
		ids = append(ids, sec.Id)
	}
	items, err := s.navigationRepository.GetItemsBySections(ctx, ids)
	if err != nil {
		return nil, nil, err
	}
	return sections, items, nil
}

func (s navigationServiceImpl) GetNavigation(ctx context.Context, scope, packageId, version string) (*view.Navigation, error) {
	if scope == "" {
		return nil, &exception.CustomError{Status: http.StatusBadRequest, Code: exception.RequiredParamsMissing, Message: exception.RequiredParamsMissingMsg, Params: map[string]interface{}{"params": "scope"}}
	}
	if scope == view.ScopeGeneric && packageId != "" {
		return nil, invalidParameter("packageId", "is not allowed for generic scope")
	}
	query, err := s.articleService.VisibleArticlesQuery(ctx, scope, "", packageId, version)
	if err != nil {
		return nil, err
	}
	visibleArticles, err := s.articleRepository.GetArticles(ctx, query)
	if err != nil {
		return nil, err
	}
	visible := make(map[string]bool, len(visibleArticles))
	articles := make(map[string]*entity.ArticleEntity, len(visibleArticles))
	for i := range visibleArticles {
		visible[visibleArticles[i].Id] = true
		articles[visibleArticles[i].Id] = &visibleArticles[i]
	}
	sections, items, err := s.loadSections(ctx, scope, packageId)
	if err != nil {
		return nil, err
	}
	// Public tree: guide items are internally tracked by article id to compute the synthetic section; strip after.
	tree := newNavTree(items, articles)
	placed := map[string]bool{}
	result := make([]view.NavSection, 0, len(sections)+1)
	maxOrder := 0
	for _, sec := range sections {
		if sec.DisplayOrder > maxOrder {
			maxOrder = sec.DisplayOrder
		}
		v := entity.MakeNavSectionView(sec, false)
		v.Items = tree.build(sec.Id, "", visible, true)
		if len(v.Items) == 0 {
			continue
		}
		collectArticleIds(v.Items, placed)
		v.Items = stripAdminFields(v.Items, version)
		result = append(result, v)
	}
	sortNavSections(result)
	other := view.NavSection{Id: "", Scope: scope, PackageId: packageId, Title: view.NavSyntheticTitle, DisplayOrder: maxOrder + 1, Synthetic: true, Items: []view.NavItem{}}
	for _, a := range visibleArticles {
		if placed[a.Id] {
			continue
		}
		item := entity.MakeNavItemView(entity.NavItemEntity{Kind: view.NavKindGuide, DisplayOrder: a.DisplayOrder}, articleFromList(articles, a.Id), false)
		if item.Version == "" && scope == view.ScopePackage {
			item.Version = version
		}
		other.Items = append(other.Items, item)
	}
	if len(other.Items) > 0 {
		result = append(result, other)
	}
	return &view.Navigation{Sections: result}, nil
}

func articleFromList(m map[string]*entity.ArticleEntity, id string) *entity.ArticleEntity {
	return m[id]
}

// stripAdminFields removes admin-only fields from a public tree and fills the effective version of package guides.
func stripAdminFields(items []view.NavItem, version string) []view.NavItem {
	for i := range items {
		items[i].ArticleId, items[i].TitleOverride, items[i].Published, items[i].Dangling = "", "", nil, false
		if items[i].Kind == view.NavKindGuide && items[i].Version == "" && items[i].PackageId != "" {
			items[i].Version = version
		}
		items[i].Children = stripAdminFields(items[i].Children, version)
	}
	return items
}

func (s navigationServiceImpl) GetAdminNavigation(ctx context.Context, scope, packageId string) (*view.Navigation, error) {
	if err := validateScopeParams(scope, packageId); err != nil {
		return nil, err
	}
	sections, items, err := s.loadSections(ctx, scope, packageId)
	if err != nil {
		return nil, err
	}
	articles, err := s.articlesOf(ctx, scope, packageId)
	if err != nil {
		return nil, err
	}
	tree := newNavTree(items, articles)
	result := make([]view.NavSection, 0, len(sections))
	for _, sec := range sections {
		v := entity.MakeNavSectionView(sec, true)
		v.Items = tree.build(sec.Id, "", nil, true)
		result = append(result, v)
	}
	sortNavSections(result)
	return &view.Navigation{Sections: result}, nil
}

// articlesOf loads every article of the scope (published or not) keyed by id.
func (s navigationServiceImpl) articlesOf(ctx context.Context, scope, packageId string) (map[string]*entity.ArticleEntity, error) {
	ents, err := s.articleRepository.GetArticles(ctx, repository.ArticleSearchQuery{Scope: scope, PackageId: packageId})
	if err != nil {
		return nil, err
	}
	out := make(map[string]*entity.ArticleEntity, len(ents))
	for i := range ents {
		out[ents[i].Id] = &ents[i]
	}
	return out, nil
}

// ---- sections ----

func makeNavSectionEntity(req view.NavSectionRequest) (*entity.NavSectionEntity, error) {
	req.Title = strings.TrimSpace(req.Title)
	if !view.ValidScope(req.Scope) {
		return nil, navigationValidationFailed("scope must be one of: generic, package")
	}
	if req.Scope == view.ScopeGeneric && req.PackageId != "" {
		return nil, navigationValidationFailed("packageId is not allowed for generic scope")
	}
	if req.Scope == view.ScopePackage && req.PackageId == "" {
		return nil, navigationValidationFailed("packageId is required for package scope")
	}
	if req.Title == "" {
		return nil, navigationValidationFailed("title is required")
	}
	return &entity.NavSectionEntity{Scope: req.Scope, PackageId: strPtr(req.PackageId), Title: req.Title, DisplayOrder: req.DisplayOrder}, nil
}

func (s navigationServiceImpl) CreateSection(ctx context.Context, req view.NavSectionRequest) (*view.NavSection, error) {
	ent, err := makeNavSectionEntity(req)
	if err != nil {
		return nil, err
	}
	now, userId := time.Now(), secctx.GetUserId(ctx)
	ent.Id = utils.NewId()
	ent.CreatedAt, ent.UpdatedAt, ent.CreatedBy, ent.UpdatedBy = now, now, userId, userId
	if err := s.navigationRepository.CreateSection(ctx, nil, ent); err != nil {
		return nil, err
	}
	v := entity.MakeNavSectionView(*ent, true)
	return &v, nil
}

func (s navigationServiceImpl) UpdateSection(ctx context.Context, id string, req view.NavSectionRequest) (*view.NavSection, error) {
	existing, err := s.navigationRepository.GetSection(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, navSectionNotFound(id)
	}
	ent, err := makeNavSectionEntity(req)
	if err != nil {
		return nil, err
	}
	if ent.Scope != existing.Scope || derefString(ent.PackageId) != derefString(existing.PackageId) {
		count, err := s.navigationRepository.CountItemsInSection(ctx, id)
		if err != nil {
			return nil, err
		}
		if count > 0 {
			return nil, navigationValidationFailed("scope and packageId of a section with items cannot be changed")
		}
	}
	ent.Id, ent.CreatedAt, ent.CreatedBy = existing.Id, existing.CreatedAt, existing.CreatedBy
	ent.UpdatedAt, ent.UpdatedBy = time.Now(), secctx.GetUserId(ctx)
	if err := s.navigationRepository.UpdateSection(ctx, ent); err != nil {
		return nil, err
	}
	items, err := s.navigationRepository.GetItemsBySections(ctx, []string{id})
	if err != nil {
		return nil, err
	}
	articles, err := s.articlesOf(ctx, ent.Scope, derefString(ent.PackageId))
	if err != nil {
		return nil, err
	}
	v := entity.MakeNavSectionView(*ent, true)
	v.Items = newNavTree(items, articles).build(id, "", nil, true)
	return &v, nil
}

func (s navigationServiceImpl) DeleteSection(ctx context.Context, id string) error {
	deleted, err := s.navigationRepository.DeleteSection(ctx, id)
	if err != nil {
		return err
	}
	if !deleted {
		return navSectionNotFound(id)
	}
	return nil
}

// ---- items ----

// validateItem checks the request against the section and its current items. existing is nil on create.
func (s navigationServiceImpl) validateItem(ctx context.Context, req view.NavItemRequest, existing *entity.NavItemEntity) (*entity.NavItemEntity, *entity.ArticleEntity, error) {
	req.Title = strings.TrimSpace(req.Title)
	if !view.ValidNavKind(req.Kind) {
		return nil, nil, navigationValidationFailed("kind must be one of: guide, group")
	}
	if req.SectionId == "" {
		return nil, nil, navigationValidationFailed("sectionId is required")
	}
	section, err := s.navigationRepository.GetSection(ctx, req.SectionId)
	if err != nil {
		return nil, nil, err
	}
	if section == nil {
		return nil, nil, navigationValidationFailed("section '" + req.SectionId + "' not found")
	}
	ent := &entity.NavItemEntity{SectionId: section.Id, Kind: req.Kind, Title: strPtr(req.Title), ParentId: strPtr(req.ParentId), DisplayOrder: req.DisplayOrder}
	var article *entity.ArticleEntity
	switch req.Kind {
	case view.NavKindGuide:
		if req.ArticleId == "" {
			return nil, nil, navigationValidationFailed("articleId is required for guide items")
		}
		article, err = s.articleRepository.GetArticleById(ctx, req.ArticleId)
		if err != nil {
			return nil, nil, err
		}
		if article == nil {
			return nil, nil, navigationValidationFailed("article '" + req.ArticleId + "' not found")
		}
		if article.Scope != section.Scope || derefString(article.PackageId) != derefString(section.PackageId) {
			return nil, nil, navigationValidationFailed("article scope and packageId must match the section")
		}
		placed, err := s.navigationRepository.GetItemByArticle(ctx, req.ArticleId)
		if err != nil {
			return nil, nil, err
		}
		if placed != nil && (existing == nil || placed.Id != existing.Id) {
			return nil, nil, articleAlreadyInNavigation(req.ArticleId, placed.Id)
		}
		ent.ArticleId = strPtr(req.ArticleId)
	case view.NavKindGroup:
		if req.Title == "" {
			return nil, nil, navigationValidationFailed("title is required for group items")
		}
		if req.ArticleId != "" {
			return nil, nil, navigationValidationFailed("articleId is not allowed for group items")
		}
	}
	// Placement: parent in the same section, no cycles, resulting depth within the limit.
	items, err := s.navigationRepository.GetItemsBySections(ctx, []string{section.Id})
	if err != nil {
		return nil, nil, err
	}
	byId := make(map[string]entity.NavItemEntity, len(items))
	for _, it := range items {
		byId[it.Id] = it
	}
	parentDepth := 0
	if req.ParentId != "" {
		parent, ok := byId[req.ParentId]
		if !ok {
			return nil, nil, navigationValidationFailed("parent '" + req.ParentId + "' not found in section '" + section.Id + "'")
		}
		if parent.Kind != view.NavKindGroup {
			return nil, nil, navigationValidationFailed("parent must be a group item")
		}
		// Walk up from the parent; meeting the item itself means a cycle.
		for cur, ok := parent, true; ok; cur, ok = byId[derefString(cur.ParentId)] {
			if existing != nil && cur.Id == existing.Id {
				return nil, nil, navigationValidationFailed("an item cannot be moved under itself or its descendants")
			}
			parentDepth++
			if cur.ParentId == nil {
				break
			}
		}
	}
	height := 1
	if existing != nil {
		height = subtreeHeight(existing.Id, items)
		if req.Kind == view.NavKindGuide && height > 1 {
			return nil, nil, navigationValidationFailed("a guide item cannot have children")
		}
	}
	if parentDepth+height > view.NavMaxDepth {
		return nil, nil, navigationValidationFailed("navigation depth must not exceed 3")
	}
	return ent, article, nil
}

// subtreeHeight is the number of levels occupied by the item and its descendants (1 = leaf).
func subtreeHeight(id string, items []entity.NavItemEntity) int {
	h := 1
	for _, it := range items {
		if it.ParentId != nil && *it.ParentId == id {
			if c := 1 + subtreeHeight(it.Id, items); c > h {
				h = c
			}
		}
	}
	return h
}

func (s navigationServiceImpl) CreateItem(ctx context.Context, req view.NavItemRequest) (*view.NavItem, error) {
	ent, article, err := s.validateItem(ctx, req, nil)
	if err != nil {
		return nil, err
	}
	now, userId := time.Now(), secctx.GetUserId(ctx)
	ent.Id = utils.NewId()
	ent.CreatedAt, ent.UpdatedAt, ent.CreatedBy, ent.UpdatedBy = now, now, userId, userId
	if err := s.navigationRepository.CreateItem(ctx, nil, ent); err != nil {
		return nil, err
	}
	v := entity.MakeNavItemView(*ent, article, true)
	return &v, nil
}

func (s navigationServiceImpl) UpdateItem(ctx context.Context, id string, req view.NavItemRequest) (*view.NavItem, error) {
	existing, err := s.navigationRepository.GetItem(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, navItemNotFound(id)
	}
	if req.SectionId != "" && req.SectionId != existing.SectionId {
		return nil, navigationValidationFailed("an item cannot be moved to another section")
	}
	req.SectionId = existing.SectionId
	ent, article, err := s.validateItem(ctx, req, existing)
	if err != nil {
		return nil, err
	}
	ent.Id, ent.CreatedAt, ent.CreatedBy = existing.Id, existing.CreatedAt, existing.CreatedBy
	ent.UpdatedAt, ent.UpdatedBy = time.Now(), secctx.GetUserId(ctx)
	if err := s.navigationRepository.UpdateItem(ctx, ent); err != nil {
		return nil, err
	}
	items, err := s.navigationRepository.GetItemsBySections(ctx, []string{ent.SectionId})
	if err != nil {
		return nil, err
	}
	articles := map[string]*entity.ArticleEntity{}
	if article != nil {
		articles[article.Id] = article
	}
	for _, it := range items {
		if it.ArticleId != nil && articles[*it.ArticleId] == nil {
			if a, err := s.articleRepository.GetArticleById(ctx, *it.ArticleId); err != nil {
				return nil, err
			} else if a != nil {
				articles[a.Id] = a
			}
		}
	}
	v := entity.MakeNavItemView(*ent, article, true)
	v.Children = newNavTree(items, articles).build(ent.SectionId, ent.Id, nil, true)
	return &v, nil
}

func (s navigationServiceImpl) DeleteItem(ctx context.Context, id string) error {
	deleted, err := s.navigationRepository.DeleteItem(ctx, id)
	if err != nil {
		return err
	}
	if !deleted {
		return navItemNotFound(id)
	}
	return nil
}
