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

package exception

const IncorrectParamType = "5"
const IncorrectParamTypeMsg = "$param parameter should be $type"

const InvalidURLEscape = "6"
const InvalidURLEscapeMsg = "Failed to unescape parameter $param"

const InvalidParameter = "7"
const InvalidParameterMsg = "Failed to read parameter $param"

const EmptyParameter = "8"
const EmptyParameterMsg = "Parameter $param should not be empty"

const InvalidParameterValue = "9"
const InvalidParameterValueMsg = "Value '$value' is not allowed for parameter $param"
const InvalidLimitMsg = "Value '$value' is not allowed for parameter limit. Allowed values are in range 1:$maxLimit"

const BadRequestBody = "10"
const BadRequestBodyMsg = "Failed to decode body"

const RequiredParamsMissing = "15"
const RequiredParamsMissingMsg = "Required parameters are missing: $params"

const GroupNotFound = "10"
const GroupNotFoundMsg = "Group with id = $id not found"

const AliasAlreadyTaken = "11"
const AliasAlreadyTakenMsg = "Alias $alias is already taken"

const ParentGroupNotFound = "12"
const ParentGroupNotFoundMsg = "Parent group with id = $parentId not found"

const IncorrectDepthForRootGroups = "13"
const IncorrectDepthForRootGroupsMsg = "You can't use depth $depth to search root groups. Allowed values: 0, 1"

const ProjectNotFound = "20"
const ProjectNotFoundMsg = "Project with projectId = $projectId not found"

const ProjectAliasAlreadyExists = "21"
const ProjectAliasAlreadyExistsMsg = "Project with alias = $alias already exists"

const PackageNotFound = "22"
const PackageNotFoundMsg = "Package with packageId = $packageId not found"

const PackageParentIsMissing = "23"
const PackageParentIsMissingMsg = "PackageId cannot be empty for package with kind 'group' or 'package'"

const IncorrectPackageKind = "24"
const IncorrectPackageKindMsg = "Kind '$kind' is not allowed for package"

const BranchDraftNotFound = "30"
const BranchDraftNotFoundMsg = "Draft for project with id $projectId and branch $branch doesn't exist"

const ConfigNotFound = "31"
const ConfigNotFoundMsg = "Config for project with id $projectId and branch $branch doesn't exist"

const InvalidApihubConfig = "33"
const InvalidApihubConfigMsg = "Failed to parse apihub config file"

const NoFilesSent = "35"
const NoFilesSentMsg = "Request has no files in it"

const BranchNotFound = "36"
const BranchNotFoundMsg = "Branch $branch doesn't exist for project $projectId"

const BranchAlreadyExists = "37"
const BranchAlreadyExistsMsg = "Branch $branch already exists for project $projectId"

const ContentIdNotFound = "40"
const ContentIdNotFoundMsg = "Content with id $contentId not found in branch $branch for project $projectId"

const ContentSlugNotFound = "41"
const ContentSlugNotFoundMsg = "Content with slug $contentSlug not found"

const NoContentToDelete = "42"
const NoContentToDeleteMsg = "No content found to delete. Path: $contentId in branch $branch for project $projectId"

const FileNotFound = "43"
const FileNotFoundMsg = "File for path $fileId not found in branch $branch of project $projectGitId"

const DraftFileNotFound = "48"
const DraftFileNotFoundMsg = "File $fileId doesn't exist in draft for project $projectId and branch $branchName"

const FileIdIsTaken = "44"
const FileIdIsTakenMsg = "File with id $fileId already exists"

const IncorrectFilePath = "45"
const IncorrectFilePathMsg = "File path is incorrect: '$path'"

const IncorrectFileName = "46"
const IncorrectFileNameMsg = "File name is incorrect: '$name'"

const FileByRefNotFound = "47"
const FileByRefNotFoundMsg = "File for path $fileId not found by reference $ref in project $projectGitId"

const PreviousPackageVersionNotRelease = "48"
const PreviousPackageVersionNotReleaseMsg = "Previous version $version for package $packageId is not in the 'release' status"

const PublishedPackageVersionNotFound = "49"
const PublishedPackageVersionNotFoundMsg = "Published version $version not found for package $packageId"

