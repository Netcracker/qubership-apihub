package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/buraksezer/olric"
)

const (
	testUserId              = "user-1"
	testRevocationTimestamp = int64(1000)
)

type fakeRevocationCache struct {
	// results holds one entry per expected Get call; the last entry repeats for further calls.
	results []fakeGetResult
	calls   int
}

type fakeGetResult struct {
	value interface{}
	err   error
}

func (c *fakeRevocationCache) Get(string) (interface{}, error) {
	index := c.calls
	if index >= len(c.results) {
		index = len(c.results) - 1
	}
	c.calls++
	return c.results[index].value, c.results[index].err
}

func (c *fakeRevocationCache) PutEx(string, interface{}, time.Duration) error {
	return nil
}

func newTestTokenRevocationService(cache revocationCache) *tokenRevocationServiceImpl {
	return &tokenRevocationServiceImpl{userTokenRevocationsCache: cache}
}

func TestIsTokenRevoked_RetriesAfterCacheFailure(t *testing.T) {
	cache := &fakeRevocationCache{results: []fakeGetResult{
		{err: errors.New("dial tcp 10.244.0.9:3320: i/o timeout")},
		{value: testRevocationTimestamp},
	}}
	svc := newTestTokenRevocationService(cache)

	revoked, err := svc.IsTokenRevoked(context.Background(), testUserId, testRevocationTimestamp+1)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if revoked {
		t.Error("token issued after the revocation timestamp must not be reported as revoked")
	}
	if cache.calls != 2 {
		t.Errorf("expected 2 cache reads, got %d", cache.calls)
	}
}

func TestIsTokenRevoked_FailsClosedWhenCacheKeepsFailing(t *testing.T) {
	cache := &fakeRevocationCache{results: []fakeGetResult{{err: errors.New("cache is unreachable")}}}
	svc := newTestTokenRevocationService(cache)

	revoked, err := svc.IsTokenRevoked(context.Background(), testUserId, testRevocationTimestamp)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !revoked {
		t.Error("token must be reported as revoked when the cache cannot be read")
	}
	if cache.calls != revocationReadAttempts {
		t.Errorf("expected %d cache reads, got %d", revocationReadAttempts, cache.calls)
	}
}

func TestIsTokenRevoked_DoesNotRetryWhenKeyIsMissing(t *testing.T) {
	cache := &fakeRevocationCache{results: []fakeGetResult{{err: olric.ErrKeyNotFound}}}
	svc := newTestTokenRevocationService(cache)

	revoked, err := svc.IsTokenRevoked(context.Background(), testUserId, testRevocationTimestamp)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if revoked {
		t.Error("token must not be reported as revoked when the user has no revocation record")
	}
	if cache.calls != 1 {
		t.Errorf("expected 1 cache read, got %d", cache.calls)
	}
}

func TestIsTokenRevoked_ReturnsContextErrorWhileWaitingToRetry(t *testing.T) {
	cache := &fakeRevocationCache{results: []fakeGetResult{{err: errors.New("cache is unreachable")}}}
	svc := newTestTokenRevocationService(cache)
	svc.readRetryDelay = time.Minute
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	revoked, err := svc.IsTokenRevoked(ctx, testUserId, testRevocationTimestamp)

	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected context.DeadlineExceeded, got %v", err)
	}
	if revoked {
		t.Error("a request that ran out of time must not be reported as a revoked token")
	}
}
