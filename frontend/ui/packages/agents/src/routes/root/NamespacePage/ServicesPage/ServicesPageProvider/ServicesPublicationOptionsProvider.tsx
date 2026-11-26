import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useCallback, useContext, useState } from 'react'
import type { ServiceKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PublishConfig } from '@agents/entities/publish-config'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

export const ServicesPublicationOptionsProvider: FC<PropsWithChildren> = memo(({ children }) => {
  const [snapshotPublicationsState, setSnapshotPublicationsState] = useState<SnapshotPublicationsState>(
    EMPTY_SNAPSHOT_PUBLICATIONS_STATE,
  )
  const [createSnapshotFormData, setCreateSnapshotFormData] = useState<CreateSnapshotFormData>(EMPTY_CREATE_SNAPSHOT_FORM_DATA)
  const [promoteVersionPublicationOptions, setPromoteVersionPublicationOptions] = useState<PromoteVersionPublicationOptions>(EMPTY_PROMOTE_VERSION_PUBLICATION_OPTIONS)

  return (
    <SnapshotPublicationsStateContext.Provider value={snapshotPublicationsState}>
      <SetSnapshotPublicationsStateContext.Provider value={setSnapshotPublicationsState}>
        <CreateSnapshotFormDataContext.Provider value={createSnapshotFormData}>
          <SetCreateSnapshotFormDataContext.Provider value={setCreateSnapshotFormData}>
            <PromoteVersionPublicationOptionsContext.Provider value={promoteVersionPublicationOptions}>
              <SetPromoteVersionPublicationOptionsContext.Provider value={setPromoteVersionPublicationOptions}>
                {children}
              </SetPromoteVersionPublicationOptionsContext.Provider>
            </PromoteVersionPublicationOptionsContext.Provider>
          </SetCreateSnapshotFormDataContext.Provider>
        </CreateSnapshotFormDataContext.Provider>
      </SetSnapshotPublicationsStateContext.Provider>
    </SnapshotPublicationsStateContext.Provider>
  )
})

/** The options of a create request: the fields of Create Snapshot and the selected services. */
export type CreateSnapshotPublicationOptions = {
  name: string
  baseline: string
  serviceKeys: ServiceKey[]
}

/** A snapshot created on Create Snapshot, with the publication that the backend started for it. */
export type SnapshotPublication = Readonly<
  & Pick<CreateSnapshotPublicationOptions, 'name' | 'baseline'>
  & { config: PublishConfig }
>

/** The fields of Create Snapshot that the user has not submitted yet. */
export type CreateSnapshotFormData = Readonly<
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

type SnapshotPublicationsState = Readonly<{
  snapshotPublications: ReadonlyArray<SnapshotPublication>
  failedCreateSnapshotOptions?: CreateSnapshotPublicationOptions
}>

const EMPTY_SNAPSHOT_PUBLICATIONS_STATE: SnapshotPublicationsState = {
  snapshotPublications: [],
}

const EMPTY_CREATE_SNAPSHOT_FORM_DATA: CreateSnapshotFormData = {
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

const SnapshotPublicationsStateContext = createContext<SnapshotPublicationsState>()
const SetSnapshotPublicationsStateContext = createContext<Dispatch<SetStateAction<SnapshotPublicationsState>>>()
const CreateSnapshotFormDataContext = createContext<CreateSnapshotFormData>()
const SetCreateSnapshotFormDataContext = createContext<Dispatch<SetStateAction<CreateSnapshotFormData>>>()

type SnapshotPublicationsContext = {
  /** The snapshots created on Create Snapshot, in the order they were created. */
  snapshotPublications: ReadonlyArray<SnapshotPublication>
  /** The options of the last create request when it failed, which "Try Again" sends again. */
  failedCreateSnapshotOptions: CreateSnapshotPublicationOptions | undefined
  /** Adds a created snapshot; the last create request then no longer counts as failed. */
  addSnapshotPublication: (snapshotPublication: SnapshotPublication) => void
  setFailedCreateSnapshotOptions: (options: CreateSnapshotPublicationOptions) => void
  /** Clears the snapshots, the failed create request, the fields of Create Snapshot, and the promotion. */
  resetSnapshotPublications: () => void
}

export function useSnapshotPublications(): SnapshotPublicationsContext {
  const { snapshotPublications, failedCreateSnapshotOptions } = useContext(SnapshotPublicationsStateContext)
  const setState = useContext(SetSnapshotPublicationsStateContext)
  const setFormData = useContext(SetCreateSnapshotFormDataContext)
  const { resetPromotePublicationOptions } = usePromoteVersionPublicationOptions()

  const addSnapshotPublication = (snapshotPublication: SnapshotPublication): void =>
    setState(state => ({ snapshotPublications: [...state.snapshotPublications, snapshotPublication] }))

  const setFailedCreateSnapshotOptions = (options: CreateSnapshotPublicationOptions): void =>
    setState(state => ({ ...state, failedCreateSnapshotOptions: options }))

  // "Restart Discovery" and the workspace selector call it from callbacks of their own
  const resetSnapshotPublications = useCallback(() => {
    setState(EMPTY_SNAPSHOT_PUBLICATIONS_STATE)
    setFormData(EMPTY_CREATE_SNAPSHOT_FORM_DATA)
    resetPromotePublicationOptions()
  }, [resetPromotePublicationOptions, setFormData, setState])

  return {
    snapshotPublications,
    failedCreateSnapshotOptions,
    addSnapshotPublication,
    setFailedCreateSnapshotOptions,
    resetSnapshotPublications,
  }
}

/** The snapshot that Promote Version works with: the last one created. */
export function useLastSnapshotPublication(): SnapshotPublication | undefined {
  return useContext(SnapshotPublicationsStateContext).snapshotPublications.at(-1)
}

type CreateSnapshotFormDataContext = {
  createSnapshotFormData: CreateSnapshotFormData
  setCreateSnapshotFormData: Dispatch<SetStateAction<CreateSnapshotFormData>>
}

export function useCreateSnapshotFormData(): CreateSnapshotFormDataContext {
  return {
    createSnapshotFormData: useContext(CreateSnapshotFormDataContext),
    setCreateSnapshotFormData: useContext(SetCreateSnapshotFormDataContext),
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
