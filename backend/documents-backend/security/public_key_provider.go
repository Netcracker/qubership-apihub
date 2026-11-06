package security

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"sync"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	log "github.com/sirupsen/logrus"
)

// PublicKeyProvider caches the APIHUB JWT public key and refetches it on demand (key rotation).
type PublicKeyProvider interface {
	GetPublicKey(ctx context.Context, refresh bool) (*rsa.PublicKey, error)
}

func NewPublicKeyProvider(apihubClient client.ApihubClient) PublicKeyProvider {
	return &publicKeyProviderImpl{apihubClient: apihubClient}
}

type publicKeyProviderImpl struct {
	apihubClient client.ApihubClient
	mu           sync.RWMutex
	key          *rsa.PublicKey
}

func (p *publicKeyProviderImpl) GetPublicKey(ctx context.Context, refresh bool) (*rsa.PublicKey, error) {
	if !refresh {
		p.mu.RLock()
		key := p.key
		p.mu.RUnlock()
		if key != nil {
			return key, nil
		}
	}
	raw, err := p.apihubClient.GetPublicKey(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch APIHUB public key: %w", err)
	}
	key, err := ParsePublicKey(raw)
	if err != nil {
		return nil, err
	}
	p.mu.Lock()
	p.key = key
	p.mu.Unlock()
	log.Info("APIHUB JWT public key loaded")
	return key, nil
}

// ParsePublicKey accepts what APIHUB serves (PKCS#1 DER) plus PEM-wrapped PKCS#1/PKIX.
func ParsePublicKey(raw []byte) (*rsa.PublicKey, error) {
	der := raw
	if block, _ := pem.Decode(raw); block != nil {
		der = block.Bytes
	}
	if key, err := x509.ParsePKCS1PublicKey(der); err == nil {
		return key, nil
	}
	pub, err := x509.ParsePKIXPublicKey(der)
	if err != nil {
		return nil, fmt.Errorf("APIHUB public key is neither PKCS#1 nor PKIX: %w", err)
	}
	key, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("APIHUB public key is %T, expected RSA", pub)
	}
	return key, nil
}
