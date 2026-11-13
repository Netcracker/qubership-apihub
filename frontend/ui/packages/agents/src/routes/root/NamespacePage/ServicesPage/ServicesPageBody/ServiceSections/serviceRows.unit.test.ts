import { filterRowsBySearch, selectAllStateOf } from './serviceRows'

describe('serviceRows', () => {
  it('matches the service name, the baseline package name and id, and a label, in any letter case', () => {
    const backend = { service: { key: 'apihub-backend' } }
    const linter = { service: { key: 'linter', baseline: { name: 'API Linter', packageKey: 'QS.LINT' } } }
    const agent = { service: { key: 'apihub-agent', labels: { 'app.kubernetes.io/part-of': 'APIHUB' } } }
    const rows = [backend, linter, agent]

    expect(filterRowsBySearch(rows, 'BACKEND')).toEqual([backend])
    expect(filterRowsBySearch(rows, 'api linter')).toEqual([linter])
    expect(filterRowsBySearch(rows, 'qs.lint')).toEqual([linter])
    expect(filterRowsBySearch(rows, 'part-of: apihub')).toEqual([agent])
  })

  it('returns the same rows when nothing is searched', () => {
    const rows = [{ service: { key: 'apihub-backend' } }]

    expect(filterRowsBySearch(rows, '')).toBe(rows)
  })

  it('checks the header when every row that can be selected is selected', () => {
    expect(selectAllStateOf([
      { canSelect: true, isSelected: true },
      { canSelect: false, isSelected: false },
    ])).toEqual({ checked: true, indeterminate: false, disabled: false })
  })

  it('shows a partial selection of the rows that can be selected', () => {
    expect(selectAllStateOf([
      { canSelect: true, isSelected: true },
      { canSelect: true, isSelected: false },
    ])).toEqual({ checked: false, indeterminate: true, disabled: false })
  })

  it('disables the header while no row can be selected, and shows the selected rows', () => {
    expect(selectAllStateOf([
      { canSelect: false, isSelected: true },
      { canSelect: false, isSelected: false },
    ])).toEqual({ checked: false, indeterminate: true, disabled: true })
  })
})
