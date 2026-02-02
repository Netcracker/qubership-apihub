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
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/utils"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"
)

type SnapshotService interface {
	CreateSnapshot(context context.Context, namespace string, workspaceId string, version string, snapshotDTO view.CreateSnapshotDTO) (*view.CreateSnapshotResponse, error)
	ListSnapshots(context context.Context, namespace string, workspaceId string, page, limit int, cloudName string) (*view.SnapshotsListResponse, error)
	GetSnapshot(context context.Context, namespace string, workspaceId string, version string, cloudName string) (*view.Snapshot, error)
}

func NewSnapshotService(systemInfoService SystemInfoService, apihubClient client.ApihubClient, agentClient client.AgentClient) SnapshotService {
	return &snapshotServiceImpl{systemInfoService: systemInfoService, apihubClient: apihubClient, agentClient: agentClient}
}

type snapshotServiceImpl struct {
	systemInfoService SystemInfoService
	apihubClient      client.ApihubClient
	agentClient       client.AgentClient
}

func (s *snapshotServiceImpl) ListSnapshots(ctx context.Context, namespace string, workspaceId string, page, limit int, cloudName string) (*view.SnapshotsListResponse, error) {
	groupId := fmt.Sprintf("%s.%s.%s.%s", workspaceId, view.DefaultSnapshotsGroupAlias, utils.ToId(cloudName), utils.ToId(namespace)) // Generate group id for namespace
	dashboardId := view.MakeSnapshotDashboardIdByGroupId(groupId)
	versionReq := view.VersionSearchRequest{
		Page:  page,
		Limit: limit,
	}

	dashboardVersions, err := s.apihubClient.GetVersions(ctx, dashboardId, versionReq)
	if err != nil {
		return nil, err
	}

	snapshots := make([]view.SnapshotListItem, 0)
	if dashboardVersions != nil {
		for _, version := range dashboardVersions.Versions {
			sn := view.SnapshotListItem{
				Version:   version.Version,
				CreatedAt: version.CreatedAt,
			}
			snapshots = append(snapshots, sn)
		}
	}

	return &view.SnapshotsListResponse{Snapshots: snapshots, PackageId: dashboardId}, nil
}

