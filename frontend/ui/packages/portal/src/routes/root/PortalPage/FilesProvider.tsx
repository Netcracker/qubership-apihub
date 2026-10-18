import { intersectionBy } from 'lodash-es'
import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useEventBus } from '@portal/routes/EventBusProvider'
import { createFilesRecord, filesRecordToArray } from '@portal/routes/root/PortalPage/PackagePage/files'
import type { ShowMcpEndpointDetail } from '@portal/routes/root/PortalPage/PackagePage/McpEndpointDialog'
import {
  buildFileTypesAndLabels,
  buildInitFileState,
  type McpStagedFileMeta,
  partitionFilesByMcp,
  pruneMcpEndpoint,
} from '@portal/routes/root/PortalPage/PackagePage/mcpPublish'
import { hasDuplicateMcpTypesInBatch } from '@portal/routes/root/PortalPage/PackagePage/mcpValidation'
import type { FileLabelsRecord } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/FileTableUpload'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { McpDocumentType, SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { useVersionSources } from '../useVersionSources'
import { usePackageVersionConfig } from './usePackageVersionConfig'

const INIT_FILES_ACTION = 'InitFilesAction'
const ADD_FILES_ACTION = 'AddFilesAction'
const DELETE_FILE_ACTION = 'DeleteFileAction'
const EDIT_FILE_ACTION = 'EditFileAction'
const RESTORE_FILE_ACTION = 'RestoreFileAction'
const ASSIGN_MCP_BATCH_ACTION = 'AssignMcpBatchAction'
const RENAME_MCP_ENDPOINT_ACTION = 'RenameMcpEndpointAction'
const DELETE_MCP_ENDPOINT_ACTION = 'DeleteMcpEndpointAction'