const PublishedVersionNotFound = "50"
const PublishedVersionNotFoundMsg = "Published version $version not found"

const SharedIdIsIncorrect = "56"
const SharedIdIsIncorrectMsg = "Shared ID is incorrect: $sharedId"

const GeneratedSharedIdIsNotUnique = "57"
const GeneratedSharedIdIsNotUniqueMsg = "Generated shared ID is not unique"

const NoContentFoundForSharedId = "58"
const NoContentFoundForSharedIdMsg = "Content with SharedId $sharedId not found"

const InsufficientRightsToCommit = "60"
const InsufficientRightsToCommitMsg = "User doesn't have enough privileges to commit in $branch"

const NoTicketInCommit = "62"
const NoTicketInCommitMsg = "Ticket id is required in commit message"

const FileByBlobIdNotFound = "63"
const FileByBlobIdNotFoundMsg = "File content for blobId '$blobId' not found in project $projectGitId"

const UnknownIntegrationType = "80"
const UnknownIntegrationTypeMsg = "Unknown integration type: $type"

const UserIdNotFound = "81"
const UserIdNotFoundMsg = "User id not found in context"

const GitIntegrationConnectFailed = "82"
const GitIntegrationConnectFailedMsg = "Failed to connect to git (type $type) using new api key for user $user"

const ApiKeyNotFound = "83"
const ApiKeyNotFoundMsg = "Api key for user $user and integration $integration not found"

const PackageApiKeyNotFound = "91"
const PackageApiKeyNotFoundMsg = "Api key $apiKeyId for package $packageId not found"

const PackageApiKeyAlreadyRevoked = "92"
const PackageApiKeyAlreadyRevokedMsg = "Api key $apiKeyId for package $packageId is already revoked"

const ApiKeyNotFoundByKey = "94"
const ApiKeyNotFoundByKeyMsg = "Api key not found by provided key"

const ApiKeyHeaderIsEmpty = "96"
const ApiKeyHeaderIsEmptyMsg = "Header api-key is empty"

const ApiKeyNameDuplicate = "97"
const ApiKeyNameDuplicateMsg = "API key with name $name already exists"

const ApiKeyNotFoundById = "98"
const ApiKeyNotFoundByIdMsg = "Api key with id $apiKeyId not found"

const RepositoryIdNotFound = "93"
const RepositoryIdNotFoundMsg = "Repository $repositoryId not found"

const SharedFileIdNotFound = "95"
const SharedFileIdNotFoundMsg = "Shared File Id $sharedFileId is not found"

const ReferencedPackageNotFound = "84"
const ReferencedPackageNotFoundMsg = "Referenced package $package not found"

const ReferencedPackageVersionNotFound = "85"
const ReferencedPackageVersionNotFoundMsg = "Referenced package $package version $version not found"

const ParentGroupIdCantBeModified = "86"
const ParentGroupIdCantBeModifiedMsg = "Parent group id can't be modified"

const AliasCantBeModified = "87"
const AliasCantBeModifiedMsg = "Alias can't be modified"

const ParentIdCantBeModified = "88"
const ParentIdCantBeModifiedMsg = "Parent id can't be modified"

const ServiceNameCantBeModified = "89"
const ServiceNameCantBeModifiedMsg = "Service name can't be modified"

const UnsupportedDiffType = "90"
const UnsupportedDiffTypeMsg = "Type $type is not supported for diff service"

const NotFavored = "100"
const NotFavoredMsg = "$id is not favored by $user"

const AlreadyFavored = "101"
const AlreadyFavoredMsg = "$id is already favored by $user"

const UnsupportedSourceType = "300"
const UnsupportedSourceTypeMsg = "Source type $type is not supported"

const InvalidUrl = "400"
const InvalidUrlMsg = "The file is not available at the URL, authorization may be required. Try to download and upload file directly"

const UrlUnexpectedErr = "401"
const UrlUnexpectedErrMsg = "The file is not available at the URL. Try to download and upload file directly"

const AliasContainsForbiddenChars = "500"
const AliasContainsForbiddenCharsMsg = "Alias contains forbidden chars (not url-safe)"