func (s *snapshotServiceImpl) GetSnapshot(ctx context.Context, namespace string, workspaceId string, version string, cloudName string) (*view.Snapshot, error) {
	groupId := fmt.Sprintf("%s.%s.%s.%s", workspaceId, view.DefaultSnapshotsGroupAlias, utils.ToId(cloudName), utils.ToId(namespace)) // Generate group id for namespace
	dashboardId := view.MakeSnapshotDashboardIdByGroupId(groupId)

	versionContent, err := s.apihubClient.GetVersion(ctx, dashboardId, version)
	if err != nil {
		return nil, err
	}
	if versionContent == nil {
		return nil, nil
	}
	references, err := s.apihubClient.GetVersionReferences(ctx, dashboardId, version)
	if err != nil {
		return nil, err
	}

	groupVersionForUrl := versionContent.Version
	if !versionContent.NotLatestRevision {
		groupVersionForUrl = strings.Split(versionContent.Version, "@")[0]
	}
	publishedAtStr, _ := versionContent.PublishedAt.UTC().MarshalText()
	result := view.Snapshot{
		Version:           versionContent.Version,
		ApiTypes:          versionContent.ApiTypes,
		PreviousVersion:   versionContent.PreviousVersion,
		PublishedAt:       string(publishedAtStr),
		Services:          make([]view.ServiceWithChanges, len(references.References)),
		ViewSnapshotUrl:   fmt.Sprintf("%s/portal/packages/%s/%s/overview/summary", s.systemInfoService.GetApihubUrl(), dashboardId, url.PathEscape(groupVersionForUrl)),
		NotLatestRevision: versionContent.NotLatestRevision,
	}

	wg := sync.WaitGroup{}

	errors := sync.Map{}

	for iIt, refIt := range references.References {
		wg.Add(1)
		ref := refIt
		i := iIt

		utils.SafeAsync(func() {
			defer wg.Done()
			refPackageId := references.Packages[ref.PackageRef].RefPackageId
			refPackageVersion := references.Packages[ref.PackageRef].RefPackageVersion
			pkg, err := s.apihubClient.GetPackageById(ctx, refPackageId)
			if err != nil {
				errors.Store(refPackageId, err)
				return
			}

			packageVersion, err := s.apihubClient.GetVersion(ctx, refPackageId, refPackageVersion)
			if err != nil {
				errors.Store(refPackageId, err)
				return
			}
			if packageVersion == nil {
				log.Errorf("Version %s for package %s not found, will not be included to snapshot output", refPackageVersion, refPackageId)
				return
			}

			comparisonUrl := ""
			viewBaselineUrl := ""
			baselineFound := false
			baselineVersionFound := false
			if packageVersion.PreviousVersionPackageId != "" {
				baselineFound = true
				if packageVersion.PreviousVersion != "" {
					baselineVersionFound = true
					versionForUrl := refPackageVersion
					if !references.Packages[ref.PackageRef].NotLatestRevision {
						versionForUrl = strings.Split(refPackageVersion, "@")[0]
					}
					previousVersionWithoutRevision := strings.Split(packageVersion.PreviousVersion, "@")[0]
					viewBaselineUrl = fmt.Sprintf("%s/portal/packages/%s/%s/overview/summary", s.systemInfoService.GetApihubUrl(), packageVersion.PreviousVersionPackageId, url.PathEscape(previousVersionWithoutRevision))
					previousVersionContent, err := s.apihubClient.GetVersion(ctx, packageVersion.PreviousVersionPackageId, packageVersion.PreviousVersion)
					if err != nil {
						log.Errorf("Previous version %s for package %s and version %s not found, comparison url will not be included to snapshot output", packageVersion.PreviousVersion, packageVersion.PreviousVersionPackageId, versionForUrl)
						errors.Store(packageVersion.PreviousVersion, err)
						return
					}
					if previousVersionContent != nil {
						apiType := selectDefaultApiType(append(packageVersion.ApiTypes, previousVersionContent.ApiTypes...))
						if apiType != "" {
							comparisonUrl = fmt.Sprintf("%s/portal/packages/%s/%s/compare?apiType=%s&package=%s&version=%s",
								s.systemInfoService.GetApihubUrl(), refPackageId, url.PathEscape(versionForUrl), apiType, packageVersion.PreviousVersionPackageId, url.QueryEscape(previousVersionWithoutRevision))
						}
					}
				}
			} else {
				baselinePackage, err := s.apihubClient.GetPackageByServiceName(ctx, workspaceId, pkg.Name) // pkg.Name in snapshot package = service name in baseline package
				if err != nil {
					log.Errorf("Package by servicename - %s not found", pkg.Name)
					errors.Store(pkg.Name, err)
					return
				}
				if baselinePackage != nil && baselinePackage.Id != "" {
					baselineFound = true
				}
			}

			serviceWithChanges := view.ServiceWithChanges{
				Id:                       strings.ToLower(pkg.Alias), // service name is not suitable, since it's empty for snapshot
				PackageId:                refPackageId,
				PreviousVersionPackageId: packageVersion.PreviousVersionPackageId,
				ViewChangesUrl:           comparisonUrl,
				ViewSnapshotUrl:          fmt.Sprintf("%s/portal/packages/%s/%s/overview/summary", s.systemInfoService.GetApihubUrl(), refPackageId, url.PathEscape(groupVersionForUrl)),
				ViewBaselineUrl:          viewBaselineUrl,
				BaselineFound:            baselineFound,
				BaselineVersionFound:     baselineVersionFound,
				ApiTypes:                 packageVersion.ApiTypes,
			}
			if packageVersion.ChangeSummary != nil {
				serviceWithChanges.Changes = packageVersion.ChangeSummary
			} else {
				serviceWithChanges.Changes = new(view.ChangeSummary)
			}
			result.Services[i] = serviceWithChanges
		})
	}

	wg.Wait()

	var errList []string
	errors.Range(func(key, value interface{}) bool {
		errList = append(errList, fmt.Sprintf("err: %s: %s", key, value))
		return true
	})
	if len(errList) > 0 {
		return nil, fmt.Errorf("failed to get snapshot with errors: %+v", errList)
	}

	return &result, nil
}

