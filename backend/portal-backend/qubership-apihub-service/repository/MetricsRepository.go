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

package repository

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type MetricsRepository interface {
	StartGetMetricsProcess() error
}

func NewMetricsRepository(cp db.ConnectionProvider) MetricsRepository {
	return &metricsRepositoryImpl{
		cp: cp,
	}
}

type metricsRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (m metricsRepositoryImpl) StartGetMetricsProcess() error {
	errorBuildsCount, err := m.getBuildCountByStatus(string(view.StatusError))
	if err != nil {
		return err
	}
	metrics.FailedBuildCount.WithLabelValues().Set(float64(errorBuildsCount.BuildCount))

	buildNoneStatusQueueSize, err := m.getBuildCountByStatus(string(view.StatusNotStarted))
	if err != nil {
		return err
	}
	metrics.BuildNoneStatusQueueSize.WithLabelValues().Set(float64(buildNoneStatusQueueSize.BuildCount))

	buildRunningStatusQueueSize, err := m.getBuildCountByStatus(string(view.StatusRunning))
	if err != nil {
		return err
	}
	metrics.BuildRunningStatusQueueSize.WithLabelValues().Set(float64(buildRunningStatusQueueSize.BuildCount))

	buildMaxAvgTimeMetrics, err := m.getBuildTimeMetrics()
	if err != nil {
		return err
	}
	metrics.MaxBuildTime.WithLabelValues().Set(float64(buildMaxAvgTimeMetrics.MaxBuildTime))
	metrics.AvgBuildTime.WithLabelValues().Set(float64(buildMaxAvgTimeMetrics.AvgBuildTime))

	buildRetriesCount, err := m.getBuildRetriesCount()
	if err != nil {
		return err
	}
	metrics.NumberOfBuildRetries.WithLabelValues().Set(float64(buildRetriesCount.RetriesCount))
	return nil
}

func (m metricsRepositoryImpl) getBuildCountByStatus(status string) (*entity.BuildByStatusCountEntity, error) {
	result := new(entity.BuildByStatusCountEntity)
	query := `select count(build_id) as build_count from build where status = ? and last_active >= now() - interval '1 day'`
	_, err := m.cp.GetConnection().QueryOne(result, query, status)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (m metricsRepositoryImpl) getBuildTimeMetrics() (*entity.BuildTimeMetricsEntity, error) {
	result := new(entity.BuildTimeMetricsEntity)
	query := `select EXTRACT(EPOCH FROM max(last_active - created_at))::int as max_build_time, EXTRACT(EPOCH FROM avg(last_active - created_at))::int as avg_build_time from build where status = 'complete' and last_active >= now() - interval '1 day'`
	_, err := m.cp.GetConnection().QueryOne(result, query)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (m metricsRepositoryImpl) getBuildRetriesCount() (*entity.BuildRetriesCountEntity, error) {
	result := new(entity.BuildRetriesCountEntity)
	query := `select sum(restart_count) as retries_count from build where last_active >= now() - interval '1 day'`
	_, err := m.cp.GetConnection().QueryOne(result, query)
	if err != nil {
		return nil, err
	}
	return result, nil
}