const RefNotFound = "600"
const RefNotFoundMsg = "Ref $ref for project $projectId, version $version and branch $branch not found"

const RefAlreadyExists = "601"
const RefAlreadyExistsMsg = "Ref $ref for project $projectId, version $version and branch $branch already exists"

const UnsupportedStatus = "602"
const UnsupportedStatusMsg = "Type $status is not supported"

const IntegrationTokenRevoked = "700"
const IntegrationTokenRevokedMsg = "Token for integration $integration was revoked. Try to re-login to re-enable integration."

const GitlabDeadlineExceeded = "701"
const GitlabDeadlineExceededMsg = "Gitlab is currently unavailable. Please try again later."

const IntegrationTokenExpired = "702"
const IntegrationTokenExpiredMsg = "Token for integration $integration is expired.  Try to re-login to re-enable integration."

const IntegrationTokenUnexpectedlyExpired = "703"
const IntegrationTokenUnexpectedlyExpiredMsg = "Token unexpectedly expired. Token was successfully renewed. Please retry the request"

const IntegrationTokenAuthFailed = "704"
const IntegrationTokenAuthFailedMsg = "Failed to auth with existing token. Try to re-login to re-enable integration."

const ConnectionNotUpgraded = "800"
const ConnectionNotUpgradedMsg = "Failed to upgrade connection"

const UnsupportedActionWithFile = "901"
const UnsupportedActionWithFileMsg = "Unsupported action (action $code) with file $fileId"

const IncorrectMultipartFile = "1000"
const IncorrectMultipartFileMsg = "Unable to read Multipart file"

const ExternalRefFileMissing = "1001"
const ExternalRefFileMissingMsg = "Missing external ref file $file while resolving $rootFile"

const UnserializableFile = "1002"
const UnserializableFileMsg = "Unable to read file $fileId with type $fileType. ErrorBuilds: $error"

const UnexpectedFileType = "1003"
const UnexpectedFileTypeMsg = "Unexpected file type $type of file $fileId"

const ArrayAsRootError = "1005"
const ArrayAsRootErrorMsg = "File $fileId contains array as root object, it's not supported"

const ExternalRefPathMissing = "1010"
const ExternalRefPathMissingMsg = "Error while processing file '$rootFile': external ref path '$path' not found in ref file '$refFile'"

const GitCommitNotFoundForFile = "1020"
const GitCommitNotFoundForFileMsg = "Can't find latest git commit for file '$file'"

const GitBranchConfigContainDuplicateFiles = "1030"
const GitBranchConfigContainDuplicateFilesMsg = "Apihub config('$path') in git is incorrect, please fix it manually. Config contains duplicate file entries: $files"

const IncorrectRefsProvidedForPublish = "1040"
const IncorrectRefsProvidedForPublishMsg = "Incorrect refs provided for publish: $list"

const NotApplicableOperation = "1100"
const NotApplicableOperationMsg = "Operation '$operation' is not applicable for file with status '$status'"

const SharedContentUnavailable = "1200"
const SharedContentUnavailableMsg = "Content for sharedId $sharedId is no longer available because its version was deleted"

const UnableToGenerateInteractiveDoc = "1210"
const UnableToGenerateInteractiveDocMsg = "Unable to generate interactive documentation for $file since it's not a supported specification"

const UnableToSelectWsServer = "1220"
const UnableToSelectWsServerMsg = "Unable to select ws server"

const GroupDocGenerationUnsupported = "1230"
const GroupDocGenerationUnsupportedMsg = "Documentation generation for groups is not supported yet"

const ReleaseVersionDoesntMatchPattern = "1301"
const ReleaseVersionDoesntMatchPatternMsg = "Release version name '$version' doesn't match '$pattern' pattern"

const ServiceNameAlreadyTaken = "1400"
const ServiceNameAlreadyTakenMsg = "Service name $serviceName already taken by package $packageId"

const MigrationVersionIsTooLow = "1500"
const MigrationVersionIsTooLowMsg = "Current DB migration version $currentVersion is not high enough. This operation requires version $requiredVersion or higher"

const MigrationVersionIsDirty = "1501"
const MigrationVersionIsDirtyMsg = "Current DB migration version $currentVersion is dirty. Please fix the migration before running this operation"

