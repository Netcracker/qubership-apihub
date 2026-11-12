import {
  BuilderResolvers,
  GroupDocumentsResolver,
  RawDocumentResolver,
  VersionComparisonResolver,
  VersionDeprecatedResolver,
  VersionDocumentsResolver,
  VersionOperationsResolver,
  VersionReferencesResolver,
  VersionResolver,
} from '../../../src'

export interface IRegistry extends Omit<BuilderResolvers, 'fileResolver'> {
  versionResolvers: Omit<BuilderResolvers, 'fileResolver'>

  versionResolver: VersionResolver
  versionOperationsResolver: VersionOperationsResolver
  versionReferencesResolver: VersionReferencesResolver
  versionComparisonResolver: VersionComparisonResolver
  versionDeprecatedResolver: VersionDeprecatedResolver
  // todo make not optional
  versionDocumentsResolver?: VersionDocumentsResolver
  rawDocumentResolver?: RawDocumentResolver
  groupDocumentsResolver: GroupDocumentsResolver
}
