// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

const (
	defaultCleanupJobTimeout = 48 * time.Hour
	cleanupJobTimeoutBuffer  = 1 * time.Hour
)

type CleanupService interface {
	CreateSnapshotsCleanupJob(schedule string, ttl int) error
}

func NewCleanupService(apihubClient client.ApihubClient) CleanupService {
	cronInstance := cron.New()
	cronInstance.Start()
	return &cleanupServiceImpl{
		apihubClient: apihubClient,
		cronInstance: cronInstance,
	}
}

type cleanupServiceImpl struct {
	apihubClient client.ApihubClient
	cronInstance *cron.Cron
}

type snapshotsCleanupJob struct {
	schedule     string
	ttl          int
	timeout      time.Duration
	apihubClient client.ApihubClient
}

func (c *cleanupServiceImpl) CreateSnapshotsCleanupJob(schedule string, ttl int) error {
	timeout := c.calculateCleanupJobTimeout(schedule)
	job := snapshotsCleanupJob{
		schedule:     schedule,
		ttl:          ttl,
		timeout:      timeout,
		apihubClient: c.apihubClient,
	}
	_, err := c.cronInstance.AddJob(schedule, &job)
	if err != nil {
		log.Warnf("Snapshots cleanup job wasn't added for schedule - %s. With error - %s", schedule, err)
		return err
	}
	log.Infof("Snapshots cleanup job was created with schedule - %s", schedule)

	return nil
}

func (c cleanupServiceImpl) calculateCleanupJobTimeout(schedule string) time.Duration {
	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)

	sched, err := parser.Parse(schedule)
	if err != nil {
		log.Warnf("Failed to parse cron schedule '%s' for snapshots cleanup job: %v. Using default timeout.", schedule, err)
		return defaultCleanupJobTimeout
	}

	now := time.Now()
	next1 := sched.Next(now)
	next2 := sched.Next(next1)

	interval := next2.Sub(next1)
	if interval <= cleanupJobTimeoutBuffer {
		timeout := time.Duration(float64(interval) * 0.9)
		log.Warnf("Calculated interval from cron schedule '%s' for snapshots cleanup job is very short: %v. Using %v as timeout.",
			schedule, interval, timeout)
		return timeout
	}

	timeout := interval - cleanupJobTimeoutBuffer
	log.Infof("Calculated cleanup job timeout for snapshots cleanup job with schedule '%s': %v (interval: %v)", schedule, timeout, interval)
	return timeout
}

func (j snapshotsCleanupJob) Run() {
	ctx, cancel := context.WithTimeout(context.Background(), j.timeout)
	defer cancel()
	ctx = secctx.MakeSysadminContext(ctx)
	workspaces, err := j.apihubClient.GetPackages(ctx, view.PackagesSearchReq{
		Kind: string(view.KindWorkspace),
	})
	if err != nil {
		if ctx.Err() != nil {
			log.Errorf("[SnapshotsCleanup] cleanup job timed out or was cancelled while getting workspaces: %s", ctx.Err().Error())
			return
		}
		log.Errorf("[SnapshotsCleanup] failed to get workspaces: %s", err.Error())
		return
	}
	retention := time.Now().AddDate(0, 0, -j.ttl)
	log.Infof("[SnapshotsCleanup] Starting deleting snapshots published earlier than %s", retention)
	for _, workspace := range workspaces.Packages {
		select {
		case <-ctx.Done():
			log.Errorf("[SnapshotsCleanup] cleanup job timed out or was cancelled during workspace processing: %s", ctx.Err().Error())
			return
		default:
		}

		snapshotsGroupId := workspace.Id + "." + view.DefaultSnapshotsGroupAlias
		pkg, err := j.apihubClient.GetPackageById(ctx, snapshotsGroupId)
		if err != nil {
			if ctx.Err() != nil {
				log.Errorf("[SnapshotsCleanup] cleanup job timed out or was cancelled while checking '%s' runenv group existence: %s", snapshotsGroupId, ctx.Err().Error())
				return
			}
			log.Errorf("[SnapshotsCleanup] Failed to check '%s' runenv group existence: %s", snapshotsGroupId, err.Error())
			continue
		}
		if pkg == nil {
			log.Debugf("[SnapshotsCleanup] %s runenv group does not exist", snapshotsGroupId)
			continue
		}

		jobId, err := j.apihubClient.DeleteVersionsRecursively(ctx, snapshotsGroupId, view.DeleteVersionsRecursivelyReq{OlderThanDate: retention})
		if err != nil {
			if ctx.Err() != nil {
				log.Errorf("[SnapshotsCleanup] cleanup job timed out or was cancelled while deleting old snapshots in group %s: %s", snapshotsGroupId, ctx.Err().Error())
				return
			}
			log.Errorf("[SnapshotsCleanup] Failed to delete old snapshots in group %s: %s", snapshotsGroupId, err.Error())
			continue
		}
		if jobId == "" {
			log.Infof("[SnapshotsCleanup] Snapshots group %s not found", snapshotsGroupId)
			continue
		}
		log.Infof("[SnapshotsCleanup] Cleanup snapshots for group %s has been successfully started with job id %s", snapshotsGroupId, jobId)
	}
	log.Infof("[SnapshotsCleanup] Snapshots cleanup job finished")
}