func (s *snapshotServiceImpl) CreateSnapshot(ctx context.Context, namespace string, workspaceId string, version string, snapshotDTO view.CreateSnapshotDTO) (*view.CreateSnapshotResponse, error) {
	log.Infof("Creating snapshot for namespace %s", namespace)

	workspace, err := s.apihubClient.GetPackageById(ctx, workspaceId)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace by id: %v", err.Error())
	}
	if workspace == nil || workspace.Kind != string(view.KindWorkspace) {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.WorkspaceNotFound,
			Message: exception.WorkspaceNotFoundMsg,
			Params:  map[string]interface{}{"workspaceId": workspaceId},
		}
	}
	versionNameValidationError := validateVersionName(version)
	if versionNameValidationError != nil {
		return nil, versionNameValidationError
	}

	serviceListResponse, err := s.agentClient.ListServices(ctx, namespace, workspaceId, snapshotDTO.AgentUrl)
	if err != nil {
		return nil, err
	}
	if serviceListResponse.Status != view.StatusComplete {
		log.Infof("Create snapshot failed: incorrect discovery status %s for namespace %s", serviceListResponse.Status, namespace)
		return nil, fmt.Errorf("unable to create snaphost since service discovery status is %s", serviceListResponse.Status)
	}
	serviceListResponse.Services = filterService(serviceListResponse.Services, snapshotDTO.Services, snapshotDTO.Promote)
	if len(serviceListResponse.Services) == 0 {
		log.Infof("Create snapshot failed: no (selected) services in namespace %s", namespace)
		return nil, fmt.Errorf("create snapshot failed: no (selected) services in namespace %s, try to run discovery", namespace)
	}

	return s.startSnapshot(ctx, namespace, workspaceId, version, serviceListResponse.Services, snapshotDTO)
}

func validateVersionName(versionName string) error {
	if strings.Contains(versionName, "@") {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.VersionNameNotAllowed,
			Message: exception.VersionNameNotAllowedMsg,
			Params:  map[string]interface{}{"version": versionName, "character": "@"},
		}
	}
	return nil
}

func filterService(allService []view.Service, requiredServices []string, promote bool) []view.Service {
	var result []view.Service
	filter := map[string]struct{}{}
	for _, svc := range requiredServices {
		filter[svc] = struct{}{}
	}
	filterByList := len(requiredServices) > 0
	for _, svc := range allService {
		if filterByList {
			if _, exists := filter[svc.Id]; exists && len(svc.Documents) > 0 {
				if promote {
					if svc.Baseline != nil && svc.Baseline.PackageId != "" {
						result = append(result, svc)
					}
				} else {
					result = append(result, svc)
				}
			}
		} else {
			if len(svc.Documents) > 0 {
				if promote {
					if svc.Baseline != nil && svc.Baseline.PackageId != "" {
						result = append(result, svc)
					}
				} else {
					result = append(result, svc)
				}
			}
		}
	}
	return result
}

