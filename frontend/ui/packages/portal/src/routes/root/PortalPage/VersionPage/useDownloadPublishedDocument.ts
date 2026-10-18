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

import { useMutation, useQuery } from '@tanstack/react-query'
import fileDownload from 'js-file-download'
import { generatePath, useParams } from 'react-router-dom'
import { safeParse } from '@stoplight/json'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { portalRequestBlob } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { FileExtension, YML_FILE_EXTENSION } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import {
  getFileExtension,
  isYamlFile,
  JSON_FILE_EXTENSION,
  YAML_FILE_EXTENSION,
} from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { resolveRefs } from '@apihub/utils/specifications'
import { toFormattedJsonString } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { toJsonSchema, toYaml } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'

export function useDownloadPublishedDocument(options: {
  packageKey?: Key
  versionKey?: Key
  slug: Key
}): [DownloadPublishedDocument, IsLoading] {
  const {
    packageKey,
    versionKey,
    slug,
  } = options
  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)
  const { mutate, isLoading } = useMutation<void, Error, Options | undefined>({
    mutationFn: options => downloadPublishedDocument(packageKey!, fullVersion, slug, options),
  })

  return [mutate, isLoading]
}

const PUBLISHED_DOCUMENT_RAW_QUERY_KEY = 'published-document-raw-query-key'

export function usePublishedDocumentRaw(options: {
  packageKey?: Key
  versionKey?: Key
  slug: Key
}): [string, IsLoading] {
  const { packageId, versionId } = useParams()
  const packageKey = options?.packageKey ?? packageId
  const versionKey = options?.versionKey ?? versionId
  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)
  const slug = options?.slug

  const { data, isLoading } = useQuery<string, Error, string>({
    queryKey: [PUBLISHED_DOCUMENT_RAW_QUERY_KEY, packageKey!, fullVersion!, slug!],
    queryFn: () => getPublishedDocumentRaw(packageKey!, fullVersion!, slug!),
    enabled: !!packageKey && !!fullVersion && !!slug,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  return [data ?? '', isLoading]
}

async function getPublishedDocumentRaw(
  packageKey: Key,
  versionKey: Key,
  slug: Key,
  options: Options = { docType: RAW_DOC_TYPE },
): Promise<string> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const docId = encodeURIComponent(slug)

  const searchParams = optionalSearchParams({
    docType: { value: options?.docType, toStringValue: (value) => `${value}`.toUpperCase() },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/files/:docId/doc'
  const response = await portalRequestBlob(
    `${generatePath(pathPattern, { packageId, versionId, docId })}?${searchParams}`,
    {
      method: 'get',
    }, {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )

  const data = await response.blob()

  return await data.text()
}

async function downloadPublishedDocument(
  packageKey: Key,
  versionKey: Key,
  slug: Key,
  options: Options = { docType: RAW_DOC_TYPE },
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const docId = encodeURIComponent(slug)

  const pathPattern = '/packages/:packageId/versions/:versionId/files/:docId/doc'
  const response = await portalRequestBlob(
    `${generatePath(pathPattern, { packageId, versionId, docId })}?docType=${options?.docType?.toUpperCase()}`,
    {
      method: 'get',
    }, {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )

  const getFilename = (): string => response.headers.get('content-disposition')!.split('filename=')[1].split(';')[0]

  const data = await response.blob()
  if (options?.docType === RAW_DOC_TYPE && options.rawOptions) {
    return downloadPublishedDocumentRaw(data, getFilename, options.rawOptions.resultFileExtension, options.rawOptions.inlineRefs)
  }

  return fileDownload(data, getFilename())
}

async function downloadPublishedDocumentRaw(
  data: Blob,
  getFilename: () => string,
  resultFileExtension: Exclude<FileExtension, typeof YML_FILE_EXTENSION>,
  inlineRefs: boolean,
): Promise<void> {
  const fileExtension = getFileExtension(getFilename())

  const fileName = getFilename().substring(0, getFilename().lastIndexOf('.'))
  const resultFileName = `${fileName}${resultFileExtension}`

  const yamlToJson = fileExtension === YAML_FILE_EXTENSION && resultFileExtension === JSON_FILE_EXTENSION
  const jsonToYaml = fileExtension === JSON_FILE_EXTENSION && resultFileExtension === YAML_FILE_EXTENSION

  const rawText = await data.text()
  const resolvedContent = inlineRefs ? await resolveRefs(rawText) : {}

  if (yamlToJson) {
    return inlineRefs
      ? fileDownload(toFormattedJsonString(resolvedContent), resultFileName)
      : fileDownload(toFormattedJsonString(toJsonSchema(rawText) ?? {}), resultFileName)

  }
  if (jsonToYaml) {
    return inlineRefs
      ? fileDownload(toYaml(resolvedContent) ?? '', resultFileName)
      : fileDownload(toYaml(JSON.parse(rawText)) ?? '', resultFileName)
  }

  // case of no conversion
  if (inlineRefs) {
    return fileDownload(
      isYamlFile(fileExtension)
        ? toYaml(resolvedContent) ?? ''
        : toFormattedJsonString(resolvedContent),
      getFilename(),
    )
  } else {
    return fileDownload(
      resultFileExtension === YAML_FILE_EXTENSION
        ? toYaml(safeParse(rawText)) ?? ''
        : data,
      getFilename(),
    )
  }
}

type DownloadPublishedDocument = (options?: Options) => void

export const INTERACTIVE_DOC_TYPE = 'interactive'
export const RAW_DOC_TYPE = 'raw'

type DocType =
  | typeof INTERACTIVE_DOC_TYPE
  | typeof RAW_DOC_TYPE

type Options = {
  docType?: DocType
  rawOptions?: {
    resultFileExtension: Exclude<FileExtension, typeof YML_FILE_EXTENSION>
    inlineRefs: boolean
  }
}
