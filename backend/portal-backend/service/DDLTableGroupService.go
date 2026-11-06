package service

import (
	"context"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/view"
	"github.com/google/uuid"
)

type DDLTableGroupService interface {
	ListDdlTableGroups(ctx context.Context, packageId, versionName string) (*view.DdlTableGroupListView, error)
	GetGroupedDdlEntities(ctx context.Context, packageId, versionName, groupName, refPackageId, textFilter string, limit, offset int) (*view.GroupedDdlEntitiesView, error)
	CreateDdlTableGroup(ctx context.Context, packageId, versionName string, req view.CreateDdlTableGroupReq) error
	UpdateDdlTableGroup(ctx context.Context, packageId, versionName, groupName string, req view.UpdateDdlTableGroupReq) error
	DeleteDdlTableGroup(ctx context.Context, packageId, versionName, groupName string) error
	// GetDdlEntityGroupNames maps a member key built by entity.MakeDdlEntityGroupKey to the names of
	// the version's groups the DDL entity belongs to.
	GetDdlEntityGroupNames(ctx context.Context, packageId, versionName string) (map[string][]string, error)
}

func NewDDLTableGroupService(ddlTableGroupRepo repository.DDLTableGroupRepository,
	publishedRepo repository.PublishedRepository,
	packageVersionEnrichmentService PackageVersionEnrichmentService) DDLTableGroupService {
	return &ddlTableGroupServiceImpl{
		ddlTableGroupRepo:               ddlTableGroupRepo,
		publishedRepo:                   publishedRepo,
		packageVersionEnrichmentService: packageVersionEnrichmentService,
	}
}

type ddlTableGroupServiceImpl struct {
	ddlTableGroupRepo               repository.DDLTableGroupRepository
	publishedRepo                   repository.PublishedRepository
	packageVersionEnrichmentService PackageVersionEnrichmentService
}

func (s *ddlTableGroupServiceImpl) resolveVersion(ctx context.Context, packageId, versionName string) (*entity.PublishedVersionEntity, error) {
	versionEnt, err := s.publishedRepo.GetVersion(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName, "packageId": packageId},
		}
	}
	return versionEnt, nil
}

func (s *ddlTableGroupServiceImpl) ListDdlTableGroups(ctx context.Context, packageId, versionName string) (*view.DdlTableGroupListView, error) {
	versionEnt, err := s.resolveVersion(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	groups, err := s.ddlTableGroupRepo.ListDdlTableGroups(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	result := &view.DdlTableGroupListView{Groups: make([]view.DdlTableGroupView, 0, len(groups))}
	for _, group := range groups {
		result.Groups = append(result.Groups, entity.MakeDdlTableGroupView(group))
	}
	return result, nil
}

func (s *ddlTableGroupServiceImpl) GetGroupedDdlEntities(ctx context.Context, packageId, versionName, groupName, refPackageId, textFilter string, limit, offset int) (*view.GroupedDdlEntitiesView, error) {
	if err := checkRefPackageIdSupported(ctx, s.publishedRepo, packageId, refPackageId); err != nil {
		return nil, err
	}
	versionEnt, err := s.resolveVersion(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	groupEnt, err := s.getExistingGroup(ctx, versionEnt, groupName)
	if err != nil {
		return nil, err
	}
	entities, err := s.ddlTableGroupRepo.GetGroupedDdlEntities(ctx, groupEnt.GroupId, refPackageId, textFilter, limit, offset)
	if err != nil {
		return nil, err
	}
	result := &view.GroupedDdlEntitiesView{
		GroupName:   groupEnt.GroupName,
		Description: groupEnt.Description,
		Entities:    make([]interface{}, 0, len(entities)),
	}
	packageVersions := make(map[string][]string)
	for _, ent := range entities {
		result.Entities = append(result.Entities, entity.MakeDdlContractEntityView(ent, nil))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
	}
	packagesRefs, err := s.packageVersionEnrichmentService.GetPackageVersionRefsMap(ctx, packageVersions)
	if err != nil {
		return nil, err
	}
	result.Packages = packagesRefs
	return result, nil
}

func (s *ddlTableGroupServiceImpl) getExistingGroup(ctx context.Context, versionEnt *entity.PublishedVersionEntity, groupName string) (*entity.DDLTableGroupEntity, error) {
	groupEnt, err := s.ddlTableGroupRepo.GetDdlTableGroup(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, groupName)
	if err != nil {
		return nil, err
	}
	if groupEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.DdlTableGroupNotFound,
			Message: exception.DdlTableGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		}
	}
	return groupEnt, nil
}

func (s *ddlTableGroupServiceImpl) CreateDdlTableGroup(ctx context.Context, packageId, versionName string, req view.CreateDdlTableGroupReq) error {
	versionEnt, err := s.resolveVersion(ctx, packageId, versionName)
	if err != nil {
		return err
	}
	if req.GroupName == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyDdlTableGroupName,
			Message: exception.EmptyDdlTableGroupNameMsg,
		}
	}
	existingGroup, err := s.ddlTableGroupRepo.GetDdlTableGroup(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, req.GroupName)
	if err != nil {
		return err
	}
	if existingGroup != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.DdlTableGroupAlreadyExists,
			Message: exception.DdlTableGroupAlreadyExistsMsg,
			Params:  map[string]interface{}{"groupName": req.GroupName},
		}
	}
	newGroup := &entity.DDLTableGroupEntity{
		PackageId:   versionEnt.PackageId,
		Version:     versionEnt.Version,
		Revision:    versionEnt.Revision,
		GroupName:   req.GroupName,
		GroupId:     uuid.NewString(),
		Description: req.Description,
	}
	members, err := s.makeGroupedDdlTableEntities(ctx, versionEnt, newGroup, req.Tables)
	if err != nil {
		return err
	}
	return s.ddlTableGroupRepo.CreateDdlTableGroup(ctx, newGroup, members)
}

