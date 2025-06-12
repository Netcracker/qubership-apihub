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

package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

const KIND_PACKAGE = "package"
const KIND_GROUP = "group"
const KIND_WORKSPACE = "workspace"

const KIND_DASHBOARD = "dashboard"

type PackageEntity struct {
	tableName struct{} `pg:"package_group, alias:package_group"`

	Id                    string     `pg:"id, pk, type:varchar"`
	Kind                  string     `pg:"kind, type:varchar"`
	Name                  string     `pg:"name, type:varchar"`
	ParentId              string     `pg:"parent_id, type:varchar"`
	Alias                 string     `pg:"alias, type:varchar"`
	Description           string     `pg:"description, type:varchar"`
	ImageUrl              string     `pg:"image_url, type:varchar"`
	CreatedAt             time.Time  `pg:"created_at, type:timestamp without time zone"`
	CreatedBy             string     `pg:"created_by, type:varchar"`
	DeletedAt             *time.Time `pg:"deleted_at, type:timestamp without time zone"`
	DeletedBy             string     `pg:"deleted_by, type:varchar"`
	LastVersion           string     `pg:"-"`
	DefaultRole           string     `pg:"default_role, type:varchar, use_zero, default:Viewer"`
	DefaultReleaseVersion string     `pg:"default_released_version, type:varchar"`
	ServiceName           string     `pg:"service_name, type:varchar"`
	ReleaseVersionPattern string     `pg:"release_version_pattern, type:varchar"`
	ExcludeFromSearch     bool       `pg:"exclude_from_search, type:bool, use_zero"`
	RestGroupingPrefix    string     `pg:"rest_grouping_prefix, type:varchar"`
}

type PackageVersionRichEntity struct {
	tableName struct{} `pg:"published_version, alias:published_version"`

	PublishedVersionEntity
	PackageName       string   `pg:"package_name, type:varchar"`
	ServiceName       string   `pg:"service_name, type:varchar"`
	Kind              string   `pg:"kind, type:varchar"`
	ParentNames       []string `pg:"parent_names, type:varchar[]"`
	NotLatestRevision bool     `pg:"not_latest_revision, type:bool"`
}

type PackageVersionRevisionEntity_deprecated struct {
	tableName struct{} `pg:"published_version, alias:published_version"`

	PublishedVersionEntity
	UserEntity
	NotLatestRevision bool `pg:"not_latest_revision, type:bool"`
}

type PackageVersionRevisionEntity struct {
	tableName struct{} `pg:"published_version, alias:published_version"`

	PublishedVersionEntity
	PrincipalEntity
	NotLatestRevision       bool `pg:"not_latest_revision, type:bool"`
	PreviousVersionRevision int  `pg:"previous_version_revision, type:integer"`
}

type PackageVersionHistoryEntity struct {
	tableName struct{} `pg:"published_version, alias:published_version"`

	PublishedVersionEntity
	ApiTypes []string `pg:"api_types, type:varchar[]"`
}

type PackageFavEntity struct {
	tableName struct{} `pg:"package_group, alias:package_group"`

	PackageEntity

	UserId string `pg:"user_id, pk, type:varchar"`
}

type PublishedVersionEntity struct {
	tableName struct{} `pg:"published_version"`

	PackageId                string     `pg:"package_id, pk, type:varchar"`
	Version                  string     `pg:"version, pk, type:varchar"`
	Revision                 int        `pg:"revision, pk, type:integer"`
	PreviousVersion          string     `pg:"previous_version, type:varchar"`
	PreviousVersionPackageId string     `pg:"previous_version_package_id, type:varchar"`
	Status                   string     `pg:"status, type:varchar"`
	PublishedAt              time.Time  `pg:"published_at, type:timestamp without time zone"`
	DeletedAt                *time.Time `pg:"deleted_at, type:timestamp without time zone"`
	DeletedBy                string     `pg:"deleted_by, type:varchar"`
	Metadata                 Metadata   `pg:"metadata, type:jsonb"`
	Labels                   []string   `pg:"labels, type:varchar array, array"`
	CreatedBy                string     `pg:"created_by, type:varchar"`
}

// todo remove this entity after migration createdBy:string -> createdBy:UserObject
type ReadonlyPublishedVersionEntity_deprecated struct {
	tableName struct{} `pg:"published_version, alias:published_version"`

	PublishedVersionEntity
	UserName                string `pg:"user_name, type:varchar"`
	PreviousVersionRevision int    `pg:"previous_version_revision, type:integer"`
}

