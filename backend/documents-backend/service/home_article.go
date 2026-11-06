package service

import (
	"context"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/go-pg/pg/v10"
)

// HomeArticleService manages the admin-curated ordered list of generic articles shown on the home page. The public
// list is filtered by exactly the article visibility rules of ArticleService (VisibleArticlesQuery).
type HomeArticleService interface {
	GetHomeArticles(ctx context.Context) (*view.HomeArticles, error)

	GetAdminHomeArticles(ctx context.Context) (*view.AdminHomeArticles, error)
	SetHomeArticles(ctx context.Context, req view.HomeArticlesRequest) (*view.AdminHomeArticles, error)
}

func NewHomeArticleService(transactionRunner repository.TransactionRunner, homeArticleRepository repository.HomeArticleRepository, articleRepository repository.ArticleRepository, articleService ArticleService) HomeArticleService {
	return &homeArticleServiceImpl{transactionRunner: transactionRunner, homeArticleRepository: homeArticleRepository, articleRepository: articleRepository, articleService: articleService}
}

type homeArticleServiceImpl struct {
	transactionRunner     repository.TransactionRunner
	homeArticleRepository repository.HomeArticleRepository
	articleRepository     repository.ArticleRepository
	articleService        ArticleService
}

func homeArticleNotGeneric(articleId string) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.HomeArticleNotGeneric,
		Message: exception.HomeArticleNotGenericMsg,
		Params:  map[string]interface{}{"articleId": articleId},
	}
}

func homeArticleDuplicate(articleId string) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.HomeArticleDuplicate,
		Message: exception.HomeArticleDuplicateMsg,
		Params:  map[string]interface{}{"articleId": articleId},
	}
}

func (s homeArticleServiceImpl) GetHomeArticles(ctx context.Context) (*view.HomeArticles, error) {
	list, err := s.homeArticleRepository.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	out := &view.HomeArticles{Articles: []view.Article{}}
	if len(list) == 0 {
		return out, nil
	}
	query, err := s.articleService.VisibleArticlesQuery(ctx, view.ScopeGeneric, "", "", "")
	if err != nil {
		return nil, err
	}
	visibleArticles, err := s.articleRepository.GetArticles(ctx, query)
	if err != nil {
		return nil, err
	}
	visible := make(map[string]*entity.ArticleEntity, len(visibleArticles))
	for i := range visibleArticles {
		visible[visibleArticles[i].Id] = &visibleArticles[i]
	}
	for _, h := range list {
		if ent, ok := visible[h.ArticleId]; ok {
			out.Articles = append(out.Articles, entity.MakeArticleView(*ent, false, false))
		}
	}
	return out, nil
}

func (s homeArticleServiceImpl) GetAdminHomeArticles(ctx context.Context) (*view.AdminHomeArticles, error) {
	list, err := s.homeArticleRepository.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	return s.adminView(ctx, list)
}

// adminView joins the list with article rows; positions whose article row is gone are skipped.
func (s homeArticleServiceImpl) adminView(ctx context.Context, list []entity.HomeArticleEntity) (*view.AdminHomeArticles, error) {
	out := &view.AdminHomeArticles{Articles: []view.AdminHomeArticle{}}
	if len(list) == 0 {
		return out, nil
	}
	articles, err := s.articleRepository.GetArticles(ctx, repository.ArticleSearchQuery{Scope: view.ScopeGeneric})
	if err != nil {
		return nil, err
	}
	byId := make(map[string]*entity.ArticleEntity, len(articles))
	for i := range articles {
		byId[articles[i].Id] = &articles[i]
	}
	for _, h := range list {
		ent, ok := byId[h.ArticleId]
		if !ok {
			continue
		}
		out.Articles = append(out.Articles, view.AdminHomeArticle{ArticleId: ent.Id, Slug: ent.Slug, Title: ent.Title, Published: ent.Published, DisplayOrder: h.DisplayOrder})
	}
	return out, nil
}

// prepareHomeArticles validates ids (exist, generic, unique) and builds the rows in array order.
func (s homeArticleServiceImpl) prepareHomeArticles(ctx context.Context, articleIds []string, now time.Time, userId string) ([]entity.HomeArticleEntity, error) {
	seen := make(map[string]bool, len(articleIds))
	ents := make([]entity.HomeArticleEntity, 0, len(articleIds))
	for i, id := range articleIds {
		if seen[id] {
			return nil, homeArticleDuplicate(id)
		}
		seen[id] = true
		article, err := s.articleRepository.GetArticleById(ctx, id)
		if err != nil {
			return nil, err
		}
		if article == nil {
			return nil, articleIdNotFound(id)
		}
		if article.Scope != view.ScopeGeneric {
			return nil, homeArticleNotGeneric(id)
		}
		ents = append(ents, entity.HomeArticleEntity{ArticleId: id, DisplayOrder: i, CreatedAt: now, CreatedBy: userId})
	}
	return ents, nil
}

func (s homeArticleServiceImpl) SetHomeArticles(ctx context.Context, req view.HomeArticlesRequest) (*view.AdminHomeArticles, error) {
	ents, err := s.prepareHomeArticles(ctx, req.ArticleIds, time.Now(), secctx.GetUserId(ctx))
	if err != nil {
		return nil, err
	}
	err = s.transactionRunner.RunInTransaction(ctx, func(tx *pg.Tx) error {
		return s.homeArticleRepository.Replace(ctx, tx, ents)
	})
	if err != nil {
		return nil, err
	}
	return s.adminView(ctx, ents)
}
