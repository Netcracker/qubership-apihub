package repository

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
)

type ApihubApiKeyRepository interface {
	SaveApiKey(apihubApiKeyEntity *entity.ApihubApiKeyEntity) error
	RevokeApiKey(id string, userId string) error
	GetPackageApiKeys(packageId string) ([]entity.ApihubApiKeyUserEntity, error)
	GetApiKeyByHash(apiKeyHash string) (*entity.ApihubApiKeyEntity, error)
	GetPackageApiKey(apiKeyId string, packageId string) (*entity.ApihubApiKeyUserEntity, error)
	GetApiKey(apiKeyId string) (*entity.ApihubApiKeyEntity, error)
}
