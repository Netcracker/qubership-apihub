package repository

import (
	"context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
)

type ApihubApiKeyRepository interface {
	SaveApiKey(ctx context.Context, apihubApiKeyEntity *entity.ApihubApiKeyEntity) error
	RevokeApiKey(ctx context.Context, id string, userId string) error
	GetPackageApiKeys(ctx context.Context, packageId string) ([]entity.ApihubApiKeyUserEntity, error)
	GetApiKeyByHash(ctx context.Context, apiKeyHash string) (*entity.ApihubApiKeyEntity, error)
	GetPackageApiKey(ctx context.Context, apiKeyId string, packageId string) (*entity.ApihubApiKeyUserEntity, error)
	GetApiKey(ctx context.Context, apiKeyId string) (*entity.ApihubApiKeyEntity, error)
}
