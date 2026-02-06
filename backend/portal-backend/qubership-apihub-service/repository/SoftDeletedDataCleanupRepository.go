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
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup/logger"
)

type SoftDeletedDataCleanupRepository interface {
	StoreCleanupRun(ctx context.Context, entity entity.SoftDeletedDataCleanupEntity) error
	UpdateCleanupRun(ctx context.Context, runId string, status string, details string, finishedAt *time.Time) error
	VacuumAffectedTables(ctx context.Context, runId string) error
}

func NewSoftDeletedDataCleanupRepository(cp db.ConnectionProvider) SoftDeletedDataCleanupRepository {
	return &softDeletedDataCleanupRepositoryImpl{cp: cp}
}

type softDeletedDataCleanupRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (d softDeletedDataCleanupRepositoryImpl) StoreCleanupRun(ctx context.Context, entity entity.SoftDeletedDataCleanupEntity) error {
	_, err := d.cp.GetConnection().ModelContext(ctx, &entity).Insert()
	return err
}

func (d softDeletedDataCleanupRepositoryImpl) UpdateCleanupRun(ctx context.Context, runId string, status string, details string, finishedAt *time.Time) error {
	query := d.cp.GetConnection().ModelContext(ctx, &entity.SoftDeletedDataCleanupEntity{})

	if status != "" {
		query = query.Set("status=?", status)
	}

	if details != "" {
		query = query.Set("details=?", details)
	}

	if finishedAt != nil {
		query = query.Set("finished_at=?", finishedAt)
	}

	_, err := query.Where("run_id = ?", runId).Update()
	return err
}

