package exception

// Error codes follow the APIHUB convention (code + message template with $param placeholders), prefixed DOCS-.

const Unauthorized = "DOCS-1001"
const UnauthorizedMsg = "Unauthorized"

const InsufficientPrivileges = "DOCS-1002"
const InsufficientPrivilegesMsg = "System administrator role is required to perform this operation"
const InsufficientPackagePrivilegesMsg = "System administrator role or the package permission is required to perform this operation"

const ArticleNotFound = "DOCS-2001"
const ArticleNotFoundMsg = "Article '$slug' not found"

const ArticleIdNotFound = "DOCS-2002"
const ArticleIdNotFoundMsg = "Article with id '$id' not found"

const ArticleFileNotFound = "DOCS-2003"
const ArticleFileNotFoundMsg = "File '$path' not found"

const PackageVersionNotAccessible = "DOCS-2004"
const PackageVersionNotAccessibleMsg = "Package version '$packageId/$version' is not found or not accessible"

const PackageDocumentNotAccessible = "DOCS-2005"
const PackageDocumentNotAccessibleMsg = "Document '$documentSlug' of package version '$packageId/$version' is not found or not accessible"

const IncorrectParamType = "DOCS-3001"
const IncorrectParamTypeMsg = "$param parameter should be $type"

const InvalidParameter = "DOCS-3002"
const InvalidParameterMsg = "Invalid value for parameter $param: $reason"

const RequiredParamsMissing = "DOCS-3003"
const RequiredParamsMissingMsg = "Required parameters are missing: $params"

const BadRequestBody = "DOCS-3004"
const BadRequestBodyMsg = "Failed to decode body"

const ArticleValidationFailed = "DOCS-3005"
const ArticleValidationFailedMsg = "Article is not valid: $reason"

const ArticleSlugAlreadyExists = "DOCS-3006"
const ArticleSlugAlreadyExistsMsg = "Article with slug '$slug' already exists"

const PackageRefNotFound = "DOCS-3007"
const PackageRefNotFoundMsg = "$what does not exist in APIHUB or is not accessible"

const VersionQueryRequired = "DOCS-3008"
const VersionQueryRequiredMsg = "Article '$slug' applies to every version of package '$packageId': the 'version' query parameter is required"

const ArticleFileTooLarge = "DOCS-3009"
const ArticleFileTooLargeMsg = "File exceeds the maximum upload size of $maxSize bytes"

const InvalidFilePath = "DOCS-3010"
const InvalidFilePathMsg = "File path is incorrect: '$path'"

const ImportArchiveInvalid = "DOCS-3011"
const ImportArchiveInvalidMsg = "Import archive is not valid: $reason"

const ArticleFilePathConflict = "DOCS-3012"
const ArticleFilePathConflictMsg = "File '$path' already exists in this article"

const ArticleSlugImmutable = "DOCS-3013"
const ArticleSlugImmutableMsg = "Article slug cannot be changed (current '$slug')"

const ApihubUnavailable = "DOCS-5001"
const ApihubUnavailableMsg = "APIHUB is not available"

const UnknownEndpoint = "DOCS-9001"
const UnknownEndpointMsg = "Requested unknown endpoint"

const NavSectionNotFound = "DOCS-2006"
const NavSectionNotFoundMsg = "Navigation section with id '$id' not found"

const NavItemNotFound = "DOCS-2007"
const NavItemNotFoundMsg = "Navigation item with id '$id' not found"

const NavigationValidationFailed = "DOCS-3014"
const NavigationValidationFailedMsg = "Navigation is not valid: $reason"

const ArticleAlreadyInNavigation = "DOCS-3015"
const ArticleAlreadyInNavigationMsg = "Article '$articleId' is already placed in navigation item '$itemId'"

const HomeArticleNotGeneric = "DOCS-3016"
const HomeArticleNotGenericMsg = "Article '$articleId' cannot be shown on the home page: only generic articles are allowed"

const HomeArticleDuplicate = "DOCS-3017"
const HomeArticleDuplicateMsg = "Article '$articleId' is listed more than once"
