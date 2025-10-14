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
	log "github.com/sirupsen/logrus"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
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
			log.Debugf("Vacuuming 'package_group' table for %d deleted packages (runId=%s)", len(deletedItems.Packages), runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_group")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_group' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'package_group' table for cleanup run %s", runId)
			}
		}
		if len(deletedItems.PackageRevisions) > 0 {
			log.Debugf("Vacuuming 'published_version' table for %d deleted package revisions (runId=%s)", len(deletedItems.PackageRevisions), runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'published_version' table for cleanup run %s", runId)
			}
		}
		if deletedItems.ActivityTracking > 0 {
			log.Debugf("Vacuuming 'activity_tracking' table for %d deleted activity tracking records (runId=%s)", deletedItems.ActivityTracking, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL activity_tracking")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'activity_tracking' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'activity_tracking' table for cleanup run %s", runId)
			}
		}
		if len(deletedItems.ApiKeys) > 0 {
			log.Debugf("Vacuuming 'apihub_api_keys' table for %d deleted API keys (runId=%s)", len(deletedItems.ApiKeys), runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL apihub_api_keys")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'apihub_api_keys' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'apihub_api_keys' table for cleanup run %s", runId)
			}
		}
		if deletedItems.Builds > 0 {
			log.Debugf("Vacuuming 'build' table for %d deleted builds (runId=%s)", deletedItems.Builds, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL build")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'build' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'build' table for cleanup run %s", runId)
			}
		}
		if deletedItems.BuildDepends > 0 {
			log.Debugf("Vacuuming 'build_depends' table for %d deleted build depends (runId=%s)", deletedItems.BuildDepends, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL build_depends")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'build_depends' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'build_depends' table for cleanup run %s", runId)
			}
		}
		if deletedItems.BuildResults > 0 {
			log.Debugf("Vacuuming 'build_result' table for %d deleted build results (runId=%s)", deletedItems.BuildResults, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL build_result")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'build_result' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'build_result' table for cleanup run %s", runId)
			}
		}
		if deletedItems.BuildSources > 0 {
			log.Debugf("Vacuuming 'build_src' table for %d deleted build sources (runId=%s)", deletedItems.BuildSources, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL build_src")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'build_src' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'build_src' table for cleanup run %s", runId)
			}
		}
		if deletedItems.BuilderNotifications > 0 {
			log.Debugf("Vacuuming 'builder_notifications' table for %d deleted builder notifications (runId=%s)", deletedItems.BuilderNotifications, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL builder_notifications")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'builder_notifications' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'builder_notifications' table for cleanup run %s", runId)
			}
		}
		if deletedItems.FavoritePackages > 0 {
			log.Debugf("Vacuuming 'favorite_packages' table for %d deleted favorite packages records (runId=%s)", deletedItems.FavoritePackages, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL favorite_packages")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'favorite_packages' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'favorite_packages' table for cleanup run %s", runId)
			}
		}
		if deletedItems.Operations > 0 {
			log.Debugf("Vacuuming 'operation' table for %d deleted operations (runId=%s)", deletedItems.Operations, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL operation")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'operation' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'operation' table for cleanup run %s", runId)
			}
		}
		if deletedItems.OperationGroups > 0 {
			log.Debugf("Vacuuming 'operation_group' table for %d deleted operation groups (runId=%s)", deletedItems.OperationGroups, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL operation_group")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'operation_group' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'operation_group' table for cleanup run %s", runId)
			}
		}
		if deletedItems.GroupedOperations > 0 {
			log.Debugf("Vacuuming 'grouped_operation' table for %d deleted grouped operations (runId=%s)", deletedItems.GroupedOperations, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL grouped_operation")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'grouped_operation' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'grouped_operation' table for cleanup run %s", runId)
			}
		}
		if deletedItems.OperationOpenCounts > 0 {
			log.Debugf("Vacuuming 'operation_open_count' table for %d deleted operation open count records (runId=%s)", deletedItems.OperationOpenCounts, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL operation_open_count")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'operation_open_count' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'operation_open_count' table for cleanup run %s", runId)
			}
		}
		if deletedItems.PackageExportConfigs > 0 {
			log.Debugf("Vacuuming 'package_export_config' table for %d deleted package export configs (runId=%s)", deletedItems.PackageExportConfigs, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_export_config")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_export_config' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'package_export_config' table for cleanup run %s", runId)
			}
		}
		if len(deletedItems.PackageMembersRoles) > 0 {
			log.Debugf("Vacuuming 'package_member_role' table for %d deleted package member role records (runId=%s)", len(deletedItems.PackageMembersRoles), runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_member_role")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_member_role' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'package_member_role' table for cleanup run %s", runId)
			}
		}
		if len(deletedItems.PackageServices) > 0 {
			log.Debugf("Vacuuming 'package_service' table for %d deleted package service records (runId=%s)", len(deletedItems.PackageServices), runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_service")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_service' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'package_service' table for cleanup run %s", runId)
			}
		}
		if deletedItems.PackageTransitions > 0 {
			log.Debugf("Vacuuming 'package_transition' table for %d deleted package transition records (runId=%s)", deletedItems.PackageTransitions, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL package_transition")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'package_transition' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'package_transition' table for cleanup run %s", runId)
			}
		}
		if deletedItems.PublishedData > 0 {
			log.Debugf("Vacuuming 'published_data' table for %d deleted published_data records (runId=%s)", deletedItems.PublishedData, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_data' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'published_data' table for cleanup run %s", runId)
			}
		}
		if deletedItems.PublishedDocumentOpenCounts > 0 {
			log.Debugf("Vacuuming 'published_document_open_count' table for %d deleted records (runId=%s)", deletedItems.PublishedDocumentOpenCounts, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_document_open_count")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_document_open_count' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'published_document_open_count' table for cleanup run %s", runId)
			}
		}
		if deletedItems.PublishedSources > 0 {
			log.Debugf("Vacuuming 'published_sources' table for %d deleted published sources (runId=%s)", deletedItems.PublishedSources, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_sources")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_sources' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'published_sources' table for cleanup run %s", runId)
			}
		}
		if deletedItems.PublishedVersionOpenCounts > 0 {
			log.Debugf("Vacuuming 'published_version_open_count' table for %d deleted records (runId=%s)", deletedItems.PublishedVersionOpenCounts, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version_open_count")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version_open_count' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'published_version_open_count' table for cleanup run %s", runId)
			}
		}
		if deletedItems.PublishedVersionReferences > 0 {
			log.Debugf("Vacuuming 'published_version_reference' table for %d deleted references (runId=%s)", deletedItems.PublishedVersionReferences, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version_reference")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version_reference' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'published_version_reference' table for cleanup run %s", runId)
			}
		}
		if deletedItems.PublishedVersionRevisionContent > 0 {
			log.Debugf("Vacuuming 'published_version_revision_content' table for %d deleted records (runId=%s)", deletedItems.PublishedVersionRevisionContent, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version_revision_content")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version_revision_content' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'published_version_revision_content' table for cleanup run %s", runId)
			}
		}
		if deletedItems.PublishedVersionValidation > 0 {
			log.Debugf("Vacuuming 'published_version_validation' table for %d deleted published version validations (runId=%s)", deletedItems.PublishedVersionValidation, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_version_validation")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_version_validation' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'published_version_validation' table for cleanup run %s", runId)
			}
		}
		if deletedItems.SharedUrlInfo > 0 {
			log.Debugf("Vacuuming 'shared_url_info' table for %d deleted records (runId=%s)", deletedItems.SharedUrlInfo, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL shared_url_info")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'shared_url_info' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'shared_url_info' table for cleanup run %s", runId)
			}
		}
		if deletedItems.TransformedContentData > 0 {
			log.Debugf("Vacuuming 'transformed_content_data' table for %d deleted records (runId=%s)", deletedItems.TransformedContentData, runId)
			_, err = d.cp.GetConnection().ExecContext(ctx, "VACUUM FULL transformed_content_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'transformed_content_data' table: %v", err)
				log.Warn(errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				log.Tracef("Successfully vacuumed 'transformed_content_data' table for cleanup run %s", runId)
			}
		}
	} else {
		log.Infof("No deleted items found for cleanup run %s - skipping vacuum operations", runId)
	}

	if len(vacuumErrors) > 0 {
		log.Errorf("Vacuum operations completed with %d errors for cleanup run %s: %s",
			len(vacuumErrors), runId, strings.Join(vacuumErrors, "; "))
		return fmt.Errorf("vacuum operations failed: %s", strings.Join(vacuumErrors, "; "))
	}

	return nil
}
