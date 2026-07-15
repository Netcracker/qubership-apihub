import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { intersectionBy } from 'lodash-es'

import type { ShowMcpEndpointDetail } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/McpEndpointDialog'
import type { FileLabelsRecord } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/FileTableUpload'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { McpDocumentType, SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { createFilesRecord, filesRecordToArray } from '@apihub/routes/root/PortalPage/PackagePage/files'
import {
  buildFileTypesAndLabels,
  buildInitFileState,
  partitionFilesByMcp,
  pruneMcpEndpoint,
  type McpStagedFileMeta,
} from '@apihub/routes/root/PortalPage/PackagePage/mcpPublish'
import { useVersionSources } from '../useVersionSources'
import { usePackageVersionConfig } from './usePackageVersionConfig'

const INIT_FILES_ACTION = 'InitFilesAction'
const ADD_FILES_ACTION = 'AddFilesAction'
const DELETE_FILE_ACTION = 'DeleteFileAction'
const EDIT_FILE_ACTION = 'EditFileAction'
const RESTORE_FILE_ACTION = 'RestoreFileAction'
const ASSIGN_MCP_FILE_ACTION = 'AssignMcpFileAction'

interface InitFilesAction {
  type: typeof INIT_FILES_ACTION
  sources: File[]
  fileTypesMap: Map<string, SpecType>
  filesWithLabels: FileLabelsRecord
  mcpFiles: Map<string, McpStagedFileMeta>
  mcpEndpoints: string[]
}

interface AddFilesAction {
  type: typeof ADD_FILES_ACTION
  files: File[]
  filesWithLabels: FileLabelsRecord
  fileTypesMap: Map<string, SpecType>
}

interface DeleteFileAction {
  type: typeof DELETE_FILE_ACTION
  fileName: string
}

interface EditFileAction {
  type: typeof EDIT_FILE_ACTION
  fileName: string
  labels: string[]
}

interface RestoreFileAction {
  type: typeof RESTORE_FILE_ACTION
  fileName: string
}

interface AssignMcpFileAction {
  type: typeof ASSIGN_MCP_FILE_ACTION
  fileName: string
  file: File
  meta: McpStagedFileMeta
  fileType: McpDocumentType
}

type StateActions =
  | InitFilesAction
  | AddFilesAction
  | DeleteFileAction
  | EditFileAction
  | RestoreFileAction
  | AssignMcpFileAction

interface State {
  sources: File[]
  fileTypesMap: Map<string, SpecType>
  filesWithLabels: FileLabelsRecord
  replacedFiles: File[]
  isInitialized: boolean
  mcpFiles: Map<string, McpStagedFileMeta>
  mcpEndpoints: string[]
}

const INITIAL_STATE: State = {
  sources: [],
  fileTypesMap: new Map(),
  filesWithLabels: {},
  replacedFiles: [],
  isInitialized: false,
  mcpFiles: new Map(),
  mcpEndpoints: [],
}

function reducer(state: State, action: StateActions): State {
  const { fileTypesMap, filesWithLabels, replacedFiles, sources, mcpFiles, mcpEndpoints } = state

  switch (action.type) {
    case INIT_FILES_ACTION:
      return {
        ...state,
        sources: action.sources,
        fileTypesMap: action.fileTypesMap,
        filesWithLabels: action.filesWithLabels,
        mcpFiles: action.mcpFiles,
        mcpEndpoints: action.mcpEndpoints,
        isInitialized: true,
      }
    case ADD_FILES_ACTION:
      return {
        ...state,
        filesWithLabels: {
          ...filesWithLabels,
          ...createFilesRecord(action.files, filesWithLabels),
        },
        fileTypesMap: new Map([...fileTypesMap, ...action.fileTypesMap]),
        replacedFiles: [
          ...replacedFiles,
          ...intersectionBy(
            filesRecordToArray(filesWithLabels),
            sources,
            action.files,
            'name',
          ),
        ],
      }
    case ASSIGN_MCP_FILE_ACTION: {
      const nextMcpFiles = new Map(mcpFiles)
      nextMcpFiles.set(action.fileName, action.meta)
      const endpoint = action.meta.mcpEndpoint
      const nextEndpoints = mcpEndpoints.includes(endpoint)
        ? mcpEndpoints
        : [...mcpEndpoints, endpoint]
      const nextFileTypesMap = new Map(fileTypesMap)
      nextFileTypesMap.set(action.fileName, action.fileType)
      return {
        ...state,
        mcpFiles: nextMcpFiles,
        mcpEndpoints: nextEndpoints,
        filesWithLabels: {
          ...filesWithLabels,
          ...createFilesRecord([action.file], filesWithLabels),
        },
        fileTypesMap: nextFileTypesMap,
        replacedFiles: [
          ...replacedFiles,
          ...intersectionBy(
            filesRecordToArray(filesWithLabels),
            sources,
            [action.file],
            'name',
          ),
        ],
      }
    }
    case DELETE_FILE_ACTION: {
      fileTypesMap.delete(action.fileName)
      delete filesWithLabels[action.fileName]
      const nextMcpFiles = new Map(mcpFiles)
      const removedMeta = nextMcpFiles.get(action.fileName)
      nextMcpFiles.delete(action.fileName)
      const nextEndpoints = removedMeta
        ? pruneMcpEndpoint(mcpEndpoints, nextMcpFiles, removedMeta.mcpEndpoint)
        : mcpEndpoints
      return {
        ...state,
        filesWithLabels: { ...filesWithLabels },
        replacedFiles: replacedFiles.filter(file => file.name !== action.fileName),
        fileTypesMap: fileTypesMap,
        mcpFiles: nextMcpFiles,
        mcpEndpoints: nextEndpoints,
      }
    }
    case EDIT_FILE_ACTION:
      state.filesWithLabels[action.fileName].labels = action.labels
      return {
        ...state,
      }
    case RESTORE_FILE_ACTION:
      return {
        ...state,
        replacedFiles: replacedFiles.filter(file => file.name !== action.fileName),
      }
    default:
      return state
  }
}

