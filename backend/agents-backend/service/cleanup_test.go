package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/agents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/agents-backend/view"
)

type cleanupApihubClient struct {
	client.ApihubClient
	info     *view.ApihubSystemInfo
	infoErr  error
	packages *view.Packages
	pkgErr   error
}

func (c *cleanupApihubClient) GetSystemInfo(context.Context) (*view.ApihubSystemInfo, error) {
	return c.info, c.infoErr
}

func (c *cleanupApihubClient) GetPackages(context.Context, view.PackagesSearchReq) (*view.Packages, error) {
	return c.packages, c.pkgErr
}

// Regression for issue #1027: GetPackages returns (nil, nil) when the search
// yields no packages or APIHUB answers 404, and the cleanup cron job runs
// without a recover, so the nil dereference of workspaces.Packages crashed
// the whole process instead of skipping the run.
func TestSnapshotsCleanupJobSkipsRunWithoutPanicWhenNoWorkspaces(t *testing.T) {
	cases := []struct {
		name     string
		packages *view.Packages
	}{
		{name: "nil result (apihub 404 or empty search)", packages: nil},
		{name: "empty non-nil result", packages: &view.Packages{}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			job := snapshotsCleanupJob{
				schedule: "@daily",
				ttl:      30,
				timeout:  time.Second,
				apihubClient: &cleanupApihubClient{
					info:     &view.ApihubSystemInfo{},
					packages: tc.packages,
				},
			}

			job.Run() // must not panic
		})
	}
}

// Regression for issue #1027: when GetSystemInfo failed before the timeout,
// the job logged ctx.Err().Error() with a nil ctx.Err(), and the panic crashed
// the whole process because the cron job runs without a recover.
func TestSnapshotsCleanupJobDoesNotPanicWhenSystemInfoFails(t *testing.T) {
	job := snapshotsCleanupJob{
		schedule: "@daily",
		ttl:      30,
		timeout:  time.Second,
		apihubClient: &cleanupApihubClient{
			infoErr: errors.New("connection refused"),
		},
	}

	job.Run() // must not panic
}