const AgentConfigNotFound = "1600"
const AgentConfigNotFoundMsg = "Agent config for cloud $cloud and namespace $namespace not found"

const InvalidPackagedFile = "1601"
const InvalidPackagedFileMsg = "Package file '$file' has incorrect format: $error"

const InvalidPackageArchive = "1602"
const InvalidPackageArchiveMsg = "Failed to read package archive: $error"

const InvalidPackageArchivedFile = "1603"
const InvalidPackageArchivedFileMsg = "Failed to read $file from package archive: $error"

const PackageArchivedFileNotFound = "1604"
const PackageArchivedFileNotFoundMsg = "File '$file' not found in '$folder' folder in package archive"

const FileMissingFromSources = "1605"
const FileMissingFromSourcesMsg = "File '$fileId' not found in sources archive"

const DocumentMissingFromPackage = "1606"
const DocumentMissingFromPackageMsg = "File '$fileId' is present in build config but not found in documents list"

const ReferenceMissingFromPackage = "1607"
const ReferenceMissingFromPackageMsg = "Reference with refId='$refId', version='$version' is present in build config but not found in refs list"

const PackageForBuildConfigDiscrepancy = "1608"
const PackageForBuildConfigDiscrepancyMsg = "Package value doesn't match expected build config value for '$param' parameter: expected='$expected', actual='$actual'"

const FileDuplicate = "1609" //similar to 1030
const FileDuplicateMsg = "Files with fileIds '$fileIds' have multiple occurrences in '$configName'"

const FileMissing = "1610"
const FileMissingMsg = "Files with fileIds '$fileIds' not found in '$location'"

const FileRedundant = "1611"
const FileRedundantMsg = "Files '$files' found in '$location' but not listed in any configuration"

const IncorrectMetadataField = "1612"
const IncorrectMetadataFieldMsg = "Metadata filed $field is incorrect: $description"

const NameAlreadyTaken = "1700"
const NameAlreadyTakenMsg = "The name '$name' is already taken in '$directory'"

const PackageAlreadyExists = "1701"
const PackageAlreadyExistsMsg = "Alias '$id' is already reserved. Please use another alias."

const UserAvatarNotFound = "1702"
const UserAvatarNotFoundMsg = "User avatar not found for userid: $userid"

const SamlInstanceIsNull = "1703"
const SamlInstanceIsNullMsg = "Saml instance initialized with error. Error: $error"

const SamlInstanceHasError = "1704"
const SamlInstanceHasErrorMsg = "Saml instance has error $error"

const SamlResponseHaveNoUserId = "1705"
const SamlResponseHaveNoUserIdMsg = "Saml response missing user id"

const SamlResponseHasBrokenContent = "1706"
const SamlResponseHasBrokenContentMsg = "Saml response has broken content for user $userId. Error: $error"

const AssertionIsNull = "1707"
const AssertionIsNullMsg = "Assertion from SAML response is null"

const SamlResponseHasParsingError = "1708"
const SamlResponseHasParsingErrorMsg = "Saml response has error in parsing process. Error: $error"

const SamlResponseMissingEmail = "1709"
const SamlResponseMissingEmailMsg = "Saml response missing user email"

const PackageRedirectExists = "1710"
const PackageRedirectExistsMsg = "Package id '$id' is reserved for redirect(old package id)"

const IncorrectRedirectUrlError = "1711"
const IncorrectRedirectUrlErrorMsg = "Incorrect redirect URL $url"

const UsersNotFound = "1800"
const UsersNotFoundMsg = "Users ($users) do not exist"

const NotAvailableRole = "1801"
const NotAvailableRoleMsg = "Requested role $role is not available. I.e. you don't have permission to set the role."

const RoleNotFound = "1802"
const RoleNotFoundMsg = "Role $role doesn't exist"

const RoleCannotBeDeleted = "1803"
const RoleCannotBeDeletedMsg = "You can't delete role $role for $user because its inherited from $package"

const UserWithNoRoles = "1804"
const UserWithNoRolesMsg = "User $user doesn't have any roles for package $packageId"

