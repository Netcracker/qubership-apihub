import { filterRowsByServiceName, selectAllStateOf } from './serviceRows'

describe('serviceRows', () => {
  it('matches the service name in any letter case, and neither the labels nor the baseline package', () => {
    const backend = { service: { key: 'apihub-backend', labels: { 'app.kubernetes.io/part-of': 'linter' } } }
    const linter = { service: { key: 'api-linter-service' } }
    const agent = { service: { key: 'apihub-agent', baseline: { name: 'API Linter Service' } } }

    expect(filterRowsByServiceName([backend, linter, agent], 'LINTER')).toEqual([linter])
  })

  it('returns the same rows when nothing is searched', () => {
    const rows = [{ service: { key: 'apihub-backend' } }]

    expect(filterRowsByServiceName(rows, '')).toBe(rows)
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
