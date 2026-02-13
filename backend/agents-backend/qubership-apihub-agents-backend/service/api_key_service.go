package service

import (
	"context"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	"github.com/shaj13/libcache"
)

type ApiKeyService interface {
	GetApihubApiKey(apiKeyId string) (*view.ApihubApiKeyView, error)
}

type apiKeyServiceImpl struct {
	apihubClient client.ApihubClient
	cache        libcache.Cache
	ctx          context.Context
}

func NewApiKeyService(apihubClient client.ApihubClient, nSize int, age time.Duration) ApiKeyService {
	service := &apiKeyServiceImpl{
		apihubClient: apihubClient,
		cache:        libcache.LRU.New(nSize),
		ctx:          secctx.MakeSysadminContext(context.Background()),
	}
	service.cache.SetTTL(age)
	service.cache.RegisterOnExpired(func(key, _ interface{}) {
		service.cache.Delete(key)
	})
	return service
}

func (a apiKeyServiceImpl) GetApihubApiKey(apiKeyId string) (*view.ApihubApiKeyView, error) {
	cachedApiKey, exists := a.cache.Load(apiKeyId)
	if exists {
		if cachedApiKey == nil {
			fmt.Println("cachedApiKey == nil")
			return nil, nil
		}
		apiKeyView := cachedApiKey.(view.ApihubApiKeyView)
		return &apiKeyView, nil
	}
	apiKey, err := a.apihubClient.GetApiKeyById(a.ctx, apiKeyId)
	if err != nil {
		return nil, err
	}
	if apiKey == nil {
		a.cache.Store(apiKeyId, nil)
		return nil, nil
	}
	a.cache.Store(apiKey.Id, *apiKey)
	return apiKey, nil
}
