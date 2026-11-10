import { buildDocumentTitle, type DocumentTitleSegments } from '@netcracker/qubership-apihub-ui-shared/utils/document-title'

import { AGENTS_DOCUMENT_TITLE_FORMAT, PAGE_TITLES } from './pageTitles'

const title = (segments: DocumentTitleSegments): string => buildDocumentTitle(segments, AGENTS_DOCUMENT_TITLE_FORMAT)

describe('agent page titles', () => {
  it('names the agent on the welcome page only when one is selected', () => {
    expect(title(PAGE_TITLES.welcome(undefined))).toBe('Select Namespace | APIHUB Agent')
    expect(title(PAGE_TITLES.welcome('cloud-1'))).toBe('Select Namespace · cloud-1 | APIHUB Agent')
  })

  it('names a namespace tab with the namespace and the agent', () => {
    expect(title(PAGE_TITLES.namespace({ mode: 'snapshots', namespaceKey: 'billing', agentId: 'cloud-1' })))
      .toBe('Snapshots · billing · cloud-1 | APIHUB Agent')
  })

  it('names the security report tab instead of the Security Reports tab', () => {
    expect(title(PAGE_TITLES.namespace({
      mode: 'security',
      subTab: 'routing-report',
      namespaceKey: 'billing',
      agentId: 'cloud-1',
    }))).toBe('Routing Report · billing · cloud-1 | APIHUB Agent')
  })

  it('skips an unknown tab', () => {
    expect(title(PAGE_TITLES.namespace({ mode: 'unknown', namespaceKey: 'billing', agentId: 'cloud-1' })))
      .toBe('billing · cloud-1 | APIHUB Agent')
  })
})
