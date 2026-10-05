import { useEffect, useMemo, useRef, useState } from 'react'

import type { FileLabelsRecord } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/FileTableUpload'
import { MCP_DOCUMENT_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'

import type { McpStagedFileMeta } from '@portal/routes/root/PortalPage/PackagePage/mcpPublish'
import {
  collectMcpEndpointValidations,
  getPublishDisabledHint,
  hasBlockingMcpValidations,
  type McpEndpointValidation,
} from '@portal/routes/root/PortalPage/PackagePage/mcpValidation'

type UseMcpPublishValidationResult = Readonly<{
  endpointValidations: ReadonlyMap<string, McpEndpointValidation>
  hasBlockingIssues: boolean
  publishDisabledHint: string | undefined
}>

type McpValidationSources = Readonly<{
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>
  filesWithLabels: FileLabelsRecord
}>

type AsyncEndpointValidations = Readonly<{
  contentKey: string
  validations: ReadonlyMap<string, McpEndpointValidation>
}>

export function useMcpPublishValidation(
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
  filesWithLabels: FileLabelsRecord,
): UseMcpPublishValidationResult {
  const [asyncValidations, setAsyncValidations] = useState<AsyncEndpointValidations | undefined>(undefined)

  const sourcesRef = useRef<McpValidationSources>({ mcpStagedFileMetaByName, filesWithLabels })
  sourcesRef.current = { mcpStagedFileMetaByName, filesWithLabels }

  // Content fingerprint: re-validate only when MCP-relevant data changes, not on Map/record identity churn.
  const validationContentKey = useMemo(
    () => buildValidationContentKey(mcpStagedFileMetaByName, filesWithLabels),
    [mcpStagedFileMetaByName, filesWithLabels],
  )

  // Missing-init is meta-only; keep it sync so Publish cannot race File.text().
  const syncEndpointValidations = useMemo(() => {
    if (mcpStagedFileMetaByName.size === 0) {
      return new Map<string, McpEndpointValidation>()
    }
    return collectMcpEndpointValidations({
      mcpStagedFileMetaByName: mcpStagedFileMetaByName,
      initFileContents: new Map(),
    })
  }, [mcpStagedFileMetaByName])

  useEffect(() => {
    let cancelled = false
    const { mcpStagedFileMetaByName, filesWithLabels } = sourcesRef.current

    if (mcpStagedFileMetaByName.size === 0) {
      setAsyncValidations({
        contentKey: validationContentKey,
        validations: new Map(),
      })
      return
    }

    void readInitFileContents(mcpStagedFileMetaByName, filesWithLabels)
      .then(initFileContents => {
        if (cancelled) {
          return
        }
        setAsyncValidations({
          contentKey: validationContentKey,
          validations: collectMcpEndpointValidations({
            mcpStagedFileMetaByName,
            initFileContents,
          }),
        })
      })

    return () => {
      cancelled = true
    }
  }, [validationContentKey])

  const endpointValidations = asyncValidations?.contentKey === validationContentKey
    ? asyncValidations.validations
    : syncEndpointValidations

  return {
    endpointValidations: endpointValidations,
    hasBlockingIssues: hasBlockingMcpValidations(endpointValidations),
    publishDisabledHint: getPublishDisabledHint(endpointValidations),
  }
}

async function readInitFileContents(
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
  filesWithLabels: FileLabelsRecord,
): Promise<ReadonlyMap<string, string>> {
  const entries = await Promise.all(
    [...mcpStagedFileMetaByName.entries()]
      .filter(([, meta]) => meta.documentType === MCP_DOCUMENT_TYPE.MCP_INIT)
      .map(async ([fileName]) => {
        const file = filesWithLabels[fileName]?.file
        if (!file) {
          return [fileName, ''] as const
        }
        return [fileName, await file.text()] as const
      }),
  )
  return new Map(entries)
}

function buildValidationContentKey(
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
  filesWithLabels: FileLabelsRecord,
): string {
  return [...mcpStagedFileMetaByName.entries()]
    .map(([fileName, meta]) => {
      const file = filesWithLabels[fileName]?.file
      const initContentKey = meta.documentType === MCP_DOCUMENT_TYPE.MCP_INIT
        ? `:${file?.lastModified ?? 0}:${file?.size ?? 0}`
        : ''
      return `${fileName}:${meta.documentType}:${meta.mcpEndpoint}${initContentKey}`
    })
    .sort()
    .join('|')
}
