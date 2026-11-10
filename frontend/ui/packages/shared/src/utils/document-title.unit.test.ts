import { buildDocumentTitle, type DocumentTitleFormat } from './document-title'

const FORMAT: DocumentTitleFormat = {
  appName: 'APIHUB',
  segmentSeparator: ' · ',
  appNameSeparator: ' | ',
}

describe('buildDocumentTitle', () => {
  it('joins segments from the most specific one and appends the app name', () => {
    expect(buildDocumentTitle(['getUser', 'REST API', 'Billing', '2025.3'], FORMAT))
      .toBe('getUser · REST API · Billing · 2025.3 | APIHUB')
  })

  it('skips segments that are not loaded yet or blank and trims the rest', () => {
    expect(buildDocumentTitle([undefined, '  Workspace  ', null, '', '   '], FORMAT))
      .toBe('Workspace | APIHUB')
  })

  it('returns only the app name when every segment is empty', () => {
    expect(buildDocumentTitle([undefined, null, ''], FORMAT)).toBe('APIHUB')
  })

  it('takes separators and the app name from the format', () => {
    expect(buildDocumentTitle(['A', 'B'], { appName: 'App', segmentSeparator: ' / ', appNameSeparator: ' - ' }))
      .toBe('A / B - App')
  })
})