type Actions = {
  addFiles: (files: File[]) => void
  deleteFile: (fileName: string) => void
  editFile: (fileName: string, labels: string []) => void
  restoreFile: (fileName: string) => void
}

export type FilesProviderProps = {
  enabled?: boolean
} & PropsWithChildren

export const FilesProvider: FC<FilesProviderProps> = memo<FilesProviderProps>(({ enabled, children }) => {
  const { packageId, versionId } = useParams()
  const { showMcpEndpointDialog } = useEventBus()
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const mcpEndpointsRef = useRef(state.mcpEndpoints)
  const lastSelectedMcpEndpointRef = useRef<string | undefined>()

  useEffect(() => {
    mcpEndpointsRef.current = state.mcpEndpoints
  }, [state.mcpEndpoints])

  const isEditingVersion = !!versionId && versionId !== SPECIAL_VERSION_KEY
  const [sources, isSourcesLoading] = useVersionSources({ enabled: enabled && isEditingVersion })
  const [config, isConfigLoading] = usePackageVersionConfig(packageId, versionId)
  const [areFilesProcessing, setAreFilesProcessing] = useState(true)

  useEffect(() => {
    buildInitFileState(sources, config).then(initData =>
      dispatch({
        type: INIT_FILES_ACTION,
        sources: sources,
        fileTypesMap: initData.fileTypesMap,
        filesWithLabels: initData.filesWithLabels,
        mcpFiles: initData.mcpFiles,
        mcpEndpoints: initData.mcpEndpoints,
      })).then(() => !isConfigLoading && !isSourcesLoading && setAreFilesProcessing(false))
  }, [sources, config, isConfigLoading, isSourcesLoading])

  const promptMcpEndpoint = useCallback((detail: Omit<ShowMcpEndpointDetail, 'onConfirm' | 'onCancel'>): Promise<string | undefined> => {
    return new Promise(resolve => {
      showMcpEndpointDialog({
        ...detail,
        onConfirm: (mcpEndpoint: string) => resolve(mcpEndpoint),
        onCancel: () => resolve(undefined),
      })
    })
  }, [showMcpEndpointDialog])

  const addFiles = useCallback(async (files: File[]): Promise<void> => {
    const { regularFiles, mcpCandidates } = await partitionFilesByMcp(files)

    if (regularFiles.length > 0) {
      const regularData = await buildFileTypesAndLabels(regularFiles)
      dispatch({
        type: ADD_FILES_ACTION,
        files: regularFiles,
        fileTypesMap: regularData.fileTypesMap,
        filesWithLabels: regularData.filesWithLabels,
      })
    }

    if (mcpCandidates.length > 0) {
      let knownEndpoints = [...mcpEndpointsRef.current]
      const [firstCandidate] = mcpCandidates
      const mcpEndpoint = await promptMcpEndpoint({
        file: firstCandidate.file,
        documentType: firstCandidate.documentType,
        knownEndpoints: knownEndpoints,
        defaultEndpoint: lastSelectedMcpEndpointRef.current ?? knownEndpoints[0],
      })
      if (mcpEndpoint !== undefined) {
        for (const candidate of mcpCandidates) {
          dispatch({
            type: ASSIGN_MCP_FILE_ACTION,
            fileName: candidate.file.name,
            file: candidate.file,
            meta: {
              documentType: candidate.documentType,
              mcpEndpoint: mcpEndpoint,
            },
            fileType: candidate.documentType,
          })
        }
        if (!knownEndpoints.includes(mcpEndpoint)) {
          knownEndpoints = [...knownEndpoints, mcpEndpoint]
          mcpEndpointsRef.current = knownEndpoints
        }
        lastSelectedMcpEndpointRef.current = mcpEndpoint
      }
    }
  }, [promptMcpEndpoint])

  const deleteFile = useCallback((fileName: string): void => dispatch({
      type: DELETE_FILE_ACTION,
      fileName: fileName,
    }), [],
  )

  const editFile = useCallback((fileName: string, labels: string[]): void => dispatch({
      type: EDIT_FILE_ACTION,
      fileName: fileName,
      labels: labels,
    }), [],
  )

  const restoreFile = useCallback((fileName: string): void => dispatch({
      type: RESTORE_FILE_ACTION,
      fileName: fileName,
    }), [],
  )

  const actions: Actions = useMemo(
    () => ({
      addFiles,
      deleteFile,
      editFile,
      restoreFile,
    }), [addFiles, deleteFile, editFile, restoreFile],
  )

  return (
    <FilesContext.Provider value={state}>
      <FileActionsContext.Provider value={actions}>
        <FilesLoadingContext.Provider
          value={isSourcesLoading || !state.isInitialized || isConfigLoading || areFilesProcessing}>
          {children}
        </FilesLoadingContext.Provider>
      </FileActionsContext.Provider>
    </FilesContext.Provider>
  )
})

const FilesContext = createContext<State>(INITIAL_STATE)
const FileActionsContext = createContext<Actions>()
const FilesLoadingContext = createContext<IsLoading>()

export function useFiles(): State {
  return useContext(FilesContext)
}

export function useFileActions(): Actions {
  return useContext(FileActionsContext)
}

export function useFilesLoading(): IsLoading {
  return useContext(FilesLoadingContext)
}