type PublishedVersionSearchQueryEntity struct {
	PackageId  string `pg:"package_id, type:varchar, use_zero"`
	Status     string `pg:"status, type:varchar, use_zero"`
	Label      string `pg:"label, type:varchar, use_zero"`
	TextFilter string `pg:"text_filter, type:varchar, use_zero"`
	SortBy     string `pg:"sort_by, type:varchar, use_zero"`
	SortOrder  string `pg:"sort_order, type:varchar, use_zero"`
	Limit      int    `pg:"limit, type:integer, use_zero"`
	Offset     int    `pg:"offset, type:integer, use_zero"`
}

func GetVersionSortOrderPG(sortOrder string) string {
	switch sortOrder {
	case view.VersionSortOrderAsc:
		return "asc"
	case view.VersionSortOrderDesc:
		return "desc"
	}
	return ""
}

func GetVersionSortByPG(sortBy string) string {
	switch sortBy {
	case view.VersionSortByVersion:
		return "version"
	case view.VersionSortByCreatedAt:
		return "published_at"
	}
	return ""
}

type PackageVersionSearchQueryEntity struct {
	PackageId          string `pg:"package_id, type:varchar, use_zero"`
	Version            string `pg:"version, type:varchar, use_zero"`
	Revision           int    `pg:"revision, type:integer, use_zero"`
	Kind               string `pg:"kind, type:varchar, use_zero"`
	TextFilter         string `pg:"text_filter, type:varchar, use_zero"`
	Limit              int    `pg:"limit, type:integer, use_zero"`
	Offset             int    `pg:"offset, type:integer, use_zero"`
	ShowAllDescendants bool   `pg:"show_all_descendants, type:bool, use_zero"`
}

type PublishedShortVersionEntity struct {
	tableName struct{} `pg:"published_version,discard_unknown_columns"`

	PackageId   string    `pg:"package_id, pk, type:varchar"`
	Version     string    `pg:"version, pk, type:varchar"`
	Revision    int       `pg:"revision, pk, type:integer"`
	Status      string    `pg:"status, type:varchar"`
	PublishedAt time.Time `pg:"published_at, type:timestamp without time zone"`
}

type PublishedContentEntity struct {
	tableName struct{} `pg:"published_version_revision_content, alias:published_version_revision_content"`
	// TODO: not sure about pk
	PackageId    string   `pg:"package_id, pk, type:varchar"`
	Version      string   `pg:"version, pk, type:varchar"`
	Revision     int      `pg:"revision, pk, type:integer"`
	FileId       string   `pg:"file_id, pk, type:varchar"`
	Checksum     string   `pg:"checksum, type:varchar"`
	Index        int      `pg:"index, type:integer, use_zero"`
	Slug         string   `pg:"slug, type:varchar"`
	Name         string   `pg:"name, type:varchar"`
	Path         string   `pg:"path, type:varchar"`
	DataType     string   `pg:"data_type, type:varchar"`
	Format       string   `pg:"format, type:varchar"`
	Title        string   `pg:"title, type:varchar"`
	Metadata     Metadata `pg:"metadata, type:jsonb"`
	ReferenceId  string   `pg:"-"`
	OperationIds []string `pg:"operation_ids, type:varchar[], array"`
	Filename     string   `pg:"filename, type:varchar"`
}

type PublishedContentWithDataEntity struct {
	tableName struct{} `pg:"published_version_revision_content, alias:published_version_revision_content"`
	PublishedContentEntity
	PublishedContentDataEntity
}

type PublishedContentDataEntity struct {
	tableName struct{} `pg:"published_data"`

	PackageId string `pg:"package_id, pk, type:varchar"`
	Checksum  string `pg:"checksum, pk, type:varchar"`
	MediaType string `pg:"media_type, type:varchar"`
	Data      []byte `pg:"data, type:bytea"`
}

type TransformedContentDataEntity struct {
	tableName struct{} `pg:"transformed_content_data"`

	PackageId     string                 `pg:"package_id, pk, type:varchar"`
	Version       string                 `pg:"version, pk, type:varchar"`
	Revision      int                    `pg:"revision, pk, type:integer"`
	ApiType       string                 `pg:"api_type, pk, type:varchar"`
	GroupId       string                 `pg:"group_id, pk, type:varchar"`
	BuildType     view.BuildType         `pg:"build_type, pk, type:varchar"`
	Format        string                 `pg:"format, pk, type:varchar"`
	Data          []byte                 `pg:"data, type:bytea"`
	DocumentsInfo []view.PackageDocument `pg:"documents_info, type:jsonb"`
}