const OwnRoleNotEditable = "1805"
const OwnRoleNotEditableMsg = "You cannot edit your own role"

const ArchiveSizeExceeded = "1806"
const ArchiveSizeExceededMsg = "Archive size exceeded. Archive size limit - $size"

const PublishFileSizeExceeded = "1807"
const PublishFileSizeExceededMsg = "File size exceeded. File size limit - $size"

const BranchContentSizeExceeded = "1808"
const BranchContentSizeExceededMsg = "Branch content size exceeded. Branch content size limit - $size"

const RoleNotAllowed = "1809"
const RoleNotAllowedMsg = "User(s) with role $role cannot be added to the package"

const InsufficientPrivileges = "1900"
const InsufficientPrivilegesMsg = "You don't have enough privileges to perform this operation"

const EmailAlreadyTaken = "2000"
const EmailAlreadyTakenMsg = "User with email '$email' already exists"

const PasswordTooLong = "2001"
const PasswordTooLongMsg = "Password length exceeds 72 bytes"

const UserNotFound = "2100"
const UserNotFoundMsg = "User with userId = $userId not found"

const PackageDoesntExists = "2101"
const PackageDoesntExistsMsg = "Package with '$id' doesn't exists"

const PackageAlreadyTaken = "2102"
const PackageAlreadyTakenMsg = "Package $packageId is already in use by project $projectId"

const PackageKindIsNotAllowed = "2103"
const PackageKindIsNotAllowedMsg = "Package '$packageId' with kind - '$kind' is not allowed for project integration"

const DefaultReleaseVersionIsNotReleased = "2200"
const DefaultReleaseVersionIsNotReleasedMsg = "Default release version - '$version ' isn't in release status"

const DefaultReleaseVersionHasNotLatestRevision = "2201"
const DefaultReleaseVersionHasNotLatestRevisionMsg = "Default release version - '$version ' has not latest revision"

const OperationNotFound = "2301"
const OperationNotFoundMsg = "Operation $operationId not found in published version $version for package $packageId"

const PreviousVersionNotFound = "2400"
const PreviousVersionNotFoundMsg = "Previous version '$previousVersion' for version '$version' doesn't exist"

const NoPreviousVersion = "2401"
const NoPreviousVersionMsg = "Version '$version' doesn't have a previous version"

const InvalidRevisionFormat = "2500"
const InvalidRevisionFormatMsg = "Version '$version' has invalid revision format"

const PackageIdMismatch = "2501"
const PackageIdMismatchMsg = "PackageId from config $configPackageId doesn't match packageId $packageId from path"

const EmptyDataForPublish = "2502"
const EmptyDataForPublishMsg = "Publish cannot be started without reference and documents"

const VersionNameNotAllowed = "2503"
const VersionNameNotAllowedMsg = "Version name '$version' contains restricted characters ('$character')"

const InvalidPreviousVersionPackage = "2504"
const InvalidPreviousVersionPackageMsg = "Previous version packageId $previousVersionPackageId is same as packageId $packageId"

const PreviousVersionNameNotAllowed = "2505"
const PreviousVersionNameNotAllowedMsg = "Previous Version '$version' contains restricted characters ('@')"

const InvalidSearchParameters = "2600"
const InvalidSearchParametersMsg = "Incorrect search parameters: $error"

const LdapConnectionIsNotCorrect = "2601"
const LdapConnectionIsNotCorrectMsg = "Ldap connection isn't correct. Ldap server - $server. Error - $error"

const LdapConnectionIsNotAllowed = "2602"
const LdapConnectionIsNotAllowedMsg = "Ldap bind connection isn't allowed. Ldap server - $server. Error - $error"

const LdapSearchFailed = "2603"
const LdapSearchFailedMsg = "Ldap search failed. Ldap server - $server. Error - $error"

const PreviousVersionFromRequestIsEmpty = "3001"
const PreviousVersionFromRequestIsEmptyMsg = "Previous version from request is empty"

const InvalidReleaseVersionPatternFormat = "2604"
const InvalidReleaseVersionPatternFormatMsg = "Release Version Pattern '$pattern' has invalid pattern format"

