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

import { BuildConfigRef, BuildType, ExportFormat, PackageId, VersionId } from '../external'


//todo this is info.json, add format and other missing fields
// /portal/packages/NC.CP.AH.RS/2025.1/operations/rest/api-v3-packages-packageid-publish-publishid-status-post?mode=raw#/
export interface PackageConfig {
  packageId: PackageId
  version: VersionId
  previousVersion?: VersionId
  previousVersionPackageId?: PackageId

  buildType?: BuildType

  refs?: BuildConfigRef[]

  metadata?: Record<string, unknown>
  // todo
  format?: ExportFormat
}
