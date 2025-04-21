// TODO: Replace all uses of 'testId' with 'data-testid'.
// Minimize the use of the 'TestableProps' interface by using prop spreading instead.

export interface TestableProps {
  ['data-testid']?: string
  testId?: string
}
