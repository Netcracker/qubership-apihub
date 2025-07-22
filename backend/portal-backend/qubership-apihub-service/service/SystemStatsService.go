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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"
)

type SystemStatsService interface {
	GetSystemStats(ctx context.Context) (*view.SystemStats, error)
}

func NewSystemStatsService(statsRepository repository.SystemStatsRepository) SystemStatsService {
	return &systemStatsServiceImpl{statsRepository: statsRepository}
}

type systemStatsServiceImpl struct {
	statsRepository repository.SystemStatsRepository
}

func (s *systemStatsServiceImpl) GetSystemStats(ctx context.Context) (*view.SystemStats, error) {
	g, ctx := errgroup.WithContext(ctx)

	var packageGroupCounts *entity.PackageGroupCountsEntity
	var revisionsCount *entity.RevisionsCountEntity
	var documentsCount int
	var operationsCount int
	var versionComparisonsCount int
	var buildsCountEntities []entity.BuildsCountEntity
	var tableSizeEntities []entity.TableSizeEntity

	g.Go(func() error {
		var err error
		packageGroupCounts, err = s.statsRepository.GetPackageGroupCounts(ctx)
		if err != nil {
			log.Errorf("Failed to get workspaces, groups, packages counts: %v", err)
		}
		return err
	})

	g.Go(func() error {
		var err error
		revisionsCount, err = s.statsRepository.GetRevisionsCount(ctx)
		if err != nil {
			log.Errorf("Failed to get revisions count: %v", err)
		}
		return err
	})

	g.Go(func() error {
		var err error
		documentsCount, err = s.statsRepository.GetDocumentsCount(ctx)
		if err != nil {
			log.Errorf("Failed to get documents count: %v", err)
		}
		return err
	})

	g.Go(func() error {
		var err error
		operationsCount, err = s.statsRepository.GetOperationsCount(ctx)
		if err != nil {
			log.Errorf("Failed to get operations count: %v", err)
		}
		return err
	})

	g.Go(func() error {
		var err error
		versionComparisonsCount, err = s.statsRepository.GetVersionComparisonsCount(ctx)
		if err != nil {
			log.Errorf("Failed to get version comparisons count: %v", err)
		}
		return err
	})

	g.Go(func() error {
		var err error
		buildsCountEntities, err = s.statsRepository.GetBuildsCountByType(ctx)
		if err != nil {
			log.Errorf("Failed to get builds count by type: %v", err)
		}
		return err
	})

	g.Go(func() error {
		var err error
		tableSizeEntities, err = s.statsRepository.GetDatabaseSizePerTable(ctx)
		if err != nil {
			log.Errorf("Failed to get database size: %v", err)
		}
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	businessEntities := view.BusinessEntitiesCount{
		Workspaces:         packageGroupCounts.Workspaces,
		DeletedWorkspaces:  packageGroupCounts.DeletedWorkspaces,
		Groups:             packageGroupCounts.Groups,
		DeletedGroups:      packageGroupCounts.DeletedGroups,
		Packages:           packageGroupCounts.Packages,
		DeletedPackages:    packageGroupCounts.DeletedPackages,
		Dashboards:         packageGroupCounts.Dashboards,
		DeletedDashboards:  packageGroupCounts.DeletedDashboards,
		Revisions:          revisionsCount.Revisions,
		DeletedRevisions:   revisionsCount.DeletedRevisions,
		Documents:          documentsCount,
		Operations:         operationsCount,
		VersionComparisons: versionComparisonsCount,
	}

	builds := make(map[view.BuildType]view.BuildsCount)
	for _, entity := range buildsCountEntities {
		builds[view.BuildType(entity.BuildType)] = entity.MakeBuildsCountView()
	}

	databaseSize := make([]view.TableSizeInfo, len(tableSizeEntities))
	for i, entity := range tableSizeEntities {
		databaseSize[i] = entity.MakeTableSizeInfoView()
	}

	return &view.SystemStats{
		BusinessEntities: businessEntities,
		Builds:           builds,
		DatabaseSize:     databaseSize,
	}, nil
}
