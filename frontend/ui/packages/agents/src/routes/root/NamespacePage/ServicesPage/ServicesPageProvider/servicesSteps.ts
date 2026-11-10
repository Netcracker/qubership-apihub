export const DISCOVER_SERVICES_STEP_KEY = 'discover-services'
export const CREATE_SNAPSHOT_STEP_KEY = 'create-snapshot'
export const PROMOTE_VERSION_STEP_KEY = 'promote-version'

export type StepKey =
  | typeof DISCOVER_SERVICES_STEP_KEY
  | typeof CREATE_SNAPSHOT_STEP_KEY
  | typeof PROMOTE_VERSION_STEP_KEY

export const NONE_STEP_STATUS = 'none'
export const RUNNING_STEP_STATUS = 'running'
export const COMPLETE_STEP_STATUS = 'complete'
export const ERROR_STEP_STATUS = 'error'

export type StepStatus =
  | typeof NONE_STEP_STATUS
  | typeof RUNNING_STEP_STATUS
  | typeof COMPLETE_STEP_STATUS
  | typeof ERROR_STEP_STATUS

export type Step = Readonly<{
  key: StepKey
  index: number
  name: string
  tooltip: string
  status: StepStatus
  active: boolean
  /** Succeeded and not the open step: its tab shows a check mark. */
  completed: boolean
}>

export type StepsState = Readonly<{
  activeStepIndex: number
  statuses: ReadonlyArray<StepStatus>
}>

const STEP_DEFINITIONS: ReadonlyArray<Pick<Step, 'key' | 'name' | 'tooltip'>> = [
  {
    key: DISCOVER_SERVICES_STEP_KEY,
    name: 'Discover Services',
    tooltip:
      'Find services and API documents in the selected cloud and namespace. Review how they are grouped before you continue.',
  },
  {
    key: CREATE_SNAPSHOT_STEP_KEY,
    name: 'Create Snapshot',
    tooltip:
      'Publish the selected services as a draft snapshot to the target workspace. Choose snapshot and baseline versions and select which services to include.',
  },
  {
    key: PROMOTE_VERSION_STEP_KEY,
    name: 'Promote Version',
    tooltip: 'Promote selected services to APIHUB. The version you enter must match each service\'s version pattern.',
  },
]

export const INITIAL_STEPS_STATE: StepsState = {
  activeStepIndex: 0,
  statuses: STEP_DEFINITIONS.map(() => NONE_STEP_STATUS),
}

export function toSteps({ activeStepIndex, statuses }: StepsState): ReadonlyArray<Step> {
  return STEP_DEFINITIONS.map(({ key, name, tooltip }, index) => ({
    key: key,
    index: index,
    name: name,
    tooltip: tooltip,
    status: statuses[index],
    active: index === activeStepIndex,
    completed: statuses[index] === COMPLETE_STEP_STATUS && index !== activeStepIndex,
  }))
}

/**
 * Whether each step can open, from its tab or from "Next": the open step always, the first step always, and a later
 * step when the step before it can open and can be left for it, as `isLeavable` decides.
 */
export function openableStepsOf(
  steps: ReadonlyArray<Step>,
  isLeavable: (step: Step) => boolean,
): ReadonlyArray<boolean> {
  return steps.reduce<ReadonlyArray<boolean>>(
    (openable, step, index) => [
      ...openable,
      step.active || index === 0 || (openable[index - 1] && isLeavable(steps[index - 1])),
    ],
    [],
  )
}

export function withStepOpened(state: StepsState, key: StepKey): StepsState {
  const index = stepIndexOf(key)
  // The same state renders nothing when the open step is opened again
  if (index === state.activeStepIndex) {
    return state
  }
  return {
    ...state,
    activeStepIndex: index,
  }
}

/**
 * Starts the steps after the given one over: they lose their status, so they cannot open until the steps before them
 * can be left again. If one of them is open, the given step opens in its place.
 */
export function withStepsResetAfter(state: StepsState, key: StepKey): StepsState {
  const index = stepIndexOf(key)
  return {
    activeStepIndex: Math.min(state.activeStepIndex, index),
    statuses: state.statuses.map((status, stepIndex) => (stepIndex > index ? NONE_STEP_STATUS : status)),
  }
}

/**
 * Sets the status of a step. An unchanged status returns the same state, so a step that writes its status from an
 * effect renders nothing new.
 */
export function withStepStatus(state: StepsState, key: StepKey, status: StepStatus): StepsState {
  const index = stepIndexOf(key)
  if (state.statuses[index] === status) {
    return state
  }
  return {
    ...state,
    statuses: state.statuses.map((stepStatus, stepIndex) => (stepIndex === index ? status : stepStatus)),
  }
}

function stepIndexOf(key: StepKey): number {
  return STEP_DEFINITIONS.findIndex(step => step.key === key)
}