func (s *snapshotServiceImpl) startSnapshot(ctx context.Context, namespace string, workspaceId string, version string, services []view.Service, snapshotDTO view.CreateSnapshotDTO) (*view.CreateSnapshotResponse, error) {
	// TODO: handle errors!

	var packageIds []string
	var groupId, dashboardId string
	var err error

	if !snapshotDTO.Promote {
		sysCtx := secctx.MakeSysadminContext(context.Background()) // Create groups using api-key since user may not have enough privileges
		groupId, err = s.prepareNamespaceGroup(sysCtx, namespace, workspaceId, snapshotDTO.CloudName)
		if err != nil {
			return nil, fmt.Errorf("prepare snapshot failed: %s", err.Error())
		}
		dashboardId, err = s.prepareDashboard(sysCtx, groupId)
		if err != nil {
			return nil, fmt.Errorf("prepare snapshot failed: %s", err.Error())
		}
		packageIds, err = s.preparePackages(sysCtx, services, groupId)
		if err != nil {
			return nil, fmt.Errorf("prepare snapshot failed: %s", err.Error())
		}
	}

	configs := make([]view.BuildConfig, len(services))

	wg := sync.WaitGroup{}
	for it, svcIt := range services {
		svc := svcIt
		i := it
		packageId := groupId + "." + utils.ToId(svc.Id)
		wg.Add(1)
		utils.SafeAsync(func() {
			svcPreviousVersion := snapshotDTO.PreviousVersion
			defer wg.Done()
			if svcPreviousVersion != "" {
				if svc.Baseline == nil {
					svcPreviousVersion = ""
				} else {
					baselinePkgVersionEnt, err := s.apihubClient.GetVersion(ctx, svc.Baseline.PackageId, svcPreviousVersion)
					if err != nil {
						log.Errorf("Failed to get previous version %s for package %s", svcPreviousVersion, svc.Baseline.PackageId)
						return
					}
					if baselinePkgVersionEnt == nil || baselinePkgVersionEnt.Status == string(view.DraftStatus) {
						invalidVersion := svcPreviousVersion
						svcPreviousVersion = ""
						for i, ver := range svc.Baseline.Versions {
							if ver == invalidVersion {
								svc.Baseline.Versions = append(svc.Baseline.Versions[:i], svc.Baseline.Versions[i+1:]...)
								break
							}
						}

					}
				}
			}
			var buildConfig view.BuildConfig
			if snapshotDTO.Promote {
				buildConfig = view.BuildConfig{
					PackageId:                svc.Baseline.PackageId,
					Version:                  version,
					PreviousVersion:          svcPreviousVersion,
					PreviousVersionPackageId: "",
					Status:                   snapshotDTO.VersionStatus,
					Files:                    make([]view.BCFile, 0),
					Refs:                     make([]view.BCRef, 0),
					PublishId:                uuid.New().String(),
					ServiceId:                svc.Id,
					CreatedBy:                secctx.GetUserId(ctx),
					ApihubPackageUrl:         fmt.Sprintf("%s/portal/packages/%s/%s/overview/summary", s.systemInfoService.GetApihubUrl(), svc.Baseline.PackageId, url.PathEscape(version)),
					Metadata:                 map[string]interface{}{},
					BuildType:                view.BuildType,
				}
			} else {
				previousVersionPackageId := ""
				if svcPreviousVersion != "" {
					if svc.Baseline != nil {
						previousVersionPackageId = svc.Baseline.PackageId
					}
				}
				buildConfig = view.BuildConfig{
					PackageId:                packageId,
					Version:                  version,
					PreviousVersion:          svcPreviousVersion,
					PreviousVersionPackageId: previousVersionPackageId,
					Status:                   snapshotDTO.VersionStatus,
					Files:                    make([]view.BCFile, 0),
					Refs:                     make([]view.BCRef, 0),
					PublishId:                uuid.New().String(),
					ServiceId:                svc.Id,
					ApihubPackageUrl:         fmt.Sprintf("%s/portal/packages/%s/%s/overview/summary", s.systemInfoService.GetApihubUrl(), packageId, url.PathEscape(version)),
					CreatedBy:                secctx.GetUserId(ctx),
					Metadata:                 map[string]interface{}{},
					BuildType:                view.BuildType,
				}
			}

			var labels []string
			for k, v := range svc.Labels {
				labels = append(labels, fmt.Sprintf("%s:%s", k, v))
			}
			buildConfig.Metadata["versionLabels"] = labels
			buildConfig.Metadata["cloudName"] = snapshotDTO.CloudName
			buildConfig.Metadata["namespace"] = namespace

			for _, spec := range svc.Documents {
				buildConfig.Files = append(buildConfig.Files,
					view.BCFile{
						FileId:   spec.FileId,
						Publish:  true,
						Labels:   make([]string, 0),
						XApiKind: spec.XApiKind,
					})
			}

			log.Infof("Generated build config: %+v", buildConfig)
			configs[i] = buildConfig
		})
	}

	var refs []view.BCRef
	for _, pkgId := range packageIds {
		refs = append(refs, view.BCRef{
			RefId:   pkgId,
			Version: version,
		})
	}
	var groupBuildConfig *view.BuildConfig
	if snapshotDTO.Promote {
		//no group publish
	} else {
		groupBuildConfig = &view.BuildConfig{
			PackageId:                dashboardId,
			Version:                  version,
			PreviousVersion:          "",
			PreviousVersionPackageId: "",
			Status:                   string(view.DraftStatus),
			Files:                    make([]view.BCFile, 0),
			Refs:                     refs,
			PublishId:                uuid.New().String(),
			CreatedBy:                secctx.GetUserId(ctx),
			Metadata:                 map[string]interface{}{},
			BuildType:                view.BuildType,
		}
	}

	wg.Wait()

	utils.SafeAsync(func() {
		//a new context is required, as the request context will be canceled after the response is sent
		secCtx := ctx.Value("secCtx")
		ctx := context.WithValue(context.Background(), "secCtx", secCtx)
		publishIds := make([]string, len(services))
		wg := sync.WaitGroup{}
		for svcIndIt, svcIt := range services {
			svcInd := svcIndIt
			svc := svcIt
			wg.Add(1)
			utils.SafeAsync(func() {
				defer wg.Done()

				zipBuf := bytes.Buffer{}
				zw := zip.NewWriter(&zipBuf)

				for specInd, spec := range svc.Documents {
					specBytes, err := s.agentClient.GetServiceSpecification(ctx, namespace, workspaceId, svc.Id, spec.FileId, snapshotDTO.AgentUrl)
					if err != nil {
						log.Errorf("error: unable to get specification %s: %s", svc.Id, err.Error())
						return
					}
					fileName := configs[svcInd].Files[specInd].FileId
					err = addFileToZip(zw, fileName, specBytes)
					if err != nil {
						log.Errorf("error: unable to add spec %s to src archive: %s", fileName, err.Error())
						return
					}
				}
				err = zw.Close()
				if err != nil {
					log.Errorf("error: unable to close src archive: %s", err.Error())
					return
				}

				_, err = s.apihubClient.Publish(ctx, configs[svcInd], zipBuf.Bytes(), snapshotDTO.ClientBuild, snapshotDTO.BuilderId, false, nil)
				if err != nil {
					log.Errorf("Failed to send publish request: %s", err.Error())
					return
				}
				publishIds[svcInd] = configs[svcInd].PublishId
			})
		}
		wg.Wait()

		if !snapshotDTO.Promote {
			//TODO this will produce an error if at least one service is not sent to publish
			_, err = s.apihubClient.Publish(ctx, *groupBuildConfig, nil, false, "", false, publishIds)
			if err != nil {
				log.Errorf("Failed to send publish request: %s", err.Error())
				return
			}
		}
	})

	if snapshotDTO.Promote {
		return &view.CreateSnapshotResponse{
			Snapshot: nil,
			Services: configs,
		}, nil
	} else {
		return &view.CreateSnapshotResponse{
			Snapshot: &view.GroupBuildConfig{
				PackageId: groupBuildConfig.PackageId,
				PublishId: groupBuildConfig.PublishId,
			},
			Services: configs,
		}, nil
	}
}

