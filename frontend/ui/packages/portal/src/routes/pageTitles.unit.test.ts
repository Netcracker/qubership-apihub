import { buildDocumentTitle, type DocumentTitleSegments } from '@netcracker/qubership-apihub-ui-shared/utils/document-title'

import { PAGE_TITLES, PORTAL_DOCUMENT_TITLE_FORMAT } from './pageTitles'

const title = (segments: DocumentTitleSegments): string => buildDocumentTitle(segments, PORTAL_DOCUMENT_TITLE_FORMAT)

const LATEST = { fullVersion: '2025.3@4', latestRevision: true }
const OLD_REVISION = { fullVersion: '2025.3@2', latestRevision: false }

describe('portal page titles', () => {
  it('shows a partial title while the name is loading and the full one after', () => {
    expect(title(PAGE_TITLES.workspace(undefined))).toBe('Workspace | APIHUB')
    expect(title(PAGE_TITLES.workspace('Billing'))).toBe('Billing · Workspace | APIHUB')
  })

  it('names the tab of a page with tabs and skips an unknown tab', () => {
    expect(title(PAGE_TITLES.packageSettings('members', 'Billing Service')))
      .toBe('User Access Control · Billing Service Settings | APIHUB')
    expect(title(PAGE_TITLES.portalSettings('unknown'))).toBe('Portal Settings | APIHUB')
  })

  it('appends the package and the latest version without its revision to a version page', () => {
    expect(title([...PAGE_TITLES.contracts('rest'), ...PAGE_TITLES.versionContext('Billing Service', LATEST)]))
      .toBe('Contracts · REST API · Billing Service · 2025.3 | APIHUB')
  })

  it('shows the revision of a version that is not the latest one', () => {
    expect(title([...PAGE_TITLES.overview('summary'), ...PAGE_TITLES.versionContext('Billing', OLD_REVISION)]))
      .toBe('Summary · Billing · 2025.3@2 | APIHUB')
  })

  it('shows only the page while the package and the version are loading', () => {
    expect(title([...PAGE_TITLES.apiQuality('rest'), ...PAGE_TITLES.versionContext(undefined, { fullVersion: '' })]))
      .toBe('API Quality · REST API | APIHUB')
  })

  it('names the configuration page after the package kind once the package is loaded', () => {
    expect(title(PAGE_TITLES.configure(undefined))).toBe('APIHUB')
    expect(title(PAGE_TITLES.configure('dashboard'))).toBe('Configure Dashboard | APIHUB')
  })

  it('titles contract types and a contract that is still loading', () => {
    expect(title(PAGE_TITLES.contract('users', 'ddl'))).toBe('users · DDL | APIHUB')
    expect(title(PAGE_TITLES.contract(undefined, 'rest'))).toBe('Operation · REST API | APIHUB')
  })

  it('shows the compared versions of one package', () => {
    expect(title(PAGE_TITLES.versionsComparison({
      origin: { packageName: 'Billing', version: { fullVersion: '2025.2@1', latestRevision: true } },
      changed: { packageName: 'Billing', version: LATEST },
    }))).toBe('Compare 2025.2 → 2025.3 · Billing | APIHUB')
  })

  it('shows the revision when an old revision of the same version is compared', () => {
    expect(title(PAGE_TITLES.versionsComparison({
      origin: { packageName: 'Billing', version: OLD_REVISION },
      changed: { packageName: 'Billing', version: LATEST },
    }))).toBe('Compare 2025.3@2 → 2025.3 · Billing | APIHUB')
  })

  it('shows the package names when different packages are compared', () => {
    expect(title(PAGE_TITLES.versionsComparison({
      origin: { packageName: 'Billing', version: { fullVersion: '2025.2@1' } },
      changed: { packageName: 'Orders', version: LATEST },
    }))).toBe('Compare Billing 2025.2 → Orders 2025.3 | APIHUB')
  })

  it('shows one operation title for the same operation and both for different ones', () => {
    expect(title(PAGE_TITLES.operationsComparison({ originOperationTitle: 'Get user', changedOperationTitle: 'Get user' })))
      .toBe('Get user · Compare | APIHUB')
    expect(title(PAGE_TITLES.operationsComparison({ originOperationTitle: 'Get user', changedOperationTitle: 'Get account' })))
      .toBe('Get user → Get account · Compare | APIHUB')
  })

  it('shows the compared groups', () => {
    expect(title(PAGE_TITLES.groupsComparison({
      originGroup: 'v1',
      changedGroup: 'v2',
      changed: { packageName: 'Billing', version: LATEST },
    }))).toBe('Compare Groups v1 → v2 · Billing · 2025.3 | APIHUB')
  })
})