type PublishedReferenceEntity struct {
	tableName struct{} `pg:"published_version_reference, alias:published_version_reference"`

	PackageId          string `pg:"package_id, pk, type:varchar"`
	Version            string `pg:"version, pk, type:varchar"`
	Revision           int    `pg:"revision, pk, type:integer"`
	RefPackageId       string `pg:"reference_id, pk, type:varchar"`
	RefVersion         string `pg:"reference_version, pk, type:varchar"`
	RefRevision        int    `pg:"reference_revision, pk, type:integer"`
	ParentRefPackageId string `pg:"parent_reference_id, pk, type:varchar, use_zero"`
	ParentRefVersion   string `pg:"parent_reference_version, pk, type:varchar, use_zero"`
	ParentRefRevision  int    `pg:"parent_reference_revision, pk, type:integer, use_zero"`
	Excluded           bool   `pg:"excluded, type:boolean, use_zero"`
}

type PublishedReferenceContainer struct {
	References map[string]PublishedReferenceEntity
}

type SharedUrlInfoEntity struct {
	tableName struct{} `pg:"shared_url_info"`

	PackageId string `pg:"package_id, type:varchar"`
	Version   string `pg:"version, type:varchar"`
	FileId    string `pg:"file_id, type:varchar"` // TODO: slug!
	SharedId  string `pg:"shared_id, pk, type:varchar"`
}

// deprecated
type PackageVersionPublishedReference struct {
	tableName struct{} `pg:"published_version_reference, alias:published_version_reference"`
	PublishedReferenceEntity
	PackageName   string     `pg:"package_name, type:varchar"`
	Kind          string     `pg:"kind, type:varchar"`
	VersionStatus string     `pg:"version_status, type:varchar"`
	DeletedAt     *time.Time `pg:"deleted_at, type:timestamp without time zone"`
	DeletedBy     string     `pg:"deleted_by, type:varchar"`
}

type PublishedSrcEntity struct {
	tableName struct{} `pg:"published_sources"`

	PackageId       string `pg:"package_id, pk, type:varchar"`
	Version         string `pg:"version, pk, type:varchar"`
	Revision        int    `pg:"revision, pk, type:integer"`
	Config          []byte `pg:"config, type:bytea"`
	Metadata        []byte `pg:"metadata, type:bytea"`
	ArchiveChecksum string `pg:"archive_checksum, type:varchar"`
}

type PublishedSrcArchiveEntity struct {
	tableName struct{} `pg:"published_sources_archives"`

	Checksum string `pg:"checksum, pk, type:varchar"` // sha512
	Data     []byte `pg:"data, type:bytea"`
}

type PublishedSrcDataConfigEntity struct {
	PackageId       string `pg:"package_id, pk, type:varchar"`
	ArchiveChecksum string `pg:"archive_checksum, type:varchar"`
	Data            []byte `pg:"data, type:bytea"`
	Config          []byte `pg:"config, type:bytea"`
}

type PublishedContentSearchQueryEntity struct {
	TextFilter          string   `pg:"text_filter, type:varchar, use_zero"`
	Limit               int      `pg:"limit, type:integer, use_zero"`
	Offset              int      `pg:"offset, type:integer, use_zero"`
	DocumentTypesFilter []string `pg:"-"`
	OperationGroup      string   `pg:"operation_group_id, type:varchar, use_zero"`
}

type ContentForDocumentsTransformationSearchQueryEntity struct {
	Limit               int      `pg:"limit, type:integer, use_zero"`
	Offset              int      `pg:"offset, type:integer, use_zero"`
	DocumentTypesFilter []string `pg:"-"`
	OperationGroup      string   `pg:"operation_group_id, type:varchar, use_zero"`
}
type PackageIdEntity struct {
	tableName struct{} `pg:"package_group, alias:package_group"`

	Id string `pg:"id, type:varchar"`
}

type CSVDashboardPublishEntity struct {
	tableName struct{} `pg:"csv_dashboard_publication, alias:csv_dashboard_publication"`

	PublishId string `pg:"publish_id, pk, type:varchar"`
	Status    string `pg:"status, type:varchar"`
	Message   string `pg:"message, type:varchar, use_zero"`
	Report    []byte `pg:"csv_report, type:bytea"`
}

