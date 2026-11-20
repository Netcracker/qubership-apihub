import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useCallback, useContext, useState } from 'react'
import type { ServiceKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PublishConfig } from '@agents/entities/publish-config'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

export const ServicesPublicationOptionsProvider: FC<PropsWithChildren> = memo(({ children }) => {
  const [createSnapshotPublicationOptions, setCreateSnapshotPublicationOptions] = useState<CreateSnapshotPublicationOptions>(EMPTY_CREATE_SNAPSHOT_PUBLICATION_OPTIONS)
  const [createSnapshotDraft, setCreateSnapshotDraft] = useState<CreateSnapshotDraft>(EMPTY_CREATE_SNAPSHOT_DRAFT)
  const [promoteVersionPublicationOptions, setPromoteVersionPublicationOptions] = useState<PromoteVersionPublicationOptions>(EMPTY_PROMOTE_VERSION_PUBLICATION_OPTIONS)

  return (
    <CreateSnapshotPublicationOptionsContext.Provider value={createSnapshotPublicationOptions}>
      <SetCreateSnapshotPublicationOptionsContext.Provider value={setCreateSnapshotPublicationOptions}>
        <CreateSnapshotDraftContext.Provider value={createSnapshotDraft}>
          <SetCreateSnapshotDraftContext.Provider value={setCreateSnapshotDraft}>
            <PromoteVersionPublicationOptionsContext.Provider value={promoteVersionPublicationOptions}>
              <SetPromoteVersionPublicationOptionsContext.Provider value={setPromoteVersionPublicationOptions}>
                {children}
              </SetPromoteVersionPublicationOptionsContext.Provider>
            </PromoteVersionPublicationOptionsContext.Provider>
          </SetCreateSnapshotDraftContext.Provider>
        </CreateSnapshotDraftContext.Provider>
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

/** The fields of Create Snapshot that the user has not submitted yet. */
export type CreateSnapshotDraft = Readonly<
  & Pick<CreateSnapshotPublicationOptions, 'name' | 'baseline' | 'serviceKeys'>
  & { searchValue: string }
>

export type PromoteVersionPublicationOptions = {
  version: VersionKey
  previousVersion: VersionKey
  status: VersionStatus
  serviceKeys: ServiceKey[]
  config?: PublishConfig
  /** The current promotion followed a completed one, so the step offers a re-promotion whatever its status. */
  isPromoted?: boolean
}

const EMPTY_CREATE_SNAPSHOT_PUBLICATION_OPTIONS: CreateSnapshotPublicationOptions = {
  name: '',
  baseline: '',
  serviceKeys: [],
}

const EMPTY_CREATE_SNAPSHOT_DRAFT: CreateSnapshotDraft = {
  name: '',
  baseline: '',
  serviceKeys: [],
  searchValue: '',
}

const EMPTY_PROMOTE_VERSION_PUBLICATION_OPTIONS: PromoteVersionPublicationOptions = {
  version: '',
  previousVersion: '',
  status: 'draft',
  serviceKeys: [],
}

const CreateSnapshotPublicationOptionsContext = createContext<CreateSnapshotPublicationOptions>()
const SetCreateSnapshotPublicationOptionsContext = createContext<Dispatch<SetStateAction<CreateSnapshotPublicationOptions>>>()
const CreateSnapshotDraftContext = createContext<CreateSnapshotDraft>()
const SetCreateSnapshotDraftContext = createContext<Dispatch<SetStateAction<CreateSnapshotDraft>>>()

type CreateSnapshotPublicationOptionsContext = {
  createSnapshotPublicationOptions: CreateSnapshotPublicationOptions
  setCreateSnapshotPublicationOptions: Dispatch<SetStateAction<CreateSnapshotPublicationOptions>>
  /** Clears the snapshot, the fields of Create Snapshot, and the promotion. */
  resetCreateSnapshotPublicationOptions: () => void
}

export function useCreateSnapshotPublicationOptions(): CreateSnapshotPublicationOptionsContext {
  const options = useContext(CreateSnapshotPublicationOptionsContext)
  const setOptions = useContext(SetCreateSnapshotPublicationOptionsContext)
  const setDraft = useContext(SetCreateSnapshotDraftContext)

  const { resetPromotePublicationOptions } = usePromoteVersionPublicationOptions()

  const resetOptions = useCallback(() => {
    setOptions(EMPTY_CREATE_SNAPSHOT_PUBLICATION_OPTIONS)
    setDraft(EMPTY_CREATE_SNAPSHOT_DRAFT)
    resetPromotePublicationOptions()
  }, [resetPromotePublicationOptions, setDraft, setOptions])

  return {
    createSnapshotPublicationOptions: options,
    setCreateSnapshotPublicationOptions: setOptions,
    resetCreateSnapshotPublicationOptions: resetOptions,
  }
}

type CreateSnapshotDraftContext = {
  createSnapshotDraft: CreateSnapshotDraft
  setCreateSnapshotDraft: Dispatch<SetStateAction<CreateSnapshotDraft>>
}

export function useCreateSnapshotDraft(): CreateSnapshotDraftContext {
  return {
    createSnapshotDraft: useContext(CreateSnapshotDraftContext),
    setCreateSnapshotDraft: useContext(SetCreateSnapshotDraftContext),
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
