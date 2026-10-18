import { groupBy } from 'lodash-es'

import { detectMcpDocumentType, unwrapJsonRpc } from '@netcracker/qubership-apihub-api-processor'

import type { FileLabelsRecord } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/FileTableUpload'
import { compareMcpDocumentTypes } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import {
  calculateSpecType,
  getFileExtension,
  JSON_FILE_EXTENSION,
} from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import {
  isMcpDocumentSpecType,
  type McpDocumentType,
  type SpecType,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'

import type { PackageVersionConfig } from '@portal/entities/package-version-config'
import { createFilesRecord } from '@portal/routes/root/PortalPage/PackagePage/files'

export type McpStagedFileMeta = Readonly<{
  documentType: McpDocumentType
  mcpEndpoint: string
}>

type McpFilesByEndpointGroup = Readonly<{
  mcpEndpoint: string
  files: ReadonlyArray<Readonly<{ fileName: string; meta: McpStagedFileMeta }>>
}>

export function groupMcpFilesByEndpoint(
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
  orderedEndpoints: ReadonlyArray<string>,
): ReadonlyArray<McpFilesByEndpointGroup> {
  const entries = [...mcpStagedFileMetaByName.entries()].map(([fileName, meta]) => ({
    fileName: fileName,
    meta: meta,
    mcpEndpoint: meta.mcpEndpoint,
  }))
  const grouped = groupBy(entries, entry => entry.mcpEndpoint)

  const endpointOrder = orderedEndpoints.filter(endpoint => grouped[endpoint]?.length)
  for (const endpoint of Object.keys(grouped)) {
    if (!endpointOrder.includes(endpoint)) {
      endpointOrder.push(endpoint)
    }
  }

  return endpointOrder.map(mcpEndpoint => ({
    mcpEndpoint: mcpEndpoint,
    files: (grouped[mcpEndpoint] ?? [])
      .map(({ fileName, meta }) => ({ fileName: fileName, meta: meta }))
      .sort(compareMcpStagedFiles),
  })).filter(group => group.files.length > 0)
}

export function pruneMcpEndpoint(
  endpoints: string[],
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
  endpoint: string,
): string[] {
  const stillUsed = [...mcpStagedFileMetaByName.values()].some(meta => meta.mcpEndpoint === endpoint)
  return stillUsed ? endpoints : endpoints.filter(item => item !== endpoint)
}

export async function buildFileTypesAndLabels(
  files: File[],
): Promise<Readonly<{ fileTypesMap: Map<string, SpecType>; filesWithLabels: FileLabelsRecord }>> {
  const fileTypesMap = await buildFileTypesMap(files)
  return {
    fileTypesMap: fileTypesMap,
    filesWithLabels: createFilesRecord(files, {}),
  }
}

export async function buildInitFileState(
  files: File[],
  config?: PackageVersionConfig | null,
): Promise<
  Readonly<{
    fileTypesMap: Map<string, SpecType>
    filesWithLabels: FileLabelsRecord
    mcpStagedFileMetaByName: Map<string, McpStagedFileMeta>
    mcpEndpoints: string[]
  }>
> {
  const fileTypesMap = await buildFileTypesMap(files)
  const mcpStagedFileMetaByName = new Map<string, McpStagedFileMeta>()
  const mcpEndpoints: string[] = []

  if (config) {
    for (const file of files) {
      const configFile = config.files?.find(f => f.fileKey === file.name)
      const mcpEndpoint = configFile?.metadata?.mcpEndpoint?.trim()
      const documentType = fileTypesMap.get(file.name)
      if (mcpEndpoint && documentType && isMcpDocumentSpecType(documentType)) {
        mcpStagedFileMetaByName.set(file.name, {
          documentType: documentType,
          mcpEndpoint: mcpEndpoint,
        })
        if (!mcpEndpoints.includes(mcpEndpoint)) {
          mcpEndpoints.push(mcpEndpoint)
        }
      }
    }
  }

  const filesWithLabels = config
    ? files.reduce((acc, file) => {
      const fileLabels = config.files?.find(f => f.fileKey === file.name)?.labels ?? []
      acc[file.name] = {
        file: file,
        labels: fileLabels,
      }
      return acc
    }, {} as FileLabelsRecord)
    : {}

  return {
    fileTypesMap,
    filesWithLabels,
    mcpStagedFileMetaByName,
    mcpEndpoints,
  }
}

export async function partitionFilesByMcp(files: File[]): Promise<
  Readonly<{
    regularFiles: File[]
    mcpCandidates: ReadonlyArray<Readonly<{ file: File; documentType: McpDocumentType }>>
  }>
> {
  const regularFiles: File[] = []
  const mcpCandidates: Array<Readonly<{ file: File; documentType: McpDocumentType }>> = []

  await Promise.all(files.map(async file => {
    const documentType = await readMcpDocumentTypeFromFile(file)
    if (documentType) {
      mcpCandidates.push({ file: file, documentType: documentType })
    } else {
      regularFiles.push(file)
    }
  }))

  return { regularFiles: regularFiles, mcpCandidates: mcpCandidates }
}

function detectMcpDocumentTypeFromJson(json: unknown): McpDocumentType | undefined {
  if (!isObject(json)) {
    return undefined
  }
  const unwrapped = unwrapJsonRpc(json as Record<string, unknown>)
  if (!isObject(unwrapped)) {
    return undefined
  }
  return detectMcpDocumentType(unwrapped as Record<string, unknown>)
}

async function readMcpDocumentTypeFromFile(file: File): Promise<McpDocumentType | undefined> {
  if (!isJsonUploadCandidate(file.name)) {
    return undefined
  }
  try {
    return detectMcpDocumentTypeFromJson(JSON.parse(await file.text()))
  } catch {
    return undefined
  }
}

async function buildFileTypesMap(files: File[]): Promise<Map<string, SpecType>> {
  const entries = await Promise.all(files.map(async file => {
    const mcpType = await readMcpDocumentTypeFromFile(file)
    if (mcpType) {
      return [file.name, mcpType] as [string, SpecType]
    }
    const extension = getFileExtension(file.name)
    const content = await file.text()
    return [file.name, calculateSpecType(extension, content)] as [string, SpecType]
  }))
  return new Map(entries)
}

function compareMcpStagedFiles(
  fileA: Readonly<{ fileName: string; meta: McpStagedFileMeta }>,
  fileB: Readonly<{ fileName: string; meta: McpStagedFileMeta }>,
): number {
  const typeCompare = compareMcpDocumentTypes(fileA.meta.documentType, fileB.meta.documentType)
  if (typeCompare !== 0) {
    return typeCompare
  }
  return fileA.fileName.localeCompare(fileB.fileName)
}

function isJsonUploadCandidate(fileName: string): boolean {
  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return true
  }
  return getFileExtension(fileName) === JSON_FILE_EXTENSION
}
