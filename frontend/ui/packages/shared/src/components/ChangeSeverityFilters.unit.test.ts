import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import type { ChangeSeverity } from '../entities/change-severities'
import { ChangeSeverityFilters } from './ChangeSeverityFilters'

describe('ChangeSeverityFilters', () => {
  it('renders counters in severity order when the summary puts risky last', () => {
    const markup = renderToStaticMarkup(createElement(ChangeSeverityFilters, {
      changes: {
        breaking: 0,
        deprecated: 2,
        'non-breaking': 3,
        annotation: 4,
        unclassified: 5,
        risky: 1,
      },
      filters: [],
    }))

    expect(renderedCounters(markup)).toEqual([
      ['breaking', '0'],
      ['risky', '1'],
      ['deprecated', '2'],
      ['non-breaking', '3'],
      ['unclassified', '5'],
      ['annotation', '4'],
    ])
  })

  it('respects a custom severity set and omits missing counters without omitting zero', () => {
    const markup = renderToStaticMarkup(createElement(ChangeSeverityFilters, {
      changes: { breaking: 1, risky: 0, annotation: 3 },
      changeSeverities: new Set<ChangeSeverity>(['risky', 'breaking', 'deprecated']),
      filters: [],
    }))

    expect(renderedCounters(markup)).toEqual([
      ['risky', '0'],
      ['breaking', '1'],
    ])
  })
})

function renderedCounters(markup: string): string[][] {
  return Array.from(
    markup.matchAll(/data-testid="FilterButtonChangesCount-([^"]+)"[^>]*>(\d+)</g),
    ([, severity, count]) => [severity, count],
  )
}
