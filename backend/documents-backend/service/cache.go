package service

import (
	"sync"
	"time"
)

// ttlCache is a minimal in-memory cache for short-lived, per-principal APIHUB answers.
type ttlCache[V any] struct {
	ttl   time.Duration
	mu    sync.Mutex
	items map[string]cacheItem[V]
	now   func() time.Time
}

type cacheItem[V any] struct {
	value   V
	expires time.Time
}

func newTtlCache[V any](ttl time.Duration) *ttlCache[V] {
	return &ttlCache[V]{ttl: ttl, items: map[string]cacheItem[V]{}, now: time.Now}
}

func (c *ttlCache[V]) Get(key string) (V, bool) {
	var zero V
	if c == nil || c.ttl <= 0 {
		return zero, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	it, ok := c.items[key]
	if !ok {
		return zero, false
	}
	if c.now().After(it.expires) {
		delete(c.items, key)
		return zero, false
	}
	return it.value, true
}

func (c *ttlCache[V]) Put(key string, v V) {
	if c == nil || c.ttl <= 0 {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	now := c.now()
	if len(c.items) > 1000 {
		for k, it := range c.items {
			if now.After(it.expires) {
				delete(c.items, k)
			}
		}
	}
	c.items[key] = cacheItem[V]{value: v, expires: now.Add(c.ttl)}
}