func (s *snapshotServiceImpl) prepareNamespaceGroup(ctx context.Context, namespace string, workspaceId string, cloudName string) (string, error) {
	namespaceGroupId := fmt.Sprintf("%s.%s.%s.%s", workspaceId, view.DefaultSnapshotsGroupAlias, utils.ToId(cloudName), utils.ToId(namespace)) // Generate group id for namespace

	namespaceGroup, err := s.apihubClient.GetPackageById(ctx, namespaceGroupId)
	if err != nil {
		return "", fmt.Errorf("unable to get group %s: %s", namespaceGroupId, err)
	}
	if namespaceGroup == nil {
		cloudGroupParentId := fmt.Sprintf("%s.%s", workspaceId, view.DefaultSnapshotsGroupAlias)
		parentGroup, err := s.apihubClient.GetPackageById(ctx, cloudGroupParentId)
		if err != nil {
			return "", fmt.Errorf("unable to get group %s: %s", cloudGroupParentId, err)
		}
		if parentGroup == nil {
			err = s.createGroupHierarchy(ctx, cloudGroupParentId)
			if err != nil {
				return "", fmt.Errorf("unable to create cloud parent group %s: %s", cloudGroupParentId, err)
			}
		} else if parentGroup.Kind != string(view.KindGroup) {
			return "", fmt.Errorf("package %s exists but is not a group (kind: %s)", cloudGroupParentId, parentGroup.Kind)
		}
		cloudGroupId := fmt.Sprintf("%s.%s", cloudGroupParentId, utils.ToId(cloudName))
		err = s.createGroupIfRequired(ctx, cloudGroupId, cloudName, cloudGroupParentId)
		if err != nil {
			return "", fmt.Errorf("unable to create cloud group %s: %s", cloudGroupId, err)
		}
		_, err = s.apihubClient.CreatePackage(ctx, view.PackageCreateRequest{
			ParentId: cloudGroupId,
			Kind:     string(view.KindGroup),
			Name:     namespace,
			Alias:    utils.ToId(namespace),
		})
		if err != nil {
			return "", fmt.Errorf("unable to create namespace group %s: %s", namespaceGroupId, err)
		}
	} else if namespaceGroup.Kind != string(view.KindGroup) {
		return "", fmt.Errorf("package %s exists but is not a group (kind: %s)", namespaceGroupId, namespaceGroup.Kind)
	}
	return namespaceGroupId, nil
}

