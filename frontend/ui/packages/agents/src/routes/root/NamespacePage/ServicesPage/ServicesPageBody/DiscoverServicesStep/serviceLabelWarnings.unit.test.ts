import {
  MISSING_API_DOCUMENTS_LABEL_WARNING,
  serviceLabelWarningOf,
  UNEXPECTED_API_DOCUMENTS_LABEL_WARNING,
} from './serviceLabelWarnings'

const DOCUMENT = { name: 'Linter Service API' }

describe('serviceLabelWarningOf', () => {
  it('warns that API documents are missing when a backend has none', () => {
    expect(serviceLabelWarningOf({ specs: [], labels: componentLabelOf('backend') }))
      .toBe(MISSING_API_DOCUMENTS_LABEL_WARNING)
  })

  it('does not warn when a backend has API documents', () => {
    expect(serviceLabelWarningOf({ specs: [DOCUMENT], labels: componentLabelOf('backend') })).toBeUndefined()
  })

  it('warns of unexpected API documents when a frontend has them', () => {
    expect(serviceLabelWarningOf({ specs: [DOCUMENT], labels: componentLabelOf('frontend') }))
      .toBe(UNEXPECTED_API_DOCUMENTS_LABEL_WARNING)
  })

  it('does not warn when a frontend has no API documents', () => {
    expect(serviceLabelWarningOf({ specs: [], labels: componentLabelOf('frontend') })).toBeUndefined()
  })

  it('does not warn for another component type', () => {
    expect(serviceLabelWarningOf({ specs: [], labels: componentLabelOf('database') })).toBeUndefined()
    expect(serviceLabelWarningOf({ specs: [DOCUMENT], labels: componentLabelOf('database') })).toBeUndefined()
  })
})

function componentLabelOf(component: string): Record<string, string> {
  return { 'app.kubernetes.io/component': component }
}
