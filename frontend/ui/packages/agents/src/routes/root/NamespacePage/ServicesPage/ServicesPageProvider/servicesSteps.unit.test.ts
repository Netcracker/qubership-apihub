import {
  COMPLETE_STEP_STATUS,
  CREATE_SNAPSHOT_STEP_KEY,
  DISCOVER_SERVICES_STEP_KEY,
  INITIAL_STEPS_STATE,
  NONE_STEP_STATUS,
  openableStepsOf,
  RUNNING_STEP_STATUS,
  type Step,
  type StepsState,
  toSteps,
  withStepOpened,
  withStepsResetAfter,
} from './servicesSteps'

// Every step succeeded, Promote Version open
const PROMOTE_VERSION_OPEN: StepsState = {
  activeStepIndex: 2,
  statuses: [COMPLETE_STEP_STATUS, COMPLETE_STEP_STATUS, COMPLETE_STEP_STATUS],
}

// Discover Services and Create Snapshot succeeded, Create Snapshot open, Promote Version not run
const CREATE_SNAPSHOT_SUCCEEDED: StepsState = {
  activeStepIndex: 1,
  statuses: [COMPLETE_STEP_STATUS, COMPLETE_STEP_STATUS, NONE_STEP_STATUS],
}

const isSucceeded = ({ status }: Step): boolean => status === COMPLETE_STEP_STATUS

describe('servicesSteps', () => {
  it('opens only the first step at the start', () => {
    expect(openableStepsOf(toSteps(INITIAL_STEPS_STATE), isSucceeded)).toEqual([true, false, false])
  })

  it('keeps the later steps openable when an earlier step opens', () => {
    const steps = toSteps(withStepOpened(PROMOTE_VERSION_OPEN, DISCOVER_SERVICES_STEP_KEY))

    expect(openableStepsOf(steps, isSucceeded)).toEqual([true, true, true])
  })

  it('opens no step after a step that cannot be left', () => {
    const steps = toSteps(CREATE_SNAPSHOT_SUCCEEDED)
    const isLeavable = (step: Step): boolean => isSucceeded(step) && step.key !== CREATE_SNAPSHOT_STEP_KEY

    expect(openableStepsOf(steps, isLeavable)).toEqual([true, true, false])
  })

  it('keeps the open step openable when a step before it cannot be left', () => {
    const steps = toSteps({
      ...PROMOTE_VERSION_OPEN,
      statuses: [RUNNING_STEP_STATUS, ...PROMOTE_VERSION_OPEN.statuses.slice(1)],
    })

    expect(openableStepsOf(steps, isSucceeded)).toEqual([true, false, true])
  })

  it('shows a check mark on a succeeded step that is not open, and the number on the open step', () => {
    expect(toSteps(CREATE_SNAPSHOT_SUCCEEDED).map(({ completed }) => completed)).toEqual([true, false, false])
    expect(toSteps(PROMOTE_VERSION_OPEN).map(({ completed }) => completed)).toEqual([true, true, false])
    const backOnFirst = withStepOpened(PROMOTE_VERSION_OPEN, DISCOVER_SERVICES_STEP_KEY)
    expect(toSteps(backOnFirst).map(({ completed }) => completed)).toEqual([false, true, true])
  })

  it('resets the later steps and opens the given step in place of a later one', () => {
    expect(withStepsResetAfter(PROMOTE_VERSION_OPEN, CREATE_SNAPSHOT_STEP_KEY)).toEqual(CREATE_SNAPSHOT_SUCCEEDED)
  })
})