func (s *snapshotServiceImpl) createGroupHierarchy(ctx context.Context, targetGroupId string) error {
	parts := strings.Split(targetGroupId, ".")
	for i := range parts {
		groupId := ""
		parentId := ""
		for j := 0; j <= i; j++ {
			if j > 0 {
				groupId = groupId + "." + parts[j]
				if j < i {
					parentId = parentId + "." + parts[j]
				}
			} else {
				groupId = parts[j]
				parentId = parts[j]
			}
		}

		group, err := s.apihubClient.GetPackageById(ctx, groupId)
		if err != nil {
			return fmt.Errorf("unable to get group %s: %s", groupId, err)
		}

		//the first part of targetGroupId is workspace - only check existence, don't create
		if i == 0 {
			if group == nil {
				return fmt.Errorf("workspace %s does not exist", groupId)
			}
			continue
		}

		if group == nil {
			excludeFromSearch := true
			_, err := s.apihubClient.CreatePackage(ctx, view.PackageCreateRequest{
				ParentId:          parentId,
				Kind:              string(view.KindGroup),
				Name:              parts[i],
				Alias:             parts[i],
				ExcludeFromSearch: &excludeFromSearch,
				DefaultRole:       "editor",
			})
			if err != nil {
				return err
			}
		} else if group.Kind != string(view.KindGroup) {
			return fmt.Errorf("package %s exists but is not a group (kind: %s)", groupId, group.Kind)
		}
	}
	return nil
}