const BuildNotFoundByQuery = "2610"
const BuildNotFoundByQueryMsg = "Build config not found by $query"

const BuildNotFoundById = "2611"
const BuildNotFoundByIdMsg = "Build with $id not found"

const UnsupportedMemberUpdateAction = "4000"
const UnsupportedMemberUpdateActionMsg = "Action $action is is not supported"

const InvalidRolePermission = "4001"
const InvalidRolePermissionMsg = "Permission $permission is invalid"

const RoleAlreadyExists = "4002"
const RoleAlreadyExistsMsg = "Role with id=$roleId already exists"

const RoleNotEditable = "4003"
const RoleNotEditableMsg = "Role '$roleId' cannot be edited"

const NotEnoughPermissionsForRole = "4004"
const NotEnoughPermissionsForRoleMsg = "You don't have enough permissions to manage '$roleId' role"

const RoleDoesntExist = "4005"
const RoleDoesntExistMsg = "Role '$roleId' does not exist"

const MemberRoleNotFound = "4006"
const MemberRoleNotFoundMsg = "User '$userId' doesn't have '$roleId' role for $packageId"

const AllRolesRequired = "4007"
const AllRolesRequiredMsg = "All existing roles are required"

const SysadmNotFound = "4008"
const SysadmNotFoundMsg = "System administrator with userId = $userId not found"

const RoleNameDoesntMatchPattern = "4009"
const RoleNameDoesntMatchPatternMsg = "Role name '$role' doesn't match '$pattern' pattern"

const UnableToChangeOldRevision = "4201"
const UnableToChangeOldRevisionMsg = "Unable to change old revision. You can update only the latest one."

const InvalidCompareVersionReq = "4019"
const InvalidCompareVersionReqMsg = "Compare version req '$compareVersionReq' has incorrect format: $error"

const InvalidDocumentType = "4024"
const InvalidDocumentTypeMsg = "Unexpected document type '$type'"

const InvalidDocumentFormat = "4025"
const InvalidDocumentFormatMsg = "Unexpected document format - '$format'"

const BuildNotOwned = "4300"
const BuildNotOwnedMsg = "You cannot use build '$buildId' since you are not its owner"

const BuildNotFound = "4301"
const BuildNotFoundMsg = "Build '$buildId' doesn't exist"

const BuildAlreadyFinished = "4302"
const BuildAlreadyFinishedMsg = "Build '$buildId' already finished"

const ForbiddenDefaultMigrationBuildParameters = "4401"
const ForbiddenDefaultMigrationBuildParametersMsg = "Config contains forbidden migration build parameters - '$parameters'"

const ChangesAreNotEmpty = "4402"
const ChangesAreNotEmptyMsg = "Changes are not empty when noChangelog is true"

const AgentNotFound = "4500"
const AgentNotFoundMsg = "Agent '$agentId' not found"

const InvalidAgentUrl = "4501"
const InvalidAgentUrlMsg = "Agent url '$url' for agent '$agentId' is not valid"

const InactiveAgent = "4502"
const InactiveAgentMsg = "Agent '$agentId' is not active"

const ProxyFailed = "4503"
const ProxyFailedMsg = "Failed to proxy the request to $url"

const IncompatibleAgentVersion = "4504"
const IncompatibleAgentVersionMsg = "Current version $version of Agent not supported by APIHUB. Please, update this instance."

const ChangesAreEmpty = "4600"
const ChangesAreEmptyMsg = "Changes are empty"

const UnableToChangeExcludeFromSearch = "4700"
const UnableToChangeExcludeFromSearchMsg = "This package cannot be included in global search as parent group/workspace is excluded"

const UnableToGetMigrationDataCleanupResult = "4800"
const UnableToGetMigrationDataCleanupResultMsg = "Cleanup data for specified id not found"

const BuildSourcesNotFound = "4900"
const BuildSourcesNotFoundMsg = "Build sources for '$publishId' build not found"

const SourcesNotFound = "4901"
const SourcesNotFoundMsg = "Sources archive not found for package '$packageId' and version '$versionName'"

const PublishedSourcesDataNotFound = "4902"
const PublishedSourcesDataNotFoundMsg = "Published version source data not found for package '$packageId' and version '$versionName'"

