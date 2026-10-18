import { isObject, JSON_ROOT_KEY, SyncCloneHook } from '@netcracker/qubership-apihub-json-crawl'

const COPY_STATE_COMPLETED = 'completed'
const COPY_STATE_PARTIALLY_COMPLETED = 'in-progress'
const COPY_STATE_NOT_YET_COPIED = 'not-yet-copied'

interface CopyStateCompleted {
  readonly type: typeof COPY_STATE_COMPLETED
  readonly jsoInResult: unknown
}

interface CopyStatePartiallyCompleted {
  readonly type: typeof COPY_STATE_PARTIALLY_COMPLETED
  readonly partialJsoInResult: unknown
}

interface CopyStateNotYetCopied {
  readonly type: typeof COPY_STATE_NOT_YET_COPIED
  readonly lazyAppliers: ((jso: unknown) => void)[]
}

type CopyState = CopyStateCompleted | CopyStatePartiallyCompleted | CopyStateNotYetCopied

export const createCycledJsoHandlerHook: <T extends {} = {}, R extends {} = {}>() => SyncCloneHook<T, R> = <T extends {} = {}, R extends {} = {}>() => {
  const jsoCopyStates: Map<unknown, CopyState> = new Map()
  const cycleJsoHandlerHook: SyncCloneHook<T, R> = ({ key, value, state }) => {
    if (!isObject(value)) {
      return { value }
    }
    const safeKey = key ?? JSON_ROOT_KEY
    let jsoState = jsoCopyStates.get(value)
    if (!jsoState) {
      jsoState = {
        type: COPY_STATE_NOT_YET_COPIED,
        lazyAppliers: [],
      }
      jsoCopyStates.set(value, jsoState)
    }
    const node = state.node
    switch (jsoState.type) {
      case COPY_STATE_COMPLETED: {
        node[safeKey] = jsoState.jsoInResult
        return { done: true, value: node[safeKey]/*no need in done case but need for process understand*/ }
      }
      case COPY_STATE_PARTIALLY_COMPLETED: {
        node[safeKey] = jsoState.partialJsoInResult
        return {
          done: true, value: jsoState.partialJsoInResult, /*whole values will be available only after COPY_STATE_NOT_YET_COPIED.exitHook,
        but instance for copy already created but not filled. You can use as a reference but not as value!!!!*/
        }
      }
      case COPY_STATE_NOT_YET_COPIED: {
        const lazyAppliers = jsoState.lazyAppliers
        return {
          value,
          exitHook: () => {
            const valueAfterAllHooks = node[safeKey]
            const newState: CopyStateCompleted = { type: COPY_STATE_COMPLETED, jsoInResult: valueAfterAllHooks }
            jsoCopyStates.set(value, newState)
            jsoCopyStates.set(valueAfterAllHooks, newState)
          },
          afterHooksHook: () => {
            const valueAfterAllHooks = node[safeKey]
            while (lazyAppliers.length) { lazyAppliers.pop()!(valueAfterAllHooks) }
            const newState: CopyStatePartiallyCompleted = {
              type: COPY_STATE_PARTIALLY_COMPLETED,
              partialJsoInResult: valueAfterAllHooks,
            }
            jsoCopyStates.set(value, newState)
            jsoCopyStates.set(valueAfterAllHooks, newState)
          },
        }
      }
    }
  }
  return cycleJsoHandlerHook
}