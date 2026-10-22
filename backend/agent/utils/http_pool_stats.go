package utils

import (
	"net/http"
	"net/http/httptrace"
	"sync"
	"sync/atomic"
)

// PoolStats holds live connection counters for a named HTTP transport.
type PoolStats struct {
	InFlight      int64
	TotalRequests int64
	NewConns      int64
	ReusedConns   int64
}

var (
	poolStatsMu sync.Mutex
	poolStats   = map[string]*PoolStats{}
)

type instrumentedTransport struct {
	underlying http.RoundTripper
	stats      *PoolStats
}

func (t *instrumentedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	atomic.AddInt64(&t.stats.InFlight, 1)
	atomic.AddInt64(&t.stats.TotalRequests, 1)
	defer atomic.AddInt64(&t.stats.InFlight, -1)

	trace := &httptrace.ClientTrace{
		GotConn: func(info httptrace.GotConnInfo) {
			if info.Reused {
				atomic.AddInt64(&t.stats.ReusedConns, 1)
			} else {
				atomic.AddInt64(&t.stats.NewConns, 1)
			}
		},
	}
	req = req.WithContext(httptrace.WithClientTrace(req.Context(), trace))
	return t.underlying.RoundTrip(req)
}

// RegisterPoolStats wraps rt with connection-pool counters tracked under name and returns
// the wrapper to use as the transport in its place.
func RegisterPoolStats(name string, rt http.RoundTripper) http.RoundTripper {
	stats := &PoolStats{}
	poolStatsMu.Lock()
	poolStats[name] = stats
	poolStatsMu.Unlock()
	return &instrumentedTransport{underlying: rt, stats: stats}
}

// GetPoolStatsSnapshot returns a copy of the current counters for every registered HTTP
// connection pool, keyed by pool name. Counters are cumulative since process start.
func GetPoolStatsSnapshot() map[string]PoolStats {
	poolStatsMu.Lock()
	defer poolStatsMu.Unlock()
	snapshot := make(map[string]PoolStats, len(poolStats))
	for name, stats := range poolStats {
		snapshot[name] = PoolStats{
			InFlight:      atomic.LoadInt64(&stats.InFlight),
			TotalRequests: atomic.LoadInt64(&stats.TotalRequests),
			NewConns:      atomic.LoadInt64(&stats.NewConns),
			ReusedConns:   atomic.LoadInt64(&stats.ReusedConns),
		}
	}
	return snapshot
}
