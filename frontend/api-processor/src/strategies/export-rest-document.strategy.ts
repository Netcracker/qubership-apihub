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

import { BuilderStrategy, BuildResult, BuildTypeContexts, ExportRestDocumentBuildConfig } from '../types'
import { getDocumentTitle, getSplittedVersionKey } from '../utils'
import { createCommonStaticExportDocuments, createSingleFileExportName } from '../utils/export'
import { createRestExportDocument } from '../apitypes/rest/rest.document'
import { FILE_FORMAT_HTML } from '../consts'

export class ExportRestDocumentStrategy implements BuilderStrategy {
  async execute(config: ExportRestDocumentBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { builderContext } = contexts
    const { rawDocumentResolver, templateResolver, packageResolver } = builderContext(config)
    const { packageId, version: versionWithRevision, documentId, format, allowedOasExtensions } = config
    const [version] = getSplittedVersionKey(versionWithRevision)

    const file = await rawDocumentResolver(
      versionWithRevision,
      packageId,
      documentId,
    )
    const { name: packageName } = await packageResolver(packageId)
    buildResult.exportDocuments.push(await createRestExportDocument(file.name, await file.text(), format, packageName, version, templateResolver, allowedOasExtensions))

    if (format === FILE_FORMAT_HTML) {
      buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver, buildResult.exportDocuments[0].filename))
      buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(file.name), 'zip')
      return buildResult
    }

    buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(file.name), format)

    return buildResult
  }
}