const InvalidComparisonField = "4810"
const InvalidComparisonFieldMsg = "Comparison field '$field' is not valid ($error)"

const ComparisonNotFound = "4811"
const ComparisonNotFoundMsg = "Comparison for versions pair not found (comparisonId=$comparisonId) (packageId:$packageId - version:$version - revision:$revision vs previousPackageId:$previousPackageId - previousVersion:$previousVersion - previousRevision:$previousRevision)"

const PublishedVersionRevisionNotFound = "4812"
const PublishedVersionRevisionNotFoundMsg = "Published version $version with revision $revision not found for package $packageId"

const DuplicateReference = "4813"
const DuplicateReferenceMsg = "Duplicate references are not allowed (refId = $refId, refVersion = $refVersion)"

const MultiplePackageReference = "4814"
const MultiplePackageReferenceMsg = "Multiple references for the same package are not allowed (refId = $refId)"

const ExcludedComparisonReference = "4815"
const ExcludedComparisonReferenceMsg = "Excluded reference found in comparison list (refId = $refId, version = $version, revision = $revision)"

const InvalidGroupingPrefix = "5000"
const InvalidGroupingPrefixMsg = "Grouping prefix has invalid format ($error)"

const DefaultVersionNotFound = "5001"
const DefaultVersionNotFoundMsg = "Package $packageId doesn't have a default version"

const OperationsAreEmpty = "5200"
const OperationsAreEmptyMsg = "Operations are empty"

const UnsupportedFormat = "5100"
const UnsupportedFormatMsg = "Format $format is not supported"

const InvalidURL = "5300"
const InvalidURLMsg = "Url '$url' is not a valid url"

const VersionIsEqualToPreviousVersion = "5400"
const VersionIsEqualToPreviousVersionMsg = "Version '$version' cannot be the same as previous version '$previousVersion'"

const InvalidGraphQLOperationType = "5500"
const InvalidGraphQLOperationTypeMsg = "Unexpected graphQL operation type '$type'"

const InvalidProtobufOperationType = "5501"
const InvalidProtobufOperationTypeMsg = "Unexpected protobuf operation type '$type'"

const UserByEmailNotFound = "6000"
const UserByEmailNotFoundMsg = "User with email = '$email' not found"

const OperationGroupAlreadyExists = "6010"
const OperationGroupAlreadyExistsMsg = "Operation group with groupName=$groupName already exists"

const OperationGroupNotFound = "6011"
const OperationGroupNotFoundMsg = "Operation group with groupName=$groupName doesn't exist"

const OperationGroupNotModifiable = "6012"
const OperationGroupNotModifiableMsg = "You can only modify 'template' and 'description' parameters for autogenerated operation group '$groupName'"

const OverlappingQueryParameter = "6013"
const OverlappingQueryParameterMsg = "Query parameter '$param2' cannot be used in addition to '$param1' parameter"

const GroupingVersionNotAllowed = "6014"
const GroupingVersionNotAllowedMsg = "Cannot add operation from package '$packageId' version '$version' since its not referenced in current package version"

const GroupOperationsLimitExceeded = "6015"
const GroupOperationsLimitExceededMsg = "Operations limit per group ($limit) exceeded"

const EmptyOperationGroupName = "6016"
const EmptyOperationGroupNameMsg = "Operation group name cannot be empty"

const OperationGroupExportTemplateNotFound = "6017"
const OperationGroupExportTemplateNotFoundMsg = "Export template not found for operation group '$groupName'"

const UnsupportedQueryParam = "6100"
const UnsupportedQueryParamMsg = "'$param' query param is supported only for dashboards"

const UnableToDeleteOldRevision = "6205"
const UnableToDeleteOldRevisionMsg = "Unable to delete old revision."

const FromPackageNotFound = "6301"
const FromPackageNotFoundMsg = "Unable to perform package move operation since 'from' package $packageId not found"

const ToParentPackageNotFound = "6302"
const ToParentPackageNotFoundMsg = "Unable to perform package move operation since 'to' parent package $packageId not found"

const TransitionActivityNotFound = "6303"
const TransitionActivityNotFoundMsg = "Transition activity $id not found"