func MakePublishedReferenceView(entity PublishedReferenceEntity) view.VersionReferenceV3 {
	return view.VersionReferenceV3{
		PackageRef:       view.MakePackageRefKey(entity.RefPackageId, entity.RefVersion, entity.RefRevision),
		ParentPackageRef: view.MakePackageRefKey(entity.ParentRefPackageId, entity.ParentRefVersion, entity.ParentRefRevision),
		Excluded:         entity.Excluded,
	}
}

func MakePublishedVersionView(versionEnt *PublishedVersionEntity, contentEnts []PublishedContentEntity, refs []view.PublishedRef) *view.PublishedVersion {
	contents := make([]view.PublishedContent, 0)
	for _, ent := range contentEnts {
		contents = append(contents, *MakePublishedContentView(&ent))
	}

	status, _ := view.ParseVersionStatus(versionEnt.Status)
	var labels []string
	if versionEnt.Labels != nil {
		labels = versionEnt.Labels
	} else {
		labels = make([]string, 0)
	}

	return &view.PublishedVersion{
		PackageId:                versionEnt.PackageId,
		Version:                  versionEnt.Version,
		Revision:                 versionEnt.Revision,
		Status:                   status,
		PublishedAt:              versionEnt.PublishedAt,
		PreviousVersion:          versionEnt.PreviousVersion,
		PreviousVersionPackageId: versionEnt.PreviousVersionPackageId,
		DeletedAt:                versionEnt.DeletedAt,
		BranchName:               versionEnt.Metadata.GetBranchName(),
		Contents:                 contents,
		RelatedPackages:          refs,
		VersionLabels:            labels,
	}
}

// todo remove this entity after migration createdBy:string -> createdBy:UserObject
func MakeReadonlyPublishedVersionListView2_deprecated(versionEnt *ReadonlyPublishedVersionEntity_deprecated) *view.PublishedVersionListView_deprecated_v2 {
	return &view.PublishedVersionListView_deprecated_v2{
		Version:                  view.MakeVersionRefKey(versionEnt.Version, versionEnt.Revision),
		Status:                   versionEnt.Status,
		CreatedAt:                versionEnt.PublishedAt,
		CreatedBy:                versionEnt.UserName,
		PreviousVersion:          view.MakeVersionRefKey(versionEnt.PreviousVersion, versionEnt.PreviousVersionRevision),
		VersionLabels:            versionEnt.Labels,
		PreviousVersionPackageId: versionEnt.PreviousVersionPackageId,
	}
}

func MakeReadonlyPublishedVersionListView2(versionEnt *PackageVersionRevisionEntity) *view.PublishedVersionListView {
	item := view.PublishedVersionListView{
		Version:                  view.MakeVersionRefKey(versionEnt.Version, versionEnt.Revision),
		Status:                   versionEnt.Status,
		CreatedAt:                versionEnt.PublishedAt,
		CreatedBy:                *MakePrincipalView(&versionEnt.PrincipalEntity),
		PreviousVersion:          view.MakeVersionRefKey(versionEnt.PreviousVersion, versionEnt.PreviousVersionRevision),
		VersionLabels:            versionEnt.Labels,
		PreviousVersionPackageId: versionEnt.PreviousVersionPackageId,
		ApiProcessorVersion:      versionEnt.Metadata.GetBuilderVersion(),
	}
	return &item
}

func MakePublishedVersionHistoryView(ent PackageVersionHistoryEntity) view.PublishedVersionHistoryView {
	return view.PublishedVersionHistoryView{
		PackageId:                ent.PackageId,
		Version:                  ent.Version,
		Revision:                 ent.Revision,
		Status:                   ent.Status,
		PublishedAt:              ent.PublishedAt,
		PreviousVersionPackageId: ent.PreviousVersionPackageId,
		PreviousVersion:          ent.PreviousVersion,
		ApiTypes:                 ent.ApiTypes,
	}
}

func MakePublishedVersionListView(versionEnt *PublishedVersionEntity) *view.PublishedVersionListView_deprecated {
	status, _ := view.ParseVersionStatus(versionEnt.Status)
	return &view.PublishedVersionListView_deprecated{
		Version:                  versionEnt.Version,
		Revision:                 versionEnt.Revision,
		Status:                   status,
		PublishedAt:              versionEnt.PublishedAt,
		PreviousVersion:          versionEnt.PreviousVersion,
		PreviousVersionPackageId: versionEnt.PreviousVersionPackageId,
	}
}

