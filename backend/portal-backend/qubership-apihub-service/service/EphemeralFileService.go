package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/google/uuid"
)

type EphemeralFileService interface {
	SaveFile(ctx context.Context, in EphemeralFileSaveInput) (*entity.EphemeralFileEntity, string, error)
	// No ownership check — used so download can 404 before JWT validation.
	GetFileByID(ctx context.Context, fileID string) (*entity.EphemeralFileEntity, error)
	GetFileForUser(ctx context.Context, fileID, userID string) (*entity.EphemeralFileEntity, error)
}

type EphemeralFileSaveInput struct {
	UserID   string
	Filename string
	MimeType string
	Reader   io.Reader
}

func NewEphemeralFileService(sis SystemInfoService, repo repository.EphemeralFileRepository) EphemeralFileService {
	return &ephemeralFileServiceImpl{sis: sis, repo: repo}
}

type ephemeralFileServiceImpl struct {
	sis  SystemInfoService
	repo repository.EphemeralFileRepository
}

func (s *ephemeralFileServiceImpl) SaveFile(ctx context.Context, in EphemeralFileSaveInput) (*entity.EphemeralFileEntity, string, error) {
	if in.Reader == nil {
		return nil, "", errors.New("nil reader")
	}
	if strings.TrimSpace(in.UserID) == "" {
		return nil, "", errors.New("userID is required")
	}
	baseDir := strings.TrimSpace(s.sis.GetEphemeralFileDirectory())
	maxBytes := int64(s.sis.GetEphemeralFileMaxSizeMb()) * 1024 * 1024
	ttl := time.Duration(s.sis.GetEphemeralFileTTLMinutes()) * time.Minute

	id := uuid.NewString()
	userDir := filepath.Join(baseDir, sanitizeUserID(in.UserID))
	if err := os.MkdirAll(userDir, 0o700); err != nil {
		return nil, "", fmt.Errorf("create user dir: %w", err)
	}
	storagePath := filepath.Join(userDir, id)

	written, err := streamToFile(storagePath, in.Reader, maxBytes)
	if err != nil {
		_ = os.Remove(storagePath)
		return nil, "", err
	}

	now := time.Now().UTC()
	mime := strings.TrimSpace(in.MimeType)
	var mimePtr *string
	if mime != "" {
		mimePtr = &mime
	}
	size := written
	row := &entity.EphemeralFileEntity{
		ID:          id,
		UserID:      in.UserID,
		Filename:    sanitizeFilename(in.Filename, id),
		StoragePath: storagePath,
		MimeType:    mimePtr,
		SizeBytes:   &size,
		CreatedAt:   now,
		ExpiresAt:   now.Add(ttl),
	}
	if err := s.repo.Insert(ctx, row); err != nil {
		_ = os.Remove(storagePath)
		return nil, "", fmt.Errorf("insert file row: %w", err)
	}
	metrics.EphemeralFilesTotal.Inc()
	metrics.EphemeralFileBytes.Observe(float64(written))

	return row, "/api/v1/ephemeral-files/" + id, nil
}

func (s *ephemeralFileServiceImpl) GetFileByID(ctx context.Context, fileID string) (*entity.EphemeralFileEntity, error) {
	return s.repo.GetByID(ctx, fileID)
}

func (s *ephemeralFileServiceImpl) GetFileForUser(ctx context.Context, fileID, userID string) (*entity.EphemeralFileEntity, error) {
	return s.repo.GetByIDForUser(ctx, fileID, userID)
}

func streamToFile(path string, r io.Reader, maxBytes int64) (int64, error) {
	out, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return 0, fmt.Errorf("open output file: %w", err)
	}
	defer out.Close()
	limited := io.LimitReader(r, maxBytes+1)
	written, err := io.Copy(out, limited)
	if err != nil {
		return written, fmt.Errorf("write file: %w", err)
	}
	if written > maxBytes {
		return written, fmt.Errorf("file exceeds maximum size of %d bytes", maxBytes)
	}
	return written, nil
}

func sanitizeUserID(uid string) string {
	uid = url.PathEscape(uid)
	uid = strings.ReplaceAll(uid, string(os.PathSeparator), "_")
	if uid == "" {
		uid = "anon"
	}
	if len(uid) > 64 {
		uid = uid[:64]
	}
	return uid
}

func sanitizeFilename(name, fallback string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return fallback
	}
	name = strings.ReplaceAll(name, "\\", "_")
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\x00", "")
	runes := []rune(name)
	if len(runes) > 255 {
		name = string(runes[:255])
	}
	return name
}