const ToPackageExists = "6304"
const ToPackageExistsMsg = "Unable to perform package move operation since 'to' package $packageId already exists ($deletedAt)"

const ToPackageRedirectExists = "6305"
const ToPackageRedirectExistsMsg = "Unable to perform package move operation since 'to' package $packageId is already used by 'old' package id which was moved to $newPackageId. " +
	"Add `\"overwriteHistory\": true` parameter if you want to do force move. In this case transition record will be lost and there would be no redirect from $packageId to $newPackageId."

const SinglePrivatePackageAllowed = "6400"
const SinglePrivatePackageAllowedMsg = "Only one private package allowed for user"

const PrivateWorkspaceIdAlreadyTaken = "6401"
const PrivateWorkspaceIdAlreadyTakenMsg = "Id '$id' cannot be used for private workspace since it's already used by another user or package"

const PrivateWorkspaceIdDoesntExist = "6402"
const PrivateWorkspaceIdDoesntExistMsg = "User '$userId' doesn't have a private workspace"

const PrivateWorkspaceNotModifiableMsg = "Only sysadmin can modify private workspaces"

const OperationModelNotFound = "6410"
const OperationModelNotFoundMsg = "Model '$modelName' doesn't exist for operation '$operationId'"

const InvalidDocumentTransformationReq = "6217"
const InvalidDocumentTransformationReqMsg = "Document transformation req 'documentTransformationReq' has incorrect format: $error"

const UnknownBuildType = "6270"
const UnknownBuildTypeMsg = "Unknown build type: $type"

const TransformedDocumentsNotFound = "6280"
const TransformedDocumentsNotFoundMsg = "Transformed documents not found. Package id - '$packageId', version - '$version', apiType - '$apiType', groupName = '$groupName'"

const UnknownResponseFormat = "6290"
const UnknownResponseFormatMsg = "Unknown response format: $format"

const InvalidTextFilterFormatForOperationCustomTag = "6411"
const InvalidTextFilterFormatForOperationCustomTagMsg = "Invalid textFilter format for search by operation custom tag. textFilter value - '$textFilter'"

const PackageVersionCannotBeCopied = "6420"
const PackageVersionCannotBeCopiedMsg = "Version '$version' from package '$packageId' cannot be copied to '$targetPackageId' package: $error"

const FormatNotSupportedForBuildType = "6500"
const FormatNotSupportedForBuildTypeMsg = "Format '$format' is not supported for '$buildType' buildType"

const InvalidGroupExportTemplateType = "6501"
const InvalidGroupExportTemplateTypeMsg = "Template field should only contain a file or an empty string"

const InvalidMultipartFileType = "6502"
const InvalidMultipartFileTypeMsg = "'$field' field should only contain a file or an empty string"

const GitIntegrationUnsupportedHookEventType = "6600"
const GitIntegrationUnsupportedHookEventTypeMsg = "Event type '$type' is not supported"

const AliasContainsRunenvChars = "6601"
const AliasContainsRunenvCharsMsg = "The alias 'RUNENV' is reserved for internal use. Please use another alias"

const GitVersionPublishFileNotFound = "6610"
const GitVersionPublishFileNotFoundMsg = "Version publish file for project with id $projectId and branch $branch doesn't exist"

const GitVersionPublishFileInvalid = "6611"
const GitVersionPublishFileInvalidMsg = "Version publish file for project with id $projectId and branch $branch is invalid"

const PublishProcessNotFound = "6700"
const PublishProcessNotFoundMsg = "Publish process with publishId=$publishId not found"

const UnsupportedApiType = "6710"
const UnsupportedApiTypeMsg = "Api type $apiType is not supported for this operation"

const EmptyCSVFile = "6800"
const EmptyCSVFileMsg = "CSV file is empty"

const InvalidCSVFile = "6801"
const InvalidCSVFileMsg = "CSV file has invalid format: $error"

const InvalidPackageKind = "6802"
const InvalidPackageKindMsg = `Action is not allowed for package with kind="$kind", allowed kind - "$allowedKind"`

const HostNotAllowed = "6900"
const HostNotAllowedMsg = "Host not allowed: $host"