func MakePublishedContentView(ent *PublishedContentEntity) *view.PublishedContent {
	return &view.PublishedContent{
		ContentId:   ent.FileId,
		Type:        view.ParseTypeFromString(ent.DataType),
		Format:      ent.Format,
		Path:        ent.Path,
		Name:        ent.Name,
		Index:       ent.Index,
		Slug:        ent.Slug,
		Labels:      ent.Metadata.GetLabels(),
		Title:       ent.Title,
		Version:     ent.Version,
		ReferenceId: ent.ReferenceId,
	}
}

// deprecated
func MakePublishedDocumentView_deprecated(ent *PublishedContentEntity) *view.PublishedDocument_deprecated {
	return &view.PublishedDocument_deprecated{
		FieldId:      ent.FileId,
		Type:         ent.DataType,
		Format:       ent.Format,
		Slug:         ent.Slug,
		Labels:       ent.Metadata.GetLabels(),
		Description:  ent.Metadata.GetDescription(),
		Version:      ent.Metadata.GetVersion(),
		Info:         ent.Metadata.GetInfo(),
		ExternalDocs: ent.Metadata.GetExternalDocs(),
		Title:        ent.Title,
		Filename:     ent.Filename,
		Tags:         ent.Metadata.GetDocTags(),
	}
}

func MakePublishedDocumentView(ent *PublishedContentEntity) *view.PublishedDocument {
	return &view.PublishedDocument{
		FieldId:      ent.FileId,
		Type:         ent.DataType,
		Format:       ent.Format,
		Slug:         ent.Slug,
		Labels:       ent.Metadata.GetLabels(),
		Description:  ent.Metadata.GetDescription(),
		Version:      ent.Metadata.GetVersion(),
		Info:         ent.Metadata.GetInfo(),
		ExternalDocs: ent.Metadata.GetExternalDocs(),
		Title:        ent.Title,
		Filename:     ent.Filename,
		Tags:         ent.Metadata.GetDocTags(),
	}
}

func MakeDocumentForTransformationView(ent *PublishedContentWithDataEntity) *view.DocumentForTransformationView {
	return &view.DocumentForTransformationView{
		FieldId:              ent.FileId,
		Type:                 ent.DataType,
		Format:               ent.Format,
		Slug:                 ent.Slug,
		Labels:               ent.Metadata.GetLabels(),
		Description:          ent.Metadata.GetDescription(),
		Version:              ent.Metadata.GetVersion(),
		Title:                ent.Title,
		Filename:             ent.Filename,
		IncludedOperationIds: ent.OperationIds,
		Data:                 ent.Data,
	}
}

func MakePublishedDocumentRefView2(ent *PublishedContentEntity) *view.PublishedDocumentRefView {
	return &view.PublishedDocumentRefView{
		FieldId:     ent.FileId,
		Type:        ent.DataType,
		Format:      ent.Format,
		Slug:        ent.Slug,
		Labels:      ent.Metadata.GetLabels(),
		Description: ent.Metadata.GetDescription(),
		Version:     ent.Metadata.GetVersion(),
		Title:       ent.Title,
		Filename:    ent.Filename,
		PackageRef:  view.MakePackageRefKey(ent.PackageId, ent.Version, ent.Revision),
	}
}
func MakePublishedContentChangeView(ent *PublishedContentEntity) *view.PublishedContentChange {
	return &view.PublishedContentChange{
		FileId:   ent.FileId,
		Type:     view.ParseTypeFromString(ent.DataType),
		Title:    ent.Title,
		Slug:     ent.Slug,
		Checksum: ent.Checksum,
	}
}

func MakeContentDataViewPub(content *PublishedContentEntity, contentData *PublishedContentDataEntity) *view.ContentData {
	return &view.ContentData{
		FileId:   content.FileId,
		Data:     contentData.Data,
		DataType: contentData.MediaType,
	}
}

func MakeSharedUrlInfo(sui *SharedUrlInfoEntity) *view.SharedUrlResult_deprecated {
	return &view.SharedUrlResult_deprecated{
		SharedId: sui.SharedId,
	}
}

func MakeSharedUrlInfoV2(sui *SharedUrlInfoEntity) *view.SharedUrlResult {
	return &view.SharedUrlResult{
		SharedFileId: sui.SharedId,
	}
}

