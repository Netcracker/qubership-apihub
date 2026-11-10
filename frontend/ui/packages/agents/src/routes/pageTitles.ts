import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  createDocumentTitleFormat,
  type DocumentTitleFormat,
  type DocumentTitleSegments,
} from '@netcracker/qubership-apihub-ui-shared/utils/document-title'

import { AGENTS_APP_NAME, NAMESPACE_TAB_TITLES, type NamespaceTitleTab, PAGE_TITLE_LABELS } from './pageTitleLabels'
import { SECURITY_REPORTS_PAGE } from './routes'

type NamespaceTitleParams = Partial<{
  /** The namespace page tab, the first segment of the path after the namespace. */
  mode: string
  /** The tab inside the namespace page tab, the second segment; only Security Reports has them. */
  subTab: string
  namespaceKey: Key
  agentId: Key
}>

export const AGENTS_DOCUMENT_TITLE_FORMAT: DocumentTitleFormat = createDocumentTitleFormat(AGENTS_APP_NAME)

export const PAGE_TITLES = {
  welcome: (agentId?: Key): DocumentTitleSegments => [PAGE_TITLE_LABELS.selectNamespace, agentId],
  namespace: ({ mode, subTab, namespaceKey, agentId }: NamespaceTitleParams): DocumentTitleSegments => [
    NAMESPACE_TAB_TITLES[toNamespaceTitleTab(mode, subTab)],
    namespaceKey,
    agentId,
  ],
}

function toNamespaceTitleTab(mode: string | undefined, subTab: string | undefined): NamespaceTitleTab {
  return (mode === SECURITY_REPORTS_PAGE ? subTab : mode) as NamespaceTitleTab
}
