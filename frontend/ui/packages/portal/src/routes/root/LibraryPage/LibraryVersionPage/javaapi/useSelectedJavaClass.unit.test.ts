import { createElement, type FC } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useSearchParams } from 'react-router-dom'

import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'

import { useSelectedJavaClass } from './useSelectedJavaClass'

jest.mock('react-router-dom', () => ({ useSearchParams: jest.fn() }))

const CLASSES: JavaApiClassListItem[] = ['Hidden', 'First', 'Second'].map(className => ({
  className: className,
  displayName: className,
  packageName: '',
  typeKind: 'CLASS',
  memberCount: 0,
  memberKindCounts: { FIELD: 0, CONSTRUCTOR: 0, METHOD: 0 },
  changeCounts: { breaking: 0, 'non-breaking': 0, annotation: 0 },
  changes: [],
  elements: [],
}))

describe('useSelectedJavaClass', () => {
  it.each([
    ['Hidden', CLASSES.slice(1), 'First'],
    ['Second', CLASSES.slice(1), 'Second'],
    ['Missing', CLASSES.slice(1), 'First'],
    ['Hidden', [], 'empty'],
  ])('resolves %s from the displayed classes', (selectedName, displayed, expected) => {
    jest.mocked(useSearchParams).mockReturnValue([new URLSearchParams({ javaClass: selectedName }), jest.fn()])
    const Probe: FC = () => {
      const [selected] = useSelectedJavaClass(displayed)
      return createElement('span', undefined, selected?.className ?? 'empty')
    }
    expect(renderToStaticMarkup(createElement(Probe))).toBe(`<span>${expected}</span>`)
  })
})