func MakePackageEntity(packg *view.SimplePackage) *PackageEntity {
	return &PackageEntity{
		Id:                    packg.Id,
		Kind:                  packg.Kind,
		Name:                  packg.Name,
		ParentId:              packg.ParentId,
		Alias:                 packg.Alias,
		Description:           packg.Description,
		ImageUrl:              packg.ImageUrl,
		DefaultRole:           packg.DefaultRole,
		CreatedAt:             packg.CreatedAt,
		CreatedBy:             packg.CreatedBy,
		DeletedAt:             packg.DeletionDate,
		DeletedBy:             packg.DeletedBy,
		DefaultReleaseVersion: packg.DefaultReleaseVersion,
		ServiceName:           packg.ServiceName,
		ReleaseVersionPattern: packg.ReleaseVersionPattern,
		ExcludeFromSearch:     *packg.ExcludeFromSearch,
		RestGroupingPrefix:    packg.RestGroupingPrefix,
	}
}

func MakeSimplePackageUpdateEntity(existingPackage *PackageEntity, packg *view.PatchPackageReq) *PackageEntity {
	var packageEntity = PackageEntity{
		Id:        existingPackage.Id,
		Kind:      existingPackage.Kind,
		ParentId:  existingPackage.ParentId,
		Alias:     existingPackage.Alias,
		CreatedAt: existingPackage.CreatedAt,
		CreatedBy: existingPackage.CreatedBy,
		DeletedAt: existingPackage.DeletedAt,
		DeletedBy: existingPackage.DeletedBy,
	}
	if packg.Name != nil {
		packageEntity.Name = *packg.Name
	} else {
		packageEntity.Name = existingPackage.Name
	}
	if packg.Description != nil {
		packageEntity.Description = *packg.Description
	} else {
		packageEntity.Description = existingPackage.Description
	}
	if packg.ImageUrl != nil {
		packageEntity.ImageUrl = *packg.ImageUrl
	} else {
		packageEntity.ImageUrl = existingPackage.ImageUrl
	}
	if packg.ServiceName != nil {
		packageEntity.ServiceName = *packg.ServiceName
	} else {
		packageEntity.ServiceName = existingPackage.ServiceName
	}
	if packg.DefaultRole != nil {
		packageEntity.DefaultRole = *packg.DefaultRole
	} else {
		packageEntity.DefaultRole = existingPackage.DefaultRole
	}
	if packg.DefaultReleaseVersion != nil {
		packageEntity.DefaultReleaseVersion = *packg.DefaultReleaseVersion
	} else {
		packageEntity.DefaultReleaseVersion = existingPackage.DefaultReleaseVersion
	}
	if packg.ReleaseVersionPattern != nil {
		packageEntity.ReleaseVersionPattern = *packg.ReleaseVersionPattern
	} else {
		packageEntity.ReleaseVersionPattern = existingPackage.ReleaseVersionPattern
	}
	if packg.ExcludeFromSearch != nil {
		packageEntity.ExcludeFromSearch = *packg.ExcludeFromSearch
	} else {
		packageEntity.ExcludeFromSearch = existingPackage.ExcludeFromSearch
	}
	if packg.RestGroupingPrefix != nil {
		packageEntity.RestGroupingPrefix = *packg.RestGroupingPrefix
	} else {
		packageEntity.RestGroupingPrefix = existingPackage.RestGroupingPrefix
	}
	return &packageEntity
}

func MakePackageGroupEntity(group *view.Group) *PackageEntity {
	kind := KIND_GROUP
	if group.ParentId == "" {
		kind = KIND_WORKSPACE
	}
	return &PackageEntity{
		Id:          group.Id,
		Kind:        kind,
		Name:        group.Name,
		ParentId:    group.ParentId,
		Alias:       group.Alias,
		Description: group.Description,
		ImageUrl:    group.ImageUrl,
		CreatedAt:   group.CreatedAt,
		CreatedBy:   group.CreatedBy,
		DeletedAt:   group.DeletedAt,
		DeletedBy:   group.DeletedBy,
		DefaultRole: view.ViewerRoleId, //todo remove after full v2 migration
	}
}

