package service

import (
	"time"

	"github.com/Netcracker/qubership-apihub-agent/utils"
	log "github.com/sirupsen/logrus"
)

// RunAgentStatusReporter periodically logs a summary of agent activity since the previous
// report: discovery/document counters plus HTTP connection-pool and OS connection stats.
func RunAgentStatusReporter(interval time.Duration) {
	utils.SafeAsync(func() {
		for range time.Tick(interval) {
			utils.SafeAsync(logAgentStatusReport)
		}
	})
}

func logAgentStatusReport() {
	snap := utils.TakeAndResetAgentStatusStats()
	osStats, err := utils.GetOSConnStatsSnapshot()
	if err != nil {
		log.Errorf("Failed to collect OS connection stats for agent status report: %s", err)
	}

	log.WithFields(log.Fields{
		"namespaces_discovered": snap.Namespaces,
		"discovery_runs":        snap.DiscoveryRuns,
		"discovery_errors":      snap.DiscoveryErrors,
		"services_processed":    snap.ServicesProcessed,
		"documents_downloaded":  snap.DocumentsDownloaded,
		"http_pools":            utils.GetPoolStatsSnapshot(),
		"os_connections":        osStats,
	}).Info("Agent status report")
}