func (d softDeletedDataCleanupRepositoryImpl) VacuumAffectedTables(ctx context.Context, runId string) error {
	var cleanupEntity entity.SoftDeletedDataCleanupEntity
	err := d.cp.GetConnection().ModelContext(ctx, &cleanupEntity).
		Where("run_id = ?", runId).
		Select()
	if err != nil {
		return err
	}

	var vacuumErrors []string

	if cleanupEntity.DeletedItems != nil && cleanupEntity.DeletedItems.TotalRecords > 0 {
		deletedItems := cleanupEntity.DeletedItems
		if len(deletedItems.Packages) > 0 {
			logger.Debugf(ctx, "Vacuuming 'package_group' table for %d deleted packages", len(deletedItems.Packages))
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_group")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_group' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'package_group' table")
			}
		}
		if len(deletedItems.PackageRevisions) > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_version' table for %d deleted package revisions", len(deletedItems.PackageRevisions))
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'published_version' table")
			}
		}
		if deletedItems.ActivityTracking > 0 {
			logger.Debugf(ctx, "Vacuuming 'activity_tracking' table for %d deleted activity tracking records", deletedItems.ActivityTracking)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL activity_tracking")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'activity_tracking' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'activity_tracking' table")
			}
		}
		if len(deletedItems.ApiKeys) > 0 {
			logger.Debugf(ctx, "Vacuuming 'apihub_api_keys' table for %d deleted API keys", len(deletedItems.ApiKeys))
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL apihub_api_keys")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'apihub_api_keys' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'apihub_api_keys' table")
			}
		}
		if deletedItems.Builds > 0 {
			logger.Debugf(ctx, "Vacuuming 'build' table for %d deleted builds", deletedItems.Builds)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL build")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'build' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'build' table")
			}
		}
		if deletedItems.BuildDepends > 0 {
			logger.Debugf(ctx, "Vacuuming 'build_depends' table for %d deleted build depends", deletedItems.BuildDepends)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL build_depends")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'build_depends' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'build_depends' table")
			}
		}
		if deletedItems.BuildResults > 0 {
			logger.Debugf(ctx, "Vacuuming 'build_result' table for %d deleted build results", deletedItems.BuildResults)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL build_result")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'build_result' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'build_result' table")
			}
		}
		if deletedItems.BuildSources > 0 {
			logger.Debugf(ctx, "Vacuuming 'build_src' table for %d deleted build sources", deletedItems.BuildSources)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL build_src")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'build_src' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'build_src' table")
			}
		}
		if deletedItems.BuilderNotifications > 0 {
			logger.Debugf(ctx, "Vacuuming 'builder_notifications' table for %d deleted builder notifications", deletedItems.BuilderNotifications)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL builder_notifications")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'builder_notifications' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'builder_notifications' table")
			}
		}
		if deletedItems.FavoritePackages > 0 {
			logger.Debugf(ctx, "Vacuuming 'favorite_packages' table for %d deleted favorite packages records", deletedItems.FavoritePackages)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL favorite_packages")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'favorite_packages' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'favorite_packages' table")
			}
		}
		if deletedItems.Operations > 0 {
			logger.Debugf(ctx, "Vacuuming 'operation' table for %d deleted operations", deletedItems.Operations)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL operation")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'operation' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'operation' table")
			}
		}
		if deletedItems.OperationGroups > 0 {
			logger.Debugf(ctx, "Vacuuming 'operation_group' table for %d deleted operation groups", deletedItems.OperationGroups)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL operation_group")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'operation_group' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'operation_group' table")
			}
		}
		if deletedItems.GroupedOperations > 0 {
			logger.Debugf(ctx, "Vacuuming 'grouped_operation' table for %d deleted grouped operations", deletedItems.GroupedOperations)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL grouped_operation")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'grouped_operation' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'grouped_operation' table")
			}
		}
		if deletedItems.OperationOpenCounts > 0 {
			logger.Debugf(ctx, "Vacuuming 'operation_open_count' table for %d deleted operation open count records", deletedItems.OperationOpenCounts)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL operation_open_count")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'operation_open_count' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'operation_open_count' table")
			}
		}
		if deletedItems.PackageExportConfigs > 0 {
			logger.Debugf(ctx, "Vacuuming 'package_export_config' table for %d deleted package export configs", deletedItems.PackageExportConfigs)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_export_config")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_export_config' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'package_export_config' table")
			}
		}
		if len(deletedItems.PackageMembersRoles) > 0 {
			logger.Debugf(ctx, "Vacuuming 'package_member_role' table for %d deleted package member role records", len(deletedItems.PackageMembersRoles))
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_member_role")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_member_role' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'package_member_role' table")
			}
		}
		if len(deletedItems.PackageServices) > 0 {
			logger.Debugf(ctx, "Vacuuming 'package_service' table for %d deleted package service records", len(deletedItems.PackageServices))
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_service")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_service' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'package_service' table")
			}
		}
		if deletedItems.PackageTransitions > 0 {
			logger.Debugf(ctx, "Vacuuming 'package_transition' table for %d deleted package transition records", deletedItems.PackageTransitions)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_transition")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_transition' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'package_transition' table")
			}
		}
		if deletedItems.PublishedData > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_data' table for %d deleted published_data records", deletedItems.PublishedData)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_data' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'published_data' table")
			}
		}
		if deletedItems.PublishedDocumentOpenCounts > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_document_open_count' table for %d deleted records", deletedItems.PublishedDocumentOpenCounts)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_document_open_count")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_document_open_count' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'published_document_open_count' table")
			}
		}
		if deletedItems.PublishedSources > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_sources' table for %d deleted published sources", deletedItems.PublishedSources)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_sources")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_sources' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'published_sources' table")
			}
		}
		if deletedItems.PublishedVersionOpenCounts > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_version_open_count' table for %d deleted records", deletedItems.PublishedVersionOpenCounts)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version_open_count")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version_open_count' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'published_version_open_count' table")
			}
		}
		if deletedItems.PublishedVersionReferences > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_version_reference' table for %d deleted references", deletedItems.PublishedVersionReferences)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version_reference")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version_reference' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'published_version_reference' table")
			}
		}
		if deletedItems.PublishedVersionRevisionContent > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_version_revision_content' table for %d deleted records", deletedItems.PublishedVersionRevisionContent)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version_revision_content")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version_revision_content' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'published_version_revision_content' table")
			}
		}
		if deletedItems.PublishedVersionValidation > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_version_validation' table for %d deleted published version validations", deletedItems.PublishedVersionValidation)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version_validation")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version_validation' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'published_version_validation' table")
			}
		}
		if deletedItems.SharedUrlInfo > 0 {
			logger.Debugf(ctx, "Vacuuming 'shared_url_info' table for %d deleted records", deletedItems.SharedUrlInfo)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL shared_url_info")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'shared_url_info' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'shared_url_info' table")
			}
		}
		if deletedItems.TransformedContentData > 0 {
			logger.Debugf(ctx, "Vacuuming 'transformed_content_data' table for %d deleted records", deletedItems.TransformedContentData)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL transformed_content_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'transformed_content_data' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'transformed_content_data' table")
			}
		}
		if deletedItems.VersionInternalDocument > 0 {
			logger.Debugf(ctx, "Vacuuming 'version_internal_document' table for %d deleted records", deletedItems.VersionInternalDocument)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL version_internal_document")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'version_internal_document' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'version_internal_document' table")
			}
		}
	} else {
		logger.Info(ctx, "No deleted items found - skipping vacuum operations")
	}

	if len(vacuumErrors) > 0 {
		logger.Errorf(ctx, "Vacuum operations completed with %d errors: %s",
			len(vacuumErrors), strings.Join(vacuumErrors, "; "))
		return fmt.Errorf("vacuum operations failed: %s", strings.Join(vacuumErrors, "; "))
	}

	return nil
}