func MakePackageGroupUpdateEntity(existingGroup *PackageEntity, group *view.Group) *PackageEntity {
	kind := KIND_GROUP
	if existingGroup.ParentId == "" {
		kind = KIND_WORKSPACE
	}
	return &PackageEntity{
		Id:          existingGroup.Id,
		Kind:        kind,
		Name:        group.Name,
		ParentId:    existingGroup.ParentId,
		Alias:       existingGroup.Alias,
		Description: group.Description,
		ImageUrl:    group.ImageUrl,
		CreatedAt:   existingGroup.CreatedAt,
		CreatedBy:   existingGroup.CreatedBy,
		DeletedAt:   existingGroup.DeletedAt,
		DeletedBy:   existingGroup.DeletedBy,
		DefaultRole: view.ViewerRoleId, //todo remove after full v2 migration
		ServiceName: existingGroup.ServiceName,
	}
}

func MakePackageGroupView(entity *PackageEntity) *view.Group {
	return &view.Group{
		Id:          entity.Id,
		ParentId:    entity.ParentId,
		Name:        entity.Name,
		Alias:       entity.Alias,
		Description: entity.Description,
		ImageUrl:    entity.ImageUrl,
		CreatedAt:   entity.CreatedAt,
		CreatedBy:   entity.CreatedBy,
		DeletedAt:   entity.DeletedAt,
		DeletedBy:   entity.DeletedBy,
		LastVersion: entity.LastVersion,
	}
}

func MakePackageGroupFavView(entity *PackageFavEntity) *view.Group {
	view := MakePackageGroupView(&entity.PackageEntity)
	view.IsFavorite = entity.UserId != "" && entity.Id != ""
	return view
}

func MakePackageGroupInfoView(entity *PackageEntity, parents []view.Group, isFavorite bool) *view.GroupInfo {
	var parentsRes []view.Group
	if parents == nil {
		parentsRes = make([]view.Group, 0)
	} else {
		parentsRes = parents
	}

	return &view.GroupInfo{
		GroupId:     entity.Id,
		ParentId:    entity.ParentId,
		Name:        entity.Name,
		Alias:       entity.Alias,
		ImageUrl:    entity.ImageUrl,
		Parents:     parentsRes,
		IsFavorite:  isFavorite,
		LastVersion: entity.LastVersion,
	}
}
func MakeSimplePackageView(entity *PackageEntity, parents []view.ParentPackageInfo, isFavorite bool, userPermissions []string) *view.SimplePackage {
	var parentsRes []view.ParentPackageInfo
	if parents == nil {
		parentsRes = make([]view.ParentPackageInfo, 0)
	} else {
		parentsRes = parents
	}

	return &view.SimplePackage{
		Id:                    entity.Id,
		ParentId:              entity.ParentId,
		Name:                  entity.Name,
		Alias:                 entity.Alias,
		ImageUrl:              entity.ImageUrl,
		Parents:               parentsRes,
		IsFavorite:            isFavorite,
		ServiceName:           entity.ServiceName,
		Description:           entity.Description,
		Kind:                  entity.Kind,
		DefaultRole:           entity.DefaultRole,
		UserPermissions:       userPermissions,
		DefaultReleaseVersion: entity.DefaultReleaseVersion,
		ReleaseVersionPattern: entity.ReleaseVersionPattern,
		ExcludeFromSearch:     &entity.ExcludeFromSearch,
		RestGroupingPrefix:    entity.RestGroupingPrefix,
	}
}

func MakePackagesInfo(entity *PackageEntity, defaultVersionDetails *view.VersionDetails, parents []view.ParentPackageInfo, isFavorite bool, userPermissions []string) *view.PackagesInfo {
	var parentsRes []view.ParentPackageInfo
	if parents == nil {
		parentsRes = make([]view.ParentPackageInfo, 0)
	} else {
		parentsRes = parents
	}

	packageInfo := view.PackagesInfo{
		Id:                        entity.Id,
		ParentId:                  entity.ParentId,
		Name:                      entity.Name,
		Alias:                     entity.Alias,
		ImageUrl:                  entity.ImageUrl,
		Parents:                   parentsRes,
		IsFavorite:                isFavorite,
		ServiceName:               entity.ServiceName,
		Description:               entity.Description,
		Kind:                      entity.Kind,
		DefaultRole:               entity.DefaultRole,
		UserPermissions:           userPermissions,
		LastReleaseVersionDetails: defaultVersionDetails,
		RestGroupingPrefix:        entity.RestGroupingPrefix,
		ReleaseVersionPattern:     entity.ReleaseVersionPattern,
	}

	return &packageInfo
}

