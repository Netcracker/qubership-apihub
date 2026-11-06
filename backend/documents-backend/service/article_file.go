package service

import (
	"context"
	"mime"
	"net/http"
	"path"
	"regexp"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/go-pg/pg/v10"
)

var filePathRegexp = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)*$`)

// StoredFile is a file ready to be served: metadata plus bytes. Visibility is the owning article's audience.
type StoredFile struct {
	ContentType string
	Size        int64
	Checksum    string
	Visibility  string
	Data        []byte
}

// ArticleFileService manages the files attached to an article. A path is relative to its article and unique only
// within it; bytes are deduplicated by checksum across all files.
type ArticleFileService interface {
	// GetArticleFile serves a file by article slug and relative path, applying the article's access rules:
	// unpublished articles are visible to sysadmins only; corporate articles are "not found" for anonymous callers.
	GetArticleFile(ctx context.Context, slug string, path string) (*StoredFile, error)
	// GetArticleFiles lists the files of an article with admin details.
	GetArticleFiles(ctx context.Context, articleId string) ([]view.ArticleFile, error)
	// UploadArticleFile stores one file under the relative path. 409 when the path is taken within the article.
	UploadArticleFile(ctx context.Context, articleId string, path string, contentType string, data []byte) (*view.ArticleFile, error)
	DeleteArticleFile(ctx context.Context, articleId string, path string) error
}

func NewArticleFileService(transactionRunner repository.TransactionRunner, articleRepository repository.ArticleRepository, articleFileRepository repository.ArticleFileRepository, fileDataRepository repository.FileDataRepository, maxUploadSizeBytes int64) ArticleFileService {
	return &articleFileServiceImpl{
		transactionRunner:     transactionRunner,
		articleRepository:     articleRepository,
		articleFileRepository: articleFileRepository,
		fileDataRepository:    fileDataRepository,
		maxUploadSizeBytes:    maxUploadSizeBytes,
	}
}

type articleFileServiceImpl struct {
	transactionRunner     repository.TransactionRunner
	articleRepository     repository.ArticleRepository
	articleFileRepository repository.ArticleFileRepository
	fileDataRepository    repository.FileDataRepository
	maxUploadSizeBytes    int64
}

func invalidFilePath(p string) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.InvalidFilePath,
		Message: exception.InvalidFilePathMsg,
		Params:  map[string]interface{}{"path": p},
	}
}

func fileNotFound(p string) error {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.ArticleFileNotFound,
		Message: exception.ArticleFileNotFoundMsg,
		Params:  map[string]interface{}{"path": p},
	}
}

// NormalizeFilePath cleans a relative path and rejects traversal or unexpected characters.
func NormalizeFilePath(p string) (string, error) {
	raw := strings.TrimSpace(p)
	for _, seg := range strings.Split(raw, "/") {
		if seg == ".." {
			return "", invalidFilePath(raw)
		}
	}
	cleaned := strings.TrimPrefix(path.Clean("/"+raw), "/")
	if cleaned == "" || cleaned == "." || !filePathRegexp.MatchString(cleaned) {
		return "", invalidFilePath(raw)
	}
	return cleaned, nil
}

// MakeArticleFileEntity validates an upload and prepares the metadata row and the content row (shared with import).
func MakeArticleFileEntity(articleId string, p string, contentType string, data []byte, maxUploadSizeBytes int64, userId string) (*entity.ArticleFileEntity, *entity.FileDataEntity, error) {
	normalized, err := NormalizeFilePath(p)
	if err != nil {
		return nil, nil, err
	}
	if maxUploadSizeBytes > 0 && int64(len(data)) > maxUploadSizeBytes {
		return nil, nil, &exception.CustomError{
			Status:  http.StatusRequestEntityTooLarge,
			Code:    exception.ArticleFileTooLarge,
			Message: exception.ArticleFileTooLargeMsg,
			Params:  map[string]interface{}{"maxSize": maxUploadSizeBytes},
		}
	}
	if contentType == "" {
		contentType = mime.TypeByExtension(path.Ext(normalized))
	}
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	checksum := utils.Sha256Hex(data)
	meta := &entity.ArticleFileEntity{
		Id:          utils.NewId(),
		ArticleId:   articleId,
		Path:        normalized,
		ContentType: contentType,
		Size:        int64(len(data)),
		Checksum:    checksum,
		CreatedAt:   time.Now(),
		CreatedBy:   userId,
	}
	return meta, &entity.FileDataEntity{Checksum: checksum, Data: data}, nil
}

func (s articleFileServiceImpl) article(ctx context.Context, articleId string) (*entity.ArticleEntity, error) {
	ent, err := s.articleRepository.GetArticleById(ctx, articleId)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, articleIdNotFound(articleId)
	}
	return ent, nil
}

func (s articleFileServiceImpl) GetArticleFile(ctx context.Context, slug string, p string) (*StoredFile, error) {
	normalized, err := NormalizeFilePath(p)
	if err != nil {
		return nil, fileNotFound(p)
	}
	article, err := s.articleRepository.GetArticleBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if article == nil || (!article.Published && !secctx.IsSysadm(ctx)) {
		return nil, articleNotFound(slug)
	}
	visibility := ArticleFilesVisibility(article)
	if visibility == view.VisibilityCorporate && secctx.IsAnonymous(ctx) {
		return nil, articleNotFound(slug)
	}
	meta, err := s.articleFileRepository.GetArticleFile(ctx, article.Id, normalized)
	if err != nil {
		return nil, err
	}
	if meta == nil {
		return nil, fileNotFound(normalized)
	}
	content, err := s.fileDataRepository.GetFileData(ctx, meta.Checksum)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, fileNotFound(normalized)
	}
	return &StoredFile{ContentType: meta.ContentType, Size: meta.Size, Checksum: meta.Checksum, Visibility: visibility, Data: content.Data}, nil
}

func (s articleFileServiceImpl) GetArticleFiles(ctx context.Context, articleId string) ([]view.ArticleFile, error) {
	ent, err := s.article(ctx, articleId)
	if err != nil {
		return nil, err
	}
	byArticle, err := s.articleFileRepository.GetArticleFiles(ctx, []string{ent.Id})
	if err != nil {
		return nil, err
	}
	result := make([]view.ArticleFile, 0, len(byArticle[ent.Id]))
	for _, f := range byArticle[ent.Id] {
		result = append(result, entity.MakeArticleFileView(f, true))
	}
	return result, nil
}

func (s articleFileServiceImpl) UploadArticleFile(ctx context.Context, articleId string, p string, contentType string, data []byte) (*view.ArticleFile, error) {
	article, err := s.article(ctx, articleId)
	if err != nil {
		return nil, err
	}
	meta, content, err := MakeArticleFileEntity(article.Id, p, contentType, data, s.maxUploadSizeBytes, secctx.GetUserId(ctx))
	if err != nil {
		return nil, err
	}
	existing, err := s.articleFileRepository.GetArticleFile(ctx, article.Id, meta.Path)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusConflict,
			Code:    exception.ArticleFilePathConflict,
			Message: exception.ArticleFilePathConflictMsg,
			Params:  map[string]interface{}{"path": meta.Path},
		}
	}
	err = s.transactionRunner.RunInTransaction(ctx, func(tx *pg.Tx) error {
		if err := s.fileDataRepository.UpsertFileData(ctx, tx, content); err != nil {
			return err
		}
		return s.articleFileRepository.CreateArticleFile(ctx, tx, meta)
	})
	if err != nil {
		return nil, err
	}
	v := entity.MakeArticleFileView(*meta, true)
	return &v, nil
}

func (s articleFileServiceImpl) DeleteArticleFile(ctx context.Context, articleId string, p string) error {
	article, err := s.article(ctx, articleId)
	if err != nil {
		return err
	}
	normalized, err := NormalizeFilePath(p)
	if err != nil {
		return err
	}
	return s.transactionRunner.RunInTransaction(ctx, func(tx *pg.Tx) error {
		deleted, err := s.articleFileRepository.DeleteArticleFile(ctx, tx, article.Id, normalized)
		if err != nil {
			return err
		}
		if deleted == nil {
			return fileNotFound(normalized)
		}
		return s.fileDataRepository.DeleteOrphanFileData(ctx, tx, []string{deleted.Checksum})
	})
}

// checksumsOf collects the distinct checksums of the given rows (for orphan cleanup after deletes).
func checksumsOf(rows []entity.ArticleFileEntity) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(rows))
	for _, row := range rows {
		if !seen[row.Checksum] {
			seen[row.Checksum] = true
			out = append(out, row.Checksum)
		}
	}
	return out
}
