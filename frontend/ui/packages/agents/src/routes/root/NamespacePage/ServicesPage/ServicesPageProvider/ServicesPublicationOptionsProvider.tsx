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

import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useCallback, useContext, useState } from 'react'
import type { ServiceKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PublishConfig } from '@apihub/entities/publish-config'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

export const ServicesPublicationOptionsProvider: FC<PropsWithChildren> = memo(({ children }) => {
  const [createSnapshotPublicationOptions, setCreateSnapshotPublicationOptions] = useState<CreateSnapshotPublicationOptions>(EMPTY_CREATE_SNAPSHOT_PUBLICATION_OPTIONS)
  const [promoteVersionPublicationOptions, setPromoteVersionPublicationOptions] = useState<PromoteVersionPublicationOptions>(EMPTY_PROMOTE_VERSION_PUBLICATION_OPTIONS)

  return (
    <CreateSnapshotPublicationOptionsContext.Provider value={createSnapshotPublicationOptions}>
      <SetCreateSnapshotPublicationOptionsContext.Provider value={setCreateSnapshotPublicationOptions}>
        <PromoteVersionPublicationOptionsContext.Provider value={promoteVersionPublicationOptions}>
          <SetPromoteVersionPublicationOptionsContext.Provider value={setPromoteVersionPublicationOptions}>
            {children}
          </SetPromoteVersionPublicationOptionsContext.Provider>
        </PromoteVersionPublicationOptionsContext.Provider>
      </SetCreateSnapshotPublicationOptionsContext.Provider>
    </CreateSnapshotPublicationOptionsContext.Provider>
  )
})

export type CreateSnapshotPublicationOptions = {
  name: string
  baseline: string
  serviceKeys: ServiceKey[]
  config?: PublishConfig
}

export type PromoteVersionPublicationOptions = {
  version: VersionKey
  previousVersion: VersionKey
  status: VersionStatus
  serviceKeys: ServiceKey[]
  config?: PublishConfig
}

const EMPTY_CREATE_SNAPSHOT_PUBLICATION_OPTIONS: CreateSnapshotPublicationOptions = {
  name: '',
  baseline: '',
  serviceKeys: [],
}

const EMPTY_PROMOTE_VERSION_PUBLICATION_OPTIONS: PromoteVersionPublicationOptions = {
  version: '',
  previousVersion: '',
  status: 'draft',
  serviceKeys: [],
}

const CreateSnapshotPublicationOptionsContext = createContext<CreateSnapshotPublicationOptions>()
const SetCreateSnapshotPublicationOptionsContext = createContext<Dispatch<SetStateAction<CreateSnapshotPublicationOptions>>>()

type CreateSnapshotPublicationOptionsContext = {
  createSnapshotPublicationOptions: CreateSnapshotPublicationOptions
  setCreateSnapshotPublicationOptions: Dispatch<SetStateAction<CreateSnapshotPublicationOptions>>
  resetCreateSnapshotPublicationOptions: () => void
}

export function useCreateSnapshotPublicationOptions(): CreateSnapshotPublicationOptionsContext {
  const options = useContext(CreateSnapshotPublicationOptionsContext)
  const setOptions = useContext(SetCreateSnapshotPublicationOptionsContext)

  const { resetPromotePublicationOptions } = usePromoteVersionPublicationOptions()

  const resetOptions = useCallback(() => {
    setOptions(EMPTY_CREATE_SNAPSHOT_PUBLICATION_OPTIONS)
    resetPromotePublicationOptions()
  }, [resetPromotePublicationOptions, setOptions])

  return {
    createSnapshotPublicationOptions: options,
    setCreateSnapshotPublicationOptions: setOptions,
    resetCreateSnapshotPublicationOptions: resetOptions,
  }
}

const PromoteVersionPublicationOptionsContext = createContext<PromoteVersionPublicationOptions>()
const SetPromoteVersionPublicationOptionsContext = createContext<Dispatch<SetStateAction<PromoteVersionPublicationOptions>>>()

type PromotePublishOptionsContext = {
  promotePublicationOptions: PromoteVersionPublicationOptions
  setPromotePublicationOptions: Dispatch<SetStateAction<PromoteVersionPublicationOptions>>
  resetPromotePublicationOptions: () => void
}

export function usePromoteVersionPublicationOptions(): PromotePublishOptionsContext {
  const options = useContext(PromoteVersionPublicationOptionsContext)
  const setOptions = useContext(SetPromoteVersionPublicationOptionsContext)
  const resetOptions = useCallback(() => setOptions(EMPTY_PROMOTE_VERSION_PUBLICATION_OPTIONS), [setOptions])

  return {
    promotePublicationOptions: options,
    setPromotePublicationOptions: setOptions,
    resetPromotePublicationOptions: resetOptions,
  }
}
