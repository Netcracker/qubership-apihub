import {
  COMPLETE_STEP_STATUS,
  CREATE_SNAPSHOT_STEP_KEY,
  DISCOVER_SERVICES_STEP_KEY,
  INITIAL_STEPS_STATE,
  NONE_STEP_STATUS,
  type StepsState,
  toSteps,
  withStepOpened,
  withStepsResetAfter,
} from './servicesSteps'

// Every step reached and succeeded, Promote Version open
const PROMOTE_VERSION_OPEN: StepsState = {
  activeStepIndex: 2,
  lastReachedStepIndex: 2,
  statuses: [COMPLETE_STEP_STATUS, COMPLETE_STEP_STATUS, COMPLETE_STEP_STATUS],
}

// Discover Services and Create Snapshot succeeded, Create Snapshot open, Promote Version not reached
const CREATE_SNAPSHOT_SUCCEEDED: StepsState = {
  activeStepIndex: 1,
  lastReachedStepIndex: 1,
  statuses: [COMPLETE_STEP_STATUS, COMPLETE_STEP_STATUS, NONE_STEP_STATUS],
}

describe('servicesSteps', () => {
  it('reaches the step it opens', () => {
    const steps = toSteps(withStepOpened(INITIAL_STEPS_STATE, CREATE_SNAPSHOT_STEP_KEY))

    expect(steps.map(({ active, reached }) => ({ active, reached }))).toEqual([
      { active: false, reached: true },
      { active: true, reached: true },
      { active: false, reached: false },
    ])
  })

  it('keeps the later steps reached when an earlier step opens', () => {
    const steps = toSteps(withStepOpened(PROMOTE_VERSION_OPEN, DISCOVER_SERVICES_STEP_KEY))

    expect(steps.map(({ active, reached }) => ({ active, reached }))).toEqual([
      { active: true, reached: true },
      { active: false, reached: true },
      { active: false, reached: true },
    ])
  })

  it('completes a succeeded step once a later step is reached, and the last step once it succeeds', () => {
    expect(toSteps(CREATE_SNAPSHOT_SUCCEEDED).map(({ completed }) => completed)).toEqual([true, false, false])
    expect(toSteps(PROMOTE_VERSION_OPEN).map(({ completed }) => completed)).toEqual([true, true, true])
  })

  it('resets the later steps and opens the given step in place of a later one', () => {
    expect(withStepsResetAfter(PROMOTE_VERSION_OPEN, CREATE_SNAPSHOT_STEP_KEY)).toEqual(CREATE_SNAPSHOT_SUCCEEDED)
  })
})