interface InitFilesAction {
  type: typeof INIT_FILES_ACTION
  sources: File[]
  fileTypesMap: Map<string, SpecType>
  filesWithLabels: FileLabelsRecord
  mcpStagedFileMetaByName: Map<string, McpStagedFileMeta>
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

interface AssignMcpBatchAction {
  type: typeof ASSIGN_MCP_BATCH_ACTION
  assignments: ReadonlyArray<{
    fileName: string
    file: File
    meta: McpStagedFileMeta
    fileType: McpDocumentType
  }>
}

interface RenameMcpEndpointAction {
  type: typeof RENAME_MCP_ENDPOINT_ACTION
  oldEndpoint: string
  newEndpoint: string
}

interface DeleteMcpEndpointAction {
  type: typeof DELETE_MCP_ENDPOINT_ACTION
  mcpEndpoint: string
}

type StateActions =
  | InitFilesAction
  | AddFilesAction
  | DeleteFileAction
  | EditFileAction
  | RestoreFileAction
  | AssignMcpBatchAction
  | RenameMcpEndpointAction
  | DeleteMcpEndpointAction

interface State {
  sources: File[]
  fileTypesMap: Map<string, SpecType>
  filesWithLabels: FileLabelsRecord
  replacedFiles: File[]
  isInitialized: boolean
  hasUnsavedChanges: boolean
  mcpStagedFileMetaByName: Map<string, McpStagedFileMeta>
  mcpEndpoints: string[]
}

const INITIAL_STATE: State = {
  sources: [],
  fileTypesMap: new Map(),
  filesWithLabels: {},
  replacedFiles: [],
  isInitialized: false,
  hasUnsavedChanges: false,
  mcpStagedFileMetaByName: new Map(),
  mcpEndpoints: [],
}

function reducer(state: State, action: StateActions): State {
  const { fileTypesMap, filesWithLabels, replacedFiles, sources, mcpStagedFileMetaByName, mcpEndpoints } = state

  switch (action.type) {
    case INIT_FILES_ACTION:
      return {
        ...state,
        sources: action.sources,
        fileTypesMap: action.fileTypesMap,
        filesWithLabels: action.filesWithLabels,
        mcpStagedFileMetaByName: action.mcpStagedFileMetaByName,
        mcpEndpoints: action.mcpEndpoints,
        isInitialized: true,
        hasUnsavedChanges: false,
      }
    case ADD_FILES_ACTION: {
      // Non-MCP upload always clears MCP identity by basename; MCP re-assign is ASSIGN_MCP_BATCH only.
      const nextMcpStagedFileMetaByName = new Map(mcpStagedFileMetaByName)
      let nextEndpoints = mcpEndpoints
      for (const file of action.files) {
        const removedMeta = nextMcpStagedFileMetaByName.get(file.name)
        if (removedMeta) {
          nextMcpStagedFileMetaByName.delete(file.name)
          nextEndpoints = pruneMcpEndpoint(
            nextEndpoints,
            nextMcpStagedFileMetaByName,
            removedMeta.mcpEndpoint,
          )
        }
      }
      return {
        ...state,
        hasUnsavedChanges: true,
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
        mcpStagedFileMetaByName: nextMcpStagedFileMetaByName,
        mcpEndpoints: nextEndpoints,
      }
    }
    case ASSIGN_MCP_BATCH_ACTION: {
      if (action.assignments.length === 0) {
        return state
      }

      const { mcpEndpoint } = action.assignments[0].meta
      const uploadDocumentTypes = new Set(
        action.assignments.map(assignment => assignment.meta.documentType),
      )
      const assignmentFileNames = new Set(
        action.assignments.map(assignment => assignment.fileName),
      )

      const conflictingFileNames = new Set(
        [...mcpStagedFileMetaByName.entries()]
          .filter(([, existingMeta]) =>
            existingMeta.mcpEndpoint === mcpEndpoint &&
            uploadDocumentTypes.has(existingMeta.documentType),
          )
          .map(([existingFileName]) => existingFileName)
          .filter(existingFileName => !assignmentFileNames.has(existingFileName)),
      )

      const nextMcpStagedFileMetaByName = new Map(mcpStagedFileMetaByName)
      for (const fileName of conflictingFileNames) {
        nextMcpStagedFileMetaByName.delete(fileName)
      }
      const withoutConflicts = omitFilesFromMaps(
        conflictingFileNames,
        fileTypesMap,
        filesWithLabels,
      )
      const nextFileTypesMap = withoutConflicts.fileTypesMap
      let nextFilesWithLabels = withoutConflicts.filesWithLabels

      let nextReplacedFiles = replacedFiles.filter(file => !conflictingFileNames.has(file.name))
      const nextEndpoints = mcpEndpoints.includes(mcpEndpoint)
        ? mcpEndpoints
        : [...mcpEndpoints, mcpEndpoint]

      for (const assignment of action.assignments) {
        nextMcpStagedFileMetaByName.set(assignment.fileName, assignment.meta)
        nextFileTypesMap.set(assignment.fileName, assignment.fileType)
        nextFilesWithLabels = {
          ...nextFilesWithLabels,
          ...createFilesRecord([assignment.file], nextFilesWithLabels),
        }
        nextReplacedFiles = [
          ...nextReplacedFiles,
          ...intersectionBy(
            filesRecordToArray(nextFilesWithLabels),
            sources,
            [assignment.file],
            'name',
          ),
        ]
      }

      return {
        ...state,
        hasUnsavedChanges: true,
        mcpStagedFileMetaByName: nextMcpStagedFileMetaByName,
        mcpEndpoints: nextEndpoints,
        filesWithLabels: nextFilesWithLabels,
        fileTypesMap: nextFileTypesMap,
        replacedFiles: nextReplacedFiles,
      }
    }
    case DELETE_FILE_ACTION: {
      const { fileTypesMap: nextFileTypesMap, filesWithLabels: nextFilesWithLabels } =
        omitFilesFromMaps([action.fileName], fileTypesMap, filesWithLabels)
      const nextMcpStagedFileMetaByName = new Map(mcpStagedFileMetaByName)
      const removedMeta = nextMcpStagedFileMetaByName.get(action.fileName)
      nextMcpStagedFileMetaByName.delete(action.fileName)
      const nextEndpoints = removedMeta
        ? pruneMcpEndpoint(mcpEndpoints, nextMcpStagedFileMetaByName, removedMeta.mcpEndpoint)
        : mcpEndpoints
      return {
        ...state,
        hasUnsavedChanges: true,
        filesWithLabels: nextFilesWithLabels,
        replacedFiles: replacedFiles.filter(file => file.name !== action.fileName),
        fileTypesMap: nextFileTypesMap,
        mcpStagedFileMetaByName: nextMcpStagedFileMetaByName,
        mcpEndpoints: nextEndpoints,
      }
    }
    case EDIT_FILE_ACTION:
      return {
        ...state,
        hasUnsavedChanges: true,
        filesWithLabels: {
          ...filesWithLabels,
          [action.fileName]: {
            ...filesWithLabels[action.fileName],
            labels: action.labels,
          },
        },
      }
    case RESTORE_FILE_ACTION:
      // Do not clear hasUnsavedChanges: restore undoes a replace but other edits may remain.
      return {
        ...state,
        replacedFiles: replacedFiles.filter(file => file.name !== action.fileName),
      }
    case RENAME_MCP_ENDPOINT_ACTION: {
      const { oldEndpoint, newEndpoint } = action
      if (oldEndpoint === newEndpoint) {
        return state
      }
      const nextMcpStagedFileMetaByName = new Map(mcpStagedFileMetaByName)
      for (const [fileName, meta] of nextMcpStagedFileMetaByName) {
        if (meta.mcpEndpoint === oldEndpoint) {
          nextMcpStagedFileMetaByName.set(fileName, { ...meta, mcpEndpoint: newEndpoint })
        }
      }
      return {
        ...state,
        hasUnsavedChanges: true,
        mcpEndpoints: mcpEndpoints.map(endpoint =>
          (endpoint === oldEndpoint ? newEndpoint : endpoint),
        ),
        mcpStagedFileMetaByName: nextMcpStagedFileMetaByName,
      }
    }
    case DELETE_MCP_ENDPOINT_ACTION: {
      const fileNamesToDelete = [...mcpStagedFileMetaByName.entries()]
        .filter(([, meta]) => meta.mcpEndpoint === action.mcpEndpoint)
        .map(([fileName]) => fileName)
      const fileNamesToDeleteSet = new Set(fileNamesToDelete)

      const { fileTypesMap: nextFileTypesMap, filesWithLabels: nextFilesWithLabels } =
        omitFilesFromMaps(fileNamesToDelete, fileTypesMap, filesWithLabels)
      const nextMcpStagedFileMetaByName = new Map(mcpStagedFileMetaByName)
      for (const fileName of fileNamesToDelete) {
        nextMcpStagedFileMetaByName.delete(fileName)
      }

      return {
        ...state,
        hasUnsavedChanges: true,
        filesWithLabels: nextFilesWithLabels,
        replacedFiles: replacedFiles.filter(file => !fileNamesToDeleteSet.has(file.name)),
        fileTypesMap: nextFileTypesMap,
        mcpStagedFileMetaByName: nextMcpStagedFileMetaByName,
        mcpEndpoints: pruneMcpEndpoint(
          mcpEndpoints,
          nextMcpStagedFileMetaByName,
          action.mcpEndpoint,
        ),
      }
    }
    default:
      return state
  }
}

type Actions = {
  addFiles: (files: File[]) => void
  deleteFile: (fileName: string) => void
  editFile: (fileName: string, labels: string[]) => void
  restoreFile: (fileName: string) => void
  renameMcpEndpoint: (oldEndpoint: string, newEndpoint: string) => void
  deleteMcpEndpoint: (mcpEndpoint: string) => void
}

export type FilesProviderProps = {
  enabled?: boolean
} & PropsWithChildren

export const FilesProvider: FC<FilesProviderProps> = memo<FilesProviderProps>(({ enabled, children }) => {
  const { packageId, versionId } = useParams()
  const { showMcpEndpointDialog, showMcpDuplicateKindDialog } = useEventBus()
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const mcpEndpointsRef = useRef(state.mcpEndpoints)
  const mcpStagedFileMetaByNameRef = useRef(state.mcpStagedFileMetaByName)
  const lastSelectedMcpEndpointRef = useRef<string | undefined>()

  useEffect(() => {
    mcpEndpointsRef.current = state.mcpEndpoints
  }, [state.mcpEndpoints])

  useEffect(() => {
    mcpStagedFileMetaByNameRef.current = state.mcpStagedFileMetaByName
  }, [state.mcpStagedFileMetaByName])

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
        mcpStagedFileMetaByName: initData.mcpStagedFileMetaByName,
        mcpEndpoints: initData.mcpEndpoints,
      }),
    ).then(() => !isConfigLoading && !isSourcesLoading && setAreFilesProcessing(false))
  }, [sources, config, isConfigLoading, isSourcesLoading])

  const promptMcpEndpoint = useCallback(
    (detail: Omit<ShowMcpEndpointDetail, 'onConfirm' | 'onCancel'>): Promise<string | undefined> => {
      return new Promise(resolve => {
        showMcpEndpointDialog({
          ...detail,
          onConfirm: (mcpEndpoint: string) => resolve(mcpEndpoint),
          onCancel: () => resolve(undefined),
        })
      })
    },
    [showMcpEndpointDialog],
  )

  const promptMcpDuplicateKind = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      showMcpDuplicateKindDialog({
        onDismiss: () => resolve(),
      })
    })
  }, [showMcpDuplicateKindDialog])

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
      if (mcpCandidates.length > 1 && hasDuplicateMcpTypesInBatch(mcpCandidates)) {
        await promptMcpDuplicateKind()
        return
      }

      let knownEndpoints = [...mcpEndpointsRef.current]
      const [firstCandidate] = mcpCandidates
      const uploadDocumentTypes = mcpCandidates.map(candidate => candidate.documentType)
      const lastSelectedEndpoint = lastSelectedMcpEndpointRef.current
      const defaultEndpoint =
        lastSelectedEndpoint !== undefined && knownEndpoints.includes(lastSelectedEndpoint)
          ? lastSelectedEndpoint
          : knownEndpoints[0]
      const mcpEndpoint = await promptMcpEndpoint({
        file: firstCandidate.file,
        documentType: firstCandidate.documentType,
        knownEndpoints: knownEndpoints,
        defaultEndpoint: defaultEndpoint,
        uploadDocumentTypes: uploadDocumentTypes,
        stagedMcpFileMetaByName: mcpStagedFileMetaByNameRef.current,
      })
      if (mcpEndpoint !== undefined) {
        dispatch({
          type: ASSIGN_MCP_BATCH_ACTION,
          assignments: mcpCandidates.map(candidate => ({
            fileName: candidate.file.name,
            file: candidate.file,
            meta: {
              documentType: candidate.documentType,
              mcpEndpoint: mcpEndpoint,
            },
            fileType: candidate.documentType,
          })),
        })
        if (!knownEndpoints.includes(mcpEndpoint)) {
          knownEndpoints = [...knownEndpoints, mcpEndpoint]
          mcpEndpointsRef.current = knownEndpoints
        }
        lastSelectedMcpEndpointRef.current = mcpEndpoint
      }
    }
  }, [promptMcpEndpoint, promptMcpDuplicateKind])

  const deleteFile = useCallback((fileName: string): void =>
    dispatch({
      type: DELETE_FILE_ACTION,
      fileName: fileName,
    }), [])

  const editFile = useCallback((fileName: string, labels: string[]): void =>
    dispatch({
      type: EDIT_FILE_ACTION,
      fileName: fileName,
      labels: labels,
    }), [])

  const restoreFile = useCallback((fileName: string): void =>
    dispatch({
      type: RESTORE_FILE_ACTION,
      fileName: fileName,
    }), [])

  const renameMcpEndpoint = useCallback((oldEndpoint: string, newEndpoint: string): void => {
    dispatch({
      type: RENAME_MCP_ENDPOINT_ACTION,
      oldEndpoint: oldEndpoint,
      newEndpoint: newEndpoint,
    })
    if (lastSelectedMcpEndpointRef.current === oldEndpoint) {
      lastSelectedMcpEndpointRef.current = newEndpoint
    }
  }, [])

  const deleteMcpEndpoint = useCallback((mcpEndpoint: string): void => {
    dispatch({
      type: DELETE_MCP_ENDPOINT_ACTION,
      mcpEndpoint: mcpEndpoint,
    })
    if (lastSelectedMcpEndpointRef.current === mcpEndpoint) {
      lastSelectedMcpEndpointRef.current = undefined
    }
  }, [])

  const actions: Actions = useMemo(
    () => ({
      addFiles,
      deleteFile,
      editFile,
      restoreFile,
      renameMcpEndpoint,
      deleteMcpEndpoint,
    }),
    [addFiles, deleteFile, editFile, restoreFile, renameMcpEndpoint, deleteMcpEndpoint],
  )

  return (
    <FilesContext.Provider value={state}>
      <FileActionsContext.Provider value={actions}>
        <FilesLoadingContext.Provider
          value={isSourcesLoading || !state.isInitialized || isConfigLoading || areFilesProcessing}
        >
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

function omitFilesFromMaps(
  fileNames: Iterable<string>,
  fileTypesMap: Map<string, SpecType>,
  filesWithLabels: FileLabelsRecord,
): Pick<State, 'fileTypesMap' | 'filesWithLabels'> {
  const nextFileTypesMap = new Map(fileTypesMap)
  const nextFilesWithLabels = { ...filesWithLabels }
  for (const fileName of fileNames) {
    nextFileTypesMap.delete(fileName)
    delete nextFilesWithLabels[fileName]
  }
  return {
    fileTypesMap: nextFileTypesMap,
    filesWithLabels: nextFilesWithLabels,
  }
}
