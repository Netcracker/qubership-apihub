import { VersionComparisonResolver } from './comparison'
import { VersionDeprecatedResolver } from './deprecated'
import {
  FileResolver,
  GroupDocumentsResolver,
  RawDocumentResolver,
  TemplateResolver,
  VersionDocumentsResolver,
} from './documents'
import { VersionOperationsResolver } from './operations'
import { VersionReferencesResolver } from './references'
import { VersionResolver } from './version'
import { GroupExportTemplateResolver } from '../internal'
import { PackageResolver } from './package'

export interface BuilderResolvers {
  fileResolver?: FileResolver
  packageResolver?: PackageResolver
  versionResolver?: VersionResolver
  versionOperationsResolver?: VersionOperationsResolver
  versionReferencesResolver?: VersionReferencesResolver
  versionDeprecatedResolver?: VersionDeprecatedResolver
  versionComparisonResolver?: VersionComparisonResolver
  groupDocumentsResolver?: GroupDocumentsResolver
  versionDocumentsResolver?: VersionDocumentsResolver
  rawDocumentResolver?: RawDocumentResolver
  groupExportTemplateResolver?: GroupExportTemplateResolver
  templateResolver?: TemplateResolver
}