func MakePackageView(packageEntity *PackageEntity, isFavorite bool, groups []view.Group) *view.Package {
	if groups == nil {
		groups = make([]view.Group, 0)
	}
	return &view.Package{
		Id:           packageEntity.Id,
		GroupId:      packageEntity.ParentId,
		Name:         packageEntity.Name,
		Alias:        packageEntity.Alias,
		Description:  packageEntity.Description,
		IsFavorite:   isFavorite,
		Groups:       groups,
		DeletionDate: packageEntity.DeletedAt,
		DeletedBy:    packageEntity.DeletedBy,
		ServiceName:  packageEntity.ServiceName,
		LastVersion:  packageEntity.LastVersion,
	}
}

func MakePackageParentView(entity *PackageEntity) *view.ParentPackageInfo {
	return &view.ParentPackageInfo{
		Id:       entity.Id,
		ParentId: entity.ParentId,
		Name:     entity.Name,
		Alias:    entity.Alias,
		ImageUrl: entity.ImageUrl,
		Kind:     entity.Kind,
	}
}

func MakePackageUpdateEntity(existingEntity *PackageEntity, packageView *view.Package) *PackageEntity {
	return &PackageEntity{
		Id:          existingEntity.Id,
		Kind:        KIND_PACKAGE,
		Name:        packageView.Name,
		ParentId:    existingEntity.ParentId,
		Alias:       existingEntity.Alias,
		Description: packageView.Description,
		CreatedAt:   existingEntity.CreatedAt,
		CreatedBy:   existingEntity.CreatedBy,
		DeletedAt:   existingEntity.DeletedAt,
		DeletedBy:   existingEntity.DeletedBy,
		DefaultRole: view.ViewerRoleId, //todo remove after full v2 migration
		ServiceName: packageView.ServiceName,
	}
}

func MakePackageVersionRef(entity *PackageVersionRichEntity) view.PackageVersionRef {
	return view.PackageVersionRef{
		RefPackageId:      entity.PackageId,
		RefPackageName:    entity.PackageName,
		RefPackageVersion: view.MakeVersionRefKey(entity.Version, entity.Revision),
		Kind:              entity.Kind,
		Status:            entity.Status,
		DeletedAt:         entity.DeletedAt,
		DeletedBy:         entity.DeletedBy,
		ParentNames:       entity.ParentNames,
		ServiceName:       entity.ServiceName,
		NotLatestRevision: entity.NotLatestRevision,
	}
}

func MakePackageVersionRevisionView_deprecated(ent *PackageVersionRevisionEntity_deprecated) *view.PackageVersionRevision_deprecated {
	packageVersionRevision := view.PackageVersionRevision_deprecated{
		Version:        view.MakeVersionRefKey(ent.Version, ent.Revision),
		Revision:       ent.Revision,
		Status:         ent.Status,
		CreatedAt:      ent.PublishedAt,
		CreatedBy:      *MakeUserV2View(&ent.UserEntity),
		RevisionLabels: ent.Labels,
		PublishMeta: view.BuildConfigMetadata{
			BranchName:    ent.Metadata.GetBranchName(),
			RepositoryUrl: ent.Metadata.GetRepositoryUrl(),
			CloudName:     ent.Metadata.GetCloudName(),
			CloudUrl:      ent.Metadata.GetCloudUrl(),
			Namespace:     ent.Metadata.GetNamespace(),
		},
		NotLatestRevision: ent.NotLatestRevision,
	}
	return &packageVersionRevision
}

func MakePackageVersionRevisionView(ent *PackageVersionRevisionEntity) *view.PackageVersionRevision {
	packageVersionRevision := view.PackageVersionRevision{
		Version:        view.MakeVersionRefKey(ent.Version, ent.Revision),
		Revision:       ent.Revision,
		Status:         ent.Status,
		CreatedAt:      ent.PublishedAt,
		CreatedBy:      *MakePrincipalView(&ent.PrincipalEntity),
		RevisionLabels: ent.Labels,
		PublishMeta: view.BuildConfigMetadata{
			BranchName:    ent.Metadata.GetBranchName(),
			RepositoryUrl: ent.Metadata.GetRepositoryUrl(),
			CloudName:     ent.Metadata.GetCloudName(),
			CloudUrl:      ent.Metadata.GetCloudUrl(),
			Namespace:     ent.Metadata.GetNamespace(),
		},
		NotLatestRevision: ent.NotLatestRevision,
	}
	return &packageVersionRevision
}