func (s *snapshotServiceImpl) createGroupIfRequired(ctx context.Context, id string, name string, parentId string) error {
	group, err := s.apihubClient.GetPackageById(ctx, id)
	if err != nil {
		return err
	}
	if group == nil {
		_, err := s.apihubClient.CreatePackage(ctx, view.PackageCreateRequest{
			ParentId: parentId,
			Kind:     string(view.KindGroup),
			Name:     name,
			Alias:    utils.ToId(name),
		})
		if err != nil {
			return err
		}
	} else if group.Kind != string(view.KindGroup) {
		return fmt.Errorf("package %s exists but is not a group (kind: %s)", id, group.Kind)
	}
	return nil
}

func (s *snapshotServiceImpl) prepareDashboard(ctx context.Context, groupId string) (string, error) {
	dashboardId := view.MakeSnapshotDashboardIdByGroupId(groupId)
	dashboard, err := s.apihubClient.GetPackageById(ctx, dashboardId)
	if err != nil {
		return "", fmt.Errorf("unable to get dashboard %s: %s", dashboardId, err)
	}
	if dashboard == nil {
		group, err := s.apihubClient.GetPackageById(ctx, groupId)
		if err != nil {
			return "", fmt.Errorf("unable to get group %s: %s", groupId, err)
		}
		if group == nil {
			return "", fmt.Errorf("prepare snapshot failed: group with id %s doesn't exist", groupId)
		} else if group.Kind != string(view.KindGroup) {
			return "", fmt.Errorf("package %s exists but is not a group (kind: %s)", groupId, group.Kind)
		}

		_, err = s.apihubClient.CreatePackage(ctx, view.PackageCreateRequest{
			ParentId: groupId,
			Kind:     string(view.KindDashbord),
			Name:     "snapshot",
			Alias:    utils.ToId("snapshot-dash"),
		})
		if err != nil {
			return "", fmt.Errorf("unable to create dashboard %s in group: %s. Error - %s", utils.ToId("snapshot-dash"), groupId, err.Error())
		}
	} else if dashboard.Kind != string(view.KindDashbord) {
		return "", fmt.Errorf("package %s exists but is not a dashboard (kind: %s)", dashboardId, dashboard.Kind)
	}
	return dashboardId, nil
}

func (s *snapshotServiceImpl) preparePackages(ctx context.Context, services []view.Service, parentId string) ([]string, error) {
	ids := make([]string, len(services))
	errGrp, _ := errgroup.WithContext(ctx)
	for ii, svcIt := range services {
		i := ii
		svc := svcIt
		errGrp.Go(func() error {
			pkgId := parentId + "." + utils.ToId(svc.Id)
			pkg, err := s.apihubClient.GetPackageById(ctx, pkgId)
			if err != nil {
				return fmt.Errorf("failed to get package %s: %s", pkgId, err)
			}
			if pkg == nil {
				_, err := s.apihubClient.CreatePackage(ctx, view.PackageCreateRequest{
					ParentId:    parentId,
					Kind:        string(view.KindPackage),
					Name:        svc.Name,
					Alias:       utils.ToId(svc.Id),
					ServiceName: "", // Blank here, service name should be set for baseline only!
				})
				if err != nil {
					return fmt.Errorf("failed to create package %s: %s", parentId+"."+utils.ToId(svc.Id), err)
				}
			} else if pkg.Kind != string(view.KindPackage) {
				return fmt.Errorf("package %s exists but is not a package (kind: %s)", svc.Id, pkg.Kind)
			}
			ids[i] = pkgId
			return nil
		})
	}

	err := errGrp.Wait()
	if err != nil {
		return nil, err
	}

	return ids, nil
}

func addFileToZip(zw *zip.Writer, name string, content []byte) error {
	mdFw, err := zw.Create(name)
	if err != nil {
		return err
	}
	_, err = mdFw.Write(content)
	if err != nil {
		return err
	}
	return nil
}

func selectDefaultApiType(versionsApiType []string) string {
	apiTypePriorities := []string{string(view.RestApiType), string(view.GraphqlApiType), string(view.ProtobufApiType)}
	for _, priorityType := range apiTypePriorities {
		for _, existingType := range versionsApiType {
			if priorityType == strings.ToLower(existingType) {
				return priorityType
			}
		}
	}
	return ""
}
