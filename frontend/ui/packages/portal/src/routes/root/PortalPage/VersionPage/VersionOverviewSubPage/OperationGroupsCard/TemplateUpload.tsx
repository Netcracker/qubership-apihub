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

import type { FC } from 'react'
import { memo, useCallback } from 'react'
import {
  JSON_FILE_EXTENSION,
  YAML_FILE_EXTENSION,
  YML_FILE_EXTENSION,
} from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { useDownloadExportTemplate } from './useDownloadExportTemplate'
import { useParams } from 'react-router-dom'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { FileUploadField } from '@netcracker/qubership-apihub-ui-shared/components/FileUploadField'

export type TemplateUploadProps = {
  uploadedFile: File | undefined
  setUploadedFile: (file: File | undefined) => void
  groupName: string
  apiType: ApiType
  downloadAvailable: boolean
}
export const TemplateUpload: FC<TemplateUploadProps> = memo<TemplateUploadProps>(({
  uploadedFile,
  setUploadedFile,
  groupName,
  apiType,
  downloadAvailable,
}) => {
  const { packageId, versionId } = useParams()
  const [downloadExportTemplate] = useDownloadExportTemplate()

  const onDownload = useCallback(
    () => downloadExportTemplate({
      packageKey: packageId!,
      version: versionId!,
      groupName: groupName,
      apiType: apiType,
    }),
    [apiType, downloadExportTemplate, groupName, packageId, versionId],
  )

  return (
    <FileUploadField
      uploadedFile={uploadedFile}
      setUploadedFile={setUploadedFile}
      downloadAvailable={downloadAvailable}
      onDownload={onDownload}
      acceptableExtensions={[YAML_FILE_EXTENSION, YML_FILE_EXTENSION, JSON_FILE_EXTENSION]}
    />
  )
})