func (s *ddlTableGroupServiceImpl) UpdateDdlTableGroup(ctx context.Context, packageId, versionName, groupName string, req view.UpdateDdlTableGroupReq) error {
	versionEnt, err := s.resolveVersion(ctx, packageId, versionName)
	if err != nil {
		return err
	}
	existingGroup, err := s.getExistingGroup(ctx, versionEnt, groupName)
	if err != nil {
		return err
	}
	if req.GroupName == nil && req.Description == nil && req.Tables == nil {
		return nil
	}
	updatedGroup := *existingGroup
	if req.GroupName != nil && *req.GroupName != existingGroup.GroupName {
		if *req.GroupName == "" {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.EmptyDdlTableGroupName,
				Message: exception.EmptyDdlTableGroupNameMsg,
			}
		}
		conflictingGroup, err := s.ddlTableGroupRepo.GetDdlTableGroup(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, *req.GroupName)
		if err != nil {
			return err
		}
		if conflictingGroup != nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.DdlTableGroupAlreadyExists,
				Message: exception.DdlTableGroupAlreadyExistsMsg,
				Params:  map[string]interface{}{"groupName": *req.GroupName},
			}
		}
		updatedGroup.GroupName = *req.GroupName
	}
	if req.Description != nil {
		updatedGroup.Description = *req.Description
	}
	var newMembers *[]entity.GroupedDdlTableEntity
	if req.Tables != nil {
		members, err := s.makeGroupedDdlTableEntities(ctx, versionEnt, &updatedGroup, *req.Tables)
		if err != nil {
			return err
		}
		newMembers = &members
	}
	return s.ddlTableGroupRepo.UpdateDdlTableGroup(ctx, existingGroup, &updatedGroup, newMembers)
}

func (s *ddlTableGroupServiceImpl) DeleteDdlTableGroup(ctx context.Context, packageId, versionName, groupName string) error {
	versionEnt, err := s.resolveVersion(ctx, packageId, versionName)
	if err != nil {
		return err
	}
	existingGroup, err := s.getExistingGroup(ctx, versionEnt, groupName)
	if err != nil {
		return err
	}
	return s.ddlTableGroupRepo.DeleteDdlTableGroup(ctx, existingGroup)
}

