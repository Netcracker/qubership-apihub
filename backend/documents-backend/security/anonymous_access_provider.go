package security

import (
	"context"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	log "github.com/sirupsen/logrus"
)

// AnonymousAccessProvider mirrors APIHUB's security.anonymousAccess.enabled flag, refreshed from
// GET /api/v2/system/configuration at most once per TTL.
type AnonymousAccessProvider interface {
	IsAnonymousAccessEnabled(ctx context.Context) bool
}

func NewAnonymousAccessProvider(apihubClient client.ApihubClient, ttl time.Duration) AnonymousAccessProvider {
	if ttl <= 0 {
		ttl = time.Minute
	}
	return &anonymousAccessProviderImpl{apihubClient: apihubClient, ttl: ttl}
}

type anonymousAccessProviderImpl struct {
	apihubClient client.ApihubClient
	ttl          time.Duration
	mu           sync.Mutex
	enabled      bool
	known        bool
	fetchedAt    time.Time
}

func (p *anonymousAccessProviderImpl) IsAnonymousAccessEnabled(ctx context.Context) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.known && time.Since(p.fetchedAt) < p.ttl {
		return p.enabled
	}
	cfg, err := p.apihubClient.GetSystemConfiguration(ctx)
	if err != nil {
		// Fail closed on the very first lookup; keep the last known value afterwards.
		log.Warnf("Failed to refresh APIHUB system configuration: %v", err)
		if !p.known {
			return false
		}
		p.fetchedAt = time.Now()
		return p.enabled
	}
	p.enabled = bool(cfg.AnonymousAccess)
	p.known = true
	p.fetchedAt = time.Now()
	return p.enabled
}
