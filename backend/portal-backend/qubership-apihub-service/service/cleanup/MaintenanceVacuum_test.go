package cleanup

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestBuildVacuumQueries(t *testing.T) {
	rels := []tableRelation{
		{Schema: "public", Name: "package_group"},
		{Schema: "public", Name: "published_version"},
	}

	queries := buildVacuumQueries(rels)

	assert.Equal(t, []string{
		`VACUUM FULL ANALYZE public."package_group";`,
		`VACUUM FULL ANALYZE public."published_version";`,
	}, queries)
}

func TestMaintenanceVacuumProcessorTimeout(t *testing.T) {
	processor := NewMaintenanceVacuumCleanupJobProcessor(nil, 300)

	assert.Equal(t, 5*time.Hour, processor.GetVacuumTimeout())
}

func TestCreateMaintenanceVacuumCleanupJob(t *testing.T) {
	cleanupService := NewCleanupService(nil)

	err := cleanupService.CreateMaintenanceVacuumCleanupJob(nil, nil, "instance-1", "0 23 * * 0", 300)
	assert.NoError(t, err)

	cleanupImpl := cleanupService.(*cleanupServiceImpl)
	assert.Len(t, cleanupImpl.cron.Entries(), 1)
}