// makeGroupedDdlTableEntities resolves the requested tables to member rows, mirroring
// operationGroupServiceImpl.makeGroupedOperationEntities. Since grouped_ddl_table has no foreign key
// to ddl_tables, it additionally verifies that every resolved entity exists.
func (s *ddlTableGroupServiceImpl) makeGroupedDdlTableEntities(ctx context.Context, versionEnt *entity.PublishedVersionEntity, groupEnt *entity.DDLTableGroupEntity, tables []view.DdlGroupTable) ([]entity.GroupedDdlTableEntity, error) {
	if len(tables) > view.DdlTableGroupTablesLimit {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.DdlTableGroupTablesLimitExceeded,
			Message: exception.DdlTableGroupTablesLimitExceededMsg,
			Params:  map[string]interface{}{"limit": view.DdlTableGroupTablesLimit},
		}
	}
	allowedVersions := make(map[string]struct{})
	refs, err := s.publishedRepo.GetVersionRefsV3(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	if len(refs) > 0 {
		for _, ref := range refs {
			if ref.Excluded {
				continue
			}
			allowedVersions[view.MakePackageRefKey(ref.RefPackageId, ref.RefVersion, ref.RefRevision)] = struct{}{}
		}
	} else {
		allowedVersions[view.MakePackageRefKey(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)] = struct{}{}
	}

	members := make([]entity.GroupedDdlTableEntity, 0, len(tables))
	seenMembers := make(map[string]struct{}, len(tables))
	//versionMapCache includes version revision so any version without specified '@revision' will not hit the cache
	versionMapCache := make(map[string]entity.PublishedVersionEntity)
	for _, table := range tables {
		member := entity.GroupedDdlTableEntity{
			GroupId:     groupEnt.GroupId,
			DdlEntityId: table.DdlEntityId,
		}
		if table.PackageId == "" || table.Version == "" {
			member.PackageId = groupEnt.PackageId
			member.Version = groupEnt.Version
			member.Revision = groupEnt.Revision
		} else {
			tableVersion, tableRevision, err := repository.SplitVersionRevision(table.Version)
			if err != nil {
				return nil, err
			}
			if cachedVersion, cached := versionMapCache[view.MakePackageRefKey(table.PackageId, tableVersion, tableRevision)]; cached {
				member.PackageId = cachedVersion.PackageId
				member.Version = cachedVersion.Version
				member.Revision = cachedVersion.Revision
			} else {
				tableVersionEnt, err := s.publishedRepo.GetVersion(ctx, table.PackageId, table.Version)
				if err != nil {
					return nil, err
				}
				if tableVersionEnt == nil {
					return nil, &exception.CustomError{
						Status:  http.StatusNotFound,
						Code:    exception.PublishedPackageVersionNotFound,
						Message: exception.PublishedPackageVersionNotFoundMsg,
						Params:  map[string]interface{}{"version": table.Version, "packageId": table.PackageId},
					}
				}
				versionKey := view.MakePackageRefKey(tableVersionEnt.PackageId, tableVersionEnt.Version, tableVersionEnt.Revision)
				if _, allowed := allowedVersions[versionKey]; !allowed {
					return nil, &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.DdlTableGroupVersionNotAllowed,
						Message: exception.DdlTableGroupVersionNotAllowedMsg,
						Params:  map[string]interface{}{"version": table.Version, "packageId": table.PackageId},
					}
				}
				versionMapCache[versionKey] = *tableVersionEnt
				member.PackageId = tableVersionEnt.PackageId
				member.Version = tableVersionEnt.Version
				member.Revision = tableVersionEnt.Revision
			}
		}
		//the member primary key rejects duplicates with a raw driver error, so drop them here
		memberKey := entity.MakeGroupedDdlTableKey(member.PackageId, member.Version, member.Revision, member.DdlEntityId)
		if _, seen := seenMembers[memberKey]; seen {
			continue
		}
		seenMembers[memberKey] = struct{}{}
		members = append(members, member)
	}

	existingEntities, err := s.ddlTableGroupRepo.FilterExistingDdlEntities(ctx, members)
	if err != nil {
		return nil, err
	}
	for _, member := range members {
		memberKey := entity.MakeGroupedDdlTableKey(member.PackageId, member.Version, member.Revision, member.DdlEntityId)
		if _, exists := existingEntities[memberKey]; !exists {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.DdlEntityNotFound,
				Message: exception.DdlEntityNotFoundMsg,
				Params:  map[string]interface{}{"ddlEntityId": member.DdlEntityId},
			}
		}
	}
	return members, nil
}

func (s *ddlTableGroupServiceImpl) GetDdlEntityGroupNames(ctx context.Context, packageId, versionName string) (map[string][]string, error) {
	versionEnt, err := s.resolveVersion(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	rows, err := s.ddlTableGroupRepo.GetVersionGroupedDdlTableNames(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}
	result := make(map[string][]string, len(rows))
	for _, row := range rows {
		key := entity.MakeGroupedDdlTableKey(row.PackageId, row.Version, row.Revision, row.DdlEntityId)
		result[key] = append(result[key], row.GroupName)
	}
	return result, nil
}
