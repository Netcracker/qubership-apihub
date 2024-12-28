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

import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useVersionSources } from '../useVersionSources'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { calculateSpecType, getFileExtension } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { usePackageVersionConfig } from './usePackageVersionConfig'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { createFilesRecord, filesRecordToArray } from '@apihub/routes/root/PortalPage/PackagePage/files'
import type { PackageVersionConfig } from '@apihub/entities/package-version-config'
import type { FileLabelsRecord } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/FileTableUpload'
import { intersectionBy } from 'lodash-es'

export const INIT_FILES_ACTION = 'InitFilesAction'
export const ADD_FILES_ACTION = 'AddFilesAction'
export const DELETE_FILE_ACTION = 'DeleteFileAction'
export const EDIT_FILE_ACTION = 'EditFileAction'
export const RESTORE_FILE_ACTION = 'RestoreFileAction'

interface InitFilesAction {
  type: typeof INIT_FILES_ACTION
  sources: File[]
  fileTypesMap: Map<string, SpecType>
  filesWithLabels: FileLabelsRecord
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

type StateActions = InitFilesAction | AddFilesAction | DeleteFileAction | EditFileAction | RestoreFileAction

interface State {
  sources: File[]
  fileTypesMap: Map<string, SpecType>
  filesWithLabels: FileLabelsRecord
  replacedFiles: File[]
  isInitialized: boolean
}

const INITIAL_STATE: State = {
  sources: [],
  fileTypesMap: new Map(),
  filesWithLabels: {},
  replacedFiles: [],
  isInitialized: false,
}

function reducer(state: State, action: StateActions): State {
  const { fileTypesMap, filesWithLabels, replacedFiles, sources } = state

  switch (action.type) {
    case INIT_FILES_ACTION:
      return {
        ...state,
        sources: action.sources,
        fileTypesMap: action.fileTypesMap,
        filesWithLabels: action.filesWithLabels,
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
    case DELETE_FILE_ACTION:
      fileTypesMap.delete(action.fileName)
      delete filesWithLabels[action.fileName]

      return {
        ...state,
        filesWithLabels: { ...filesWithLabels },
        replacedFiles: replacedFiles.filter(file => file.name !== action.fileName),
        fileTypesMap: fileTypesMap,
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
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const isEditingVersion = !!versionId && versionId !== SPECIAL_VERSION_KEY
  const [sources, isSourcesLoading] = useVersionSources({ enabled: enabled && isEditingVersion })
  const [config, isConfigLoading] = usePackageVersionConfig(packageId, versionId)
  const [areFilesProcessing, setAreFilesProcessing] = useState(true)

  useEffect(() => {
    getFileTypesAndLabels(sources, config).then(([fileTypesMap, filesWithLabels]) =>
      dispatch({
        type: INIT_FILES_ACTION,
        sources: sources,
        fileTypesMap: fileTypesMap,
        filesWithLabels: filesWithLabels,
      })).then(() => !isConfigLoading && !isSourcesLoading && setAreFilesProcessing(false))
  }, [sources, config, isConfigLoading, isSourcesLoading])

  const addFiles = useCallback((files: File[]): void => {
    getFileTypesAndLabels(files).then(([map, record]) => dispatch({
      type: ADD_FILES_ACTION,
      files: files,
      fileTypesMap: new Map(map),
      filesWithLabels: record,
    }))
    }, [],
  )

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

async function getFileTypesAndLabels(files: File[], config?: PackageVersionConfig | null): Promise<[Map<string, SpecType>, FileLabelsRecord]> {
  let fileLabelsRecord = {}

  const fileTypesMap = new Map(await Promise.all(files.map(file => {
    return file.text().then(value => {
      return [file.name, calculateSpecType(getFileExtension(file.name), value)] as [string, SpecType]
    })
  })))

  if (config) {
    fileLabelsRecord = files.reduce((acc, file) => {
      const fileLabels = config.files?.find(f => f.fileKey === file.name)?.labels ?? []
      acc[file.name] = {
        file: file,
        labels: fileLabels,
      }
      return acc
    }, {} as FileLabelsRecord)
  }

  return [
    fileTypesMap,
    fileLabelsRecord,
  ]
}

const FilesContext = createContext<State>()
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
