/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { VersionComparisonResolver } from './comparison'
import { VersionDeprecatedResolver } from './deprecated'
import { VersionDocumentsResolver } from './documents'
import { VersionOperationsResolver } from './operations'
import { VersionReferencesResolver } from './references'
import { VersionResolver } from './version'
import { FileId } from './types'
import { TemplateResolver } from '../internal'

export type FileResolver = (fileId: FileId) => Promise<Blob | null>

export interface BuilderResolvers {
  fileResolver: FileResolver
  versionResolver?: VersionResolver
  versionOperationsResolver?: VersionOperationsResolver
  versionReferencesResolver?: VersionReferencesResolver
  versionDeprecatedResolver?: VersionDeprecatedResolver
  versionComparisonResolver?: VersionComparisonResolver
  versionDocumentsResolver?: VersionDocumentsResolver
  templateResolver?: TemplateResolver
}
