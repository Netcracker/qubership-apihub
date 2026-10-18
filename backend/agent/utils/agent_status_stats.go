package utils

import "sync"

// AgentStatusSnapshot is a point-in-time copy of the counters tracked since the last
// TakeAndResetAgentStatusStats call.
type AgentStatusSnapshot struct {
	Namespaces          int
	DiscoveryRuns       int64
	DiscoveryErrors     int64
	ServicesProcessed   int64
	DocumentsDownloaded int64
}

type agentStatusStats struct {
	mu                  sync.Mutex
	namespaces          map[string]struct{}
	discoveryRuns       int64
	discoveryErrors     int64
	servicesProcessed   int64
	documentsDownloaded int64
}

var stats = &agentStatusStats{namespaces: map[string]struct{}{}}

// RecordDiscoveryStart marks a discovery run started for namespace.
func RecordDiscoveryStart(namespace string) {
	stats.mu.Lock()
	defer stats.mu.Unlock()
	stats.namespaces[namespace] = struct{}{}
	stats.discoveryRuns++
}

// RecordDiscoveryError marks a namespace-level discovery failure.
func RecordDiscoveryError() {
	stats.mu.Lock()
	defer stats.mu.Unlock()
	stats.discoveryErrors++
}

// RecordServiceProcessed marks a k8s service as added to the discovery result cache.
func RecordServiceProcessed() {
	stats.mu.Lock()
	defer stats.mu.Unlock()
	stats.servicesProcessed++
}

// RecordDocumentsDownloaded adds n to the count of documents discovered/downloaded.
func RecordDocumentsDownloaded(n int) {
	stats.mu.Lock()
	defer stats.mu.Unlock()
	stats.documentsDownloaded += int64(n)
}

// TakeAndResetAgentStatusStats returns a snapshot of the counters accumulated since the
// previous call and resets them, so the next snapshot reflects only the following period.
func TakeAndResetAgentStatusStats() AgentStatusSnapshot {
	stats.mu.Lock()
	defer stats.mu.Unlock()

	snapshot := AgentStatusSnapshot{
		Namespaces:          len(stats.namespaces),
		DiscoveryRuns:       stats.discoveryRuns,
		DiscoveryErrors:     stats.discoveryErrors,
		ServicesProcessed:   stats.servicesProcessed,
		DocumentsDownloaded: stats.documentsDownloaded,
	}

	stats.namespaces = map[string]struct{}{}
	stats.discoveryRuns = 0
	stats.discoveryErrors = 0
	stats.servicesProcessed = 0
	stats.documentsDownloaded = 0

	return snapshot
}
